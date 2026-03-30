"""
WhatsApp Sender — Provider Abstraction Layer
--------------------------------------------
Supports Twilio WhatsApp and Meta Cloud API (WhatsApp Business API).
Set WHATSAPP_PROVIDER = 'twilio' | 'meta' in settings.

Both providers send plain-text messages for now (template messages
require pre-approved templates on Meta; Twilio sandbox works without them).
"""
import hashlib
import hmac
import logging

import requests as _requests
from django.conf import settings

logger = logging.getLogger(__name__)


class WhatsAppSendError(Exception):
    pass


class WhatsAppSender:
    """
    Unified message sender. Switch providers by changing WHATSAPP_PROVIDER.
    """

    @classmethod
    def send(cls, to_phone: str, body: str) -> str:
        """
        Send a WhatsApp message. Returns the provider message ID.
        Raises WhatsAppSendError on failure.
        """
        provider = getattr(settings, "WHATSAPP_PROVIDER", "twilio")
        if provider == "meta":
            return cls._send_meta(to_phone, body)
        return cls._send_twilio(to_phone, body)

    # ── Twilio ──────────────────────────────────────────────────────────────

    @classmethod
    def _send_twilio(cls, to_phone: str, body: str) -> str:
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        from_number = getattr(settings, "TWILIO_WHATSAPP_FROM", "")

        if not all([account_sid, auth_token, from_number]):
            raise WhatsAppSendError("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.")

        # Twilio requires 'whatsapp:+...' prefix
        from_wa = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"
        to_wa = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        resp = _requests.post(
            url,
            data={"From": from_wa, "To": to_wa, "Body": body},
            auth=(account_sid, auth_token),
            timeout=15,
        )
        if resp.status_code not in (200, 201):
            raise WhatsAppSendError(f"Twilio {resp.status_code}: {resp.text[:300]}")
        sid = resp.json().get("sid", "")
        logger.info("WhatsApp [Twilio] sent to %s → %s", to_phone, sid)
        return sid

    # ── Meta Cloud API ───────────────────────────────────────────────────────

    @classmethod
    def _send_meta(cls, to_phone: str, body: str) -> str:
        phone_number_id = getattr(settings, "META_WHATSAPP_PHONE_NUMBER_ID", "")
        access_token = getattr(settings, "META_WHATSAPP_ACCESS_TOKEN", "")

        if not all([phone_number_id, access_token]):
            raise WhatsAppSendError("Meta credentials not configured. Set META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_ACCESS_TOKEN.")

        # Meta requires E.164 without 'whatsapp:' prefix, no leading '+'
        phone = to_phone.replace("whatsapp:", "").lstrip("+")

        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "text",
            "text": {"preview_url": True, "body": body},
        }
        resp = _requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code not in (200, 201):
            raise WhatsAppSendError(f"Meta {resp.status_code}: {resp.text[:300]}")
        msg_id = resp.json().get("messages", [{}])[0].get("id", "")
        logger.info("WhatsApp [Meta] sent to %s → %s", to_phone, msg_id)
        return msg_id


# ── Signature verification helpers ──────────────────────────────────────────

def verify_twilio_signature(request) -> bool:
    """
    Verify that an incoming POST is genuinely from Twilio.
    https://www.twilio.com/docs/usage/webhooks/webhooks-security
    """
    import base64
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        return False

    twilio_signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    url = request.build_absolute_uri()

    # Twilio sorts POST params alphabetically, concatenates key+value pairs
    sorted_params = sorted(request.POST.items())
    base = url + "".join(f"{k}{v}" for k, v in sorted_params)
    computed = base64.b64encode(
        hmac.new(auth_token.encode(), base.encode(), hashlib.sha1).digest()
    ).decode()
    return hmac.compare_digest(twilio_signature, computed)


def verify_meta_signature(request) -> bool:
    """
    Verify the X-Hub-Signature-256 header from Meta/Facebook.
    https://developers.facebook.com/docs/graph-api/webhooks/getting-started
    """
    app_secret = getattr(settings, "META_APP_SECRET", "")
    if not app_secret:
        return False

    sig_header = request.META.get("HTTP_X_HUB_SIGNATURE_256", "")
    if not sig_header.startswith("sha256="):
        return False

    expected = "sha256=" + hmac.new(
        app_secret.encode(), request.body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig_header, expected)

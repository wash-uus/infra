"""
WhatsApp Webhook + Admin API Views
------------------------------------
Webhook: POST  /api/whatsapp/webhook/  (AllowAny — signature-verified internally)
         GET   /api/whatsapp/webhook/  (Meta challenge verification)

Admin (IsAdminOrAbove):
  POST  /api/whatsapp/broadcast/   — send broadcast to all opted-in contacts
  GET   /api/whatsapp/stats/       — delivery metrics summary
  GET   /api/whatsapp/contacts/    — opted-in contact list
"""
import json
import logging

from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrAbove

from .keywords import handle, resolve_keyword
from .models import WhatsAppBroadcast, WhatsAppContact, WhatsAppDeliveryMetric, WhatsAppMessage
from .sender import WhatsAppSendError, WhatsAppSender, verify_meta_signature, verify_twilio_signature
from .serializers import (
    WhatsAppBroadcastCreateSerializer,
    WhatsAppContactSerializer,
    WhatsAppDeliveryMetricSerializer,
)

logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_contact(phone: str):
    """Get or create a WhatsAppContact for an E.164 phone number."""
    # Normalise: strip 'whatsapp:' prefix, ensure leading '+'
    phone = phone.replace("whatsapp:", "").strip()
    if not phone.startswith("+"):
        phone = f"+{phone}"
    contact, created = WhatsAppContact.objects.get_or_create(phone_number=phone)
    if created:
        logger.info("New WhatsApp contact: %s", phone)
    return contact


def _record_inbound(contact, body: str, provider_id: str = "") -> None:
    WhatsAppMessage.objects.create(
        contact=contact,
        direction="inbound",
        message_type="user_message",
        body=body,
        provider_message_id=provider_id,
        status="delivered",
    )
    contact.last_interaction_at = timezone.now()
    contact.save(update_fields=["last_interaction_at"])


def _send_reply(contact, reply_text: str, message_type: str = "keyword_reply") -> None:
    try:
        msg_id = WhatsAppSender.send(contact.phone_number, reply_text)
        WhatsAppMessage.objects.create(
            contact=contact,
            direction="outbound",
            message_type=message_type,
            body=reply_text,
            provider_message_id=msg_id,
            status="sent",
        )
    except WhatsAppSendError as exc:
        logger.error("Failed to send reply to %s: %s", contact.phone_number, exc)
        WhatsAppMessage.objects.create(
            contact=contact,
            direction="outbound",
            message_type=message_type,
            body=reply_text,
            status="failed",
            error_message=str(exc),
        )


def _bump_daily_metric(field: str, amount: int = 1) -> None:
    today = timezone.now().date()
    metric, _ = WhatsAppDeliveryMetric.objects.get_or_create(date=today)
    setattr(metric, field, getattr(metric, field) + amount)
    metric.save(update_fields=[field])


# ── Webhook View ─────────────────────────────────────────────────────────────

class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # no auth — verified by HMAC signature

    # ── GET: Meta verification challenge ─────────────────────────────────────

    def get(self, request):
        from django.conf import settings
        verify_token = getattr(settings, "META_WEBHOOK_VERIFY_TOKEN", "")
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")

        if mode == "subscribe" and token == verify_token:
            logger.info("Meta webhook verified successfully.")
            return HttpResponse(challenge, content_type="text/plain")
        return HttpResponse("Forbidden", status=403)

    # ── POST: inbound messages ────────────────────────────────────────────────

    def post(self, request):
        # Determine provider from Content-Type / payload shape
        content_type = request.content_type or ""

        if "application/json" in content_type:
            return self._handle_meta(request)
        # Twilio sends form-encoded data
        return self._handle_twilio(request)

    # ── Twilio ────────────────────────────────────────────────────────────────

    def _handle_twilio(self, request):
        if not verify_twilio_signature(request):
            logger.warning("Invalid Twilio signature from %s", request.META.get("REMOTE_ADDR"))
            return HttpResponse("Forbidden", status=403)

        from_number = request.POST.get("From", "")  # 'whatsapp:+254...'
        body = request.POST.get("Body", "").strip()
        message_sid = request.POST.get("MessageSid", "")

        if not from_number:
            return HttpResponse("OK", status=200)

        contact = _get_or_create_contact(from_number)
        _record_inbound(contact, body, provider_id=message_sid)
        _bump_daily_metric("keyword_interactions")

        reply = handle(contact, body)
        if reply:
            kw = resolve_keyword(body)
            if kw == "JOIN":
                _bump_daily_metric("new_opt_ins")
            elif kw == "STOP":
                _bump_daily_metric("opt_outs")
            _send_reply(contact, reply)

        # Twilio expects 200 with empty TwiML or plain text
        return HttpResponse(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            content_type="text/xml",
            status=200,
        )

    # ── Meta / Facebook ───────────────────────────────────────────────────────

    def _handle_meta(self, request):
        if not verify_meta_signature(request):
            logger.warning("Invalid Meta signature from %s", request.META.get("REMOTE_ADDR"))
            return HttpResponse("Forbidden", status=403)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse("Bad Request", status=400)

        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for message in value.get("messages", []):
                    self._process_meta_message(message, value)

        return HttpResponse("EVENT_RECEIVED", status=200)

    def _process_meta_message(self, message: dict, value: dict) -> None:
        from_number = message.get("from", "")  # E.164 without '+'
        if not from_number:
            return
        phone = f"+{from_number}"
        body = message.get("text", {}).get("body", "").strip()
        msg_id = message.get("id", "")

        contact = _get_or_create_contact(phone)
        _record_inbound(contact, body, provider_id=msg_id)
        _bump_daily_metric("keyword_interactions")

        reply = handle(contact, body)
        if reply:
            kw = resolve_keyword(body)
            if kw == "JOIN":
                _bump_daily_metric("new_opt_ins")
            elif kw == "STOP":
                _bump_daily_metric("opt_outs")
            _send_reply(contact, reply)


# ── Admin: Broadcast ─────────────────────────────────────────────────────────

class WhatsAppBroadcastView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def post(self, request):
        serializer = WhatsAppBroadcastCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        broadcast_type = serializer.validated_data.get("broadcast_type", "general")

        contacts = WhatsAppContact.objects.filter(is_opted_in=True)
        recipient_count = contacts.count()

        broadcast = WhatsAppBroadcast.objects.create(
            sent_by=request.user,
            broadcast_type=broadcast_type,
            message=message,
            recipient_count=recipient_count,
        )

        sent = failed = 0
        for contact in contacts:
            try:
                msg_id = WhatsAppSender.send(contact.phone_number, message)
                WhatsAppMessage.objects.create(
                    contact=contact,
                    direction="outbound",
                    message_type="broadcast",
                    body=message,
                    provider_message_id=msg_id,
                    status="sent",
                    broadcast=broadcast,
                )
                sent += 1
            except WhatsAppSendError as exc:
                logger.error("Broadcast failed for %s: %s", contact.phone_number, exc)
                WhatsAppMessage.objects.create(
                    contact=contact,
                    direction="outbound",
                    message_type="broadcast",
                    body=message,
                    status="failed",
                    error_message=str(exc),
                    broadcast=broadcast,
                )
                failed += 1

        broadcast.sent_count = sent
        broadcast.failed_count = failed
        broadcast.completed_at = timezone.now()
        broadcast.save(update_fields=["sent_count", "failed_count", "completed_at"])

        _bump_daily_metric("messages_sent", sent)

        return Response(
            {
                "id": broadcast.id,
                "recipient_count": recipient_count,
                "sent": sent,
                "failed": failed,
            },
            status=status.HTTP_201_CREATED,
        )


# ── Admin: Stats ─────────────────────────────────────────────────────────────

class WhatsAppStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get(self, request):
        metrics = WhatsAppDeliveryMetric.objects.order_by("-date")[:30]
        opted_in_total = WhatsAppContact.objects.filter(is_opted_in=True).count()
        total_contacts = WhatsAppContact.objects.count()

        return Response(
            {
                "opted_in_total": opted_in_total,
                "total_contacts": total_contacts,
                "last_30_days": WhatsAppDeliveryMetricSerializer(metrics, many=True).data,
            }
        )


# ── Admin: Contacts ───────────────────────────────────────────────────────────

class WhatsAppContactsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get(self, request):
        opted_in_only = request.GET.get("opted_in", "true").lower() == "true"
        qs = WhatsAppContact.objects.all().order_by("-last_interaction_at")
        if opted_in_only:
            qs = qs.filter(is_opted_in=True)
        serializer = WhatsAppContactSerializer(qs[:200], many=True)
        return Response(serializer.data)

"""
Keyword Handler Registry
------------------------
Maps inbound WhatsApp keywords to handler functions.
Each handler receives the WhatsAppContact and the raw inbound body.
Returns the reply string to send back.

To add a new keyword:
    @register("KEYWORD")
    def my_handler(contact, body: str) -> str:
        return "Reply text"
"""
import logging

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

_HANDLERS: dict[str, callable] = {}


def register(keyword: str):
    """Decorator to register a keyword handler (case-insensitive key stored as upper)."""
    def decorator(fn):
        _HANDLERS[keyword.upper()] = fn
        return fn
    return decorator


def resolve_keyword(body: str) -> str | None:
    """
    Find the longest matching keyword in body.
    Returns the canonical UPPER keyword string, or None if no match.
    """
    normalized = body.strip().upper()
    # Check multi-word keywords first (longer matches win)
    for kw in sorted(_HANDLERS.keys(), key=len, reverse=True):
        if normalized == kw or normalized.startswith(kw + " "):
            return kw
    return None


def handle(contact, body: str) -> str | None:
    """
    Dispatch the message body to the appropriate handler.
    Returns the reply string, or None if no keyword matched.
    """
    kw = resolve_keyword(body)
    if kw is None:
        return None
    handler = _HANDLERS[kw]
    return handler(contact, body)


# ── Handlers ─────────────────────────────────────────────────────────────────

def _site_url() -> str:
    return getattr(settings, "FRONTEND_URL", "https://spiritrevivalafrica.com")


def _wa_number() -> str:
    return getattr(settings, "WHATSAPP_BUSINESS_NUMBER", "").lstrip("+")


@register("JOIN")
def handle_join(contact, body: str) -> str:
    """Opt-in and trigger the welcome sequence."""
    from .sequences import get_day_0_message  # local import to avoid cycles

    if not contact.is_opted_in:
        contact.is_opted_in = True
        contact.opted_in_at = timezone.now()
        contact.sequence_day = 0
        contact.sequence_completed = False
        contact.opted_out_at = None
        contact.save(update_fields=[
            "is_opted_in", "opted_in_at", "sequence_day",
            "sequence_completed", "opted_out_at",
        ])

    return get_day_0_message(contact)


@register("STOP")
def handle_stop(contact, body: str) -> str:
    """Opt-out from all WhatsApp messages."""
    contact.is_opted_in = False
    contact.opted_out_at = timezone.now()
    contact.save(update_fields=["is_opted_in", "opted_out_at"])
    return (
        "✅ You've been unsubscribed from Spirit Revival Africa WhatsApp messages.\n\n"
        "You won't receive further messages from us.\n\n"
        f"You can rejoin any time by visiting {_site_url()} or replying *JOIN*."
    )


@register("PRAY")
def handle_pray(contact, body: str) -> str:
    return (
        "🙏 *We're Standing in Agreement With You!*\n\n"
        "Submit your prayer request and our team will pray with you:\n"
        f"{_site_url()}/contact\n\n"
        "_\"Again I say to you, if two of you agree on earth about anything they ask, "
        "it will be done for them by my Father in heaven.\" — Matt 18:19_"
    )


@register("STORY")
def handle_story(contact, body: str) -> str:
    return (
        "✍️ *Revival Stories — Faith in Action*\n\n"
        f"📖 Read testimonies from across Africa → {_site_url()}/stories\n\n"
        f"✨ Share your own testimony → {_site_url()}/stories/submit\n\n"
        "_Your story is someone else's breakthrough!_"
    )


@register("JOIN HUB")
def handle_hub(contact, body: str) -> str:
    return (
        "🏘️ *Revival Hubs — Community Near You*\n\n"
        "Join a local revival hub or find believers in your area:\n"
        f"{_site_url()}/hubs\n\n"
        "_Iron sharpens iron, and one person sharpens another. — Prov 27:17_"
    )


@register("BOOK")
def handle_book(contact, body: str) -> str:
    return (
        "📚 *Get the Revival Book*\n\n"
        "Equip yourself with biblical foundations for revival:\n\n"
        "💳 KSH 600 — M-Pesa / PayPal\n"
        f"Order here → {_site_url()}/book\n\n"
        "Reply *PRAY* for prayer | *STORY* for testimonies | *STOP* to unsubscribe."
    )


@register("HELP")
def handle_help(contact, body: str) -> str:
    return (
        "📌 *Spirit Revival Africa — WhatsApp Commands*\n\n"
        "*PRAY* — Submit a prayer request\n"
        "*STORY* — Read or share a testimony\n"
        "*JOIN HUB* — Find a revival hub near you\n"
        "*BOOK* — Order the revival book\n"
        "*STOP* — Unsubscribe from messages\n\n"
        f"Visit us → {_site_url()}"
    )

"""
Welcome Sequence Messages — 4-day spiritual onboarding journey.
Day 0: Immediate on JOIN
Day 1–3: Sent once per day by the send_whatsapp_sequences management command.
"""
from django.conf import settings

# ── Helpers ─────────────────────────────────────────────────────────────────

def _site_url() -> str:
    return getattr(settings, "FRONTEND_URL", "https://spiritrevivalafrica.com")


def _wa_number() -> str:
    """Return the business WhatsApp number for share links."""
    return getattr(settings, "WHATSAPP_BUSINESS_NUMBER", "").lstrip("+")


# ── Sequence messages ─────────────────────────────────────────────────────────

def get_day_0_message(contact) -> str:
    """Immediate welcome on JOIN."""
    referral_link = f"{_site_url()}/?ref={contact.referral_code}" if contact.referral_code else _site_url()
    return (
        "🔥 *Welcome to Spirit Revival Africa — Revival Starts Here!*\n\n"
        "You've just joined a community of faith-filled believers igniting revival across Africa and beyond.\n\n"
        "Here's what's waiting for you:\n"
        "📖 *Daily Bread* — A fresh word from God every morning\n"
        "🙏 *Prayer Chain* — Add your prayer request, we pray together\n"
        "✍️ *Testimonies & Short Stories* — Read and share what God is doing\n\n"
        f"Start here → {referral_link}\n\n"
        "Reply *PRAY* for prayer support\n"
        "Reply *STORY* to read a testimony\n"
        "Reply *STOP* to unsubscribe\n\n"
        "_Blessed are those who hunger and thirst for righteousness, for they will be filled. — Matt 5:6_"
    )


def get_day_1_message(contact) -> str:
    """Day 1 — prayer prompt."""
    return (
        "🌅 *Good morning, Revivalist!*\n\n"
        "Revival begins on our knees. Before the world asks anything of you today, "
        "God is already speaking.\n\n"
        "🙏 *Today's Prayer Prompt:*\n"
        "_\"Lord, let revival fire fall — in my heart, my home, and my nation. "
        "I yield to Your Spirit today.\"_\n\n"
        "Take 5 minutes. Be still. Let the fire fall. 🔥\n\n"
        f"Share a prayer request → {_site_url()}/contact\n\n"
        "Reply *STORY* to read a testimony that will strengthen your faith.\n"
        "Reply *STOP* to unsubscribe."
    )


def get_day_2_message(contact) -> str:
    """Day 2 — testimony / story drop."""
    return (
        "✨ *Testimony Time — Revival Is Real!*\n\n"
        "Faith grows when we hear what God is doing. Today we want to hear YOUR story.\n\n"
        "👇 *Two ways to participate:*\n"
        f"1️⃣ *Read* — Testimonies from across Africa → {_site_url()}/stories\n"
        f"2️⃣ *Write* — Share your own testimony → {_site_url()}/stories/submit\n\n"
        "_\"They triumphed over him by the blood of the Lamb and by the word of their testimony.\" — Rev 12:11_\n\n"
        "Your story is someone else's breakthrough. Don't keep it to yourself! 🕊️\n\n"
        "Reply *STOP* to unsubscribe."
    )


def get_day_3_message(contact) -> str:
    """Day 3 — carry the fire / viral share."""
    wa_link = f"https://wa.me/{_wa_number()}?text=JOIN" if _wa_number() else _site_url()
    return (
        "🔥 *Carry the Fire — Revival Spreads Person to Person!*\n\n"
        "You've been with us for 3 days. You've prayed, you've read, you've believed.\n\n"
        "Now it's time to *pass the flame*. 🕯️\n\n"
        "Forward this message to 3 friends who need revival fire in their lives:\n\n"
        "━━━━━━━━━━━━━━━━\n"
        "🔥 *Spirit Revival Africa* — Daily fire for your faith!\n"
        "Join our WhatsApp revival today:\n"
        f"{wa_link}\n"
        "━━━━━━━━━━━━━━━━\n\n"
        f"📖 Access everything → {_site_url()}\n\n"
        "_\"The fire must be kept burning on the altar continuously; it must not go out.\" — Lev 6:13_\n\n"
        "Thank you for being part of this revival. Stay close to the fire! 🙏\n\n"
        "Reply *STOP* to unsubscribe."
    )


# ── Dispatch ─────────────────────────────────────────────────────────────────

SEQUENCE_MESSAGES = {
    0: get_day_0_message,
    1: get_day_1_message,
    2: get_day_2_message,
    3: get_day_3_message,
}


def get_sequence_message(day: int, contact) -> str | None:
    """Return the sequence message for a given day, or None if sequence is done."""
    fn = SEQUENCE_MESSAGES.get(day)
    if fn is None:
        return None
    return fn(contact)

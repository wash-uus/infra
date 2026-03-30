"""
WhatsApp Automation Models
--------------------------
Tracks opted-in contacts, all message history, welcome sequence state,
broadcast campaigns, and delivery status.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class WhatsAppContact(models.Model):
    """
    A WhatsApp user who has opted in (or out) of communications.
    One contact may optionally be linked to a registered SRA user account.
    Phone numbers are stored in E.164 format (e.g. +254712345678).
    """

    phone_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="E.164 format, e.g. +254712345678",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="whatsapp_contact",
    )

    is_opted_in = models.BooleanField(default=False)
    opted_in_at = models.DateTimeField(null=True, blank=True)
    opted_out_at = models.DateTimeField(null=True, blank=True)
    last_interaction_at = models.DateTimeField(null=True, blank=True)

    # Welcome sequence progress: which day the contact is on (0 = just joined, 4 = completed)
    sequence_day = models.PositiveSmallIntegerField(default=0)
    sequence_completed = models.BooleanField(default=False)

    # Referral/UTM tracking (e.g. ?ref=whatsapp)
    referral_code = models.CharField(max_length=40, blank=True)
    referred_by = models.CharField(max_length=20, blank=True, help_text="Phone number of referrer")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_opted_in"]),
            models.Index(fields=["sequence_day", "sequence_completed"]),
        ]

    def __str__(self):
        return f"{self.phone_number} ({'opted-in' if self.is_opted_in else 'opted-out'})"

    @property
    def display_name(self):
        if self.user:
            return self.user.full_name or self.user.username
        return self.phone_number


class WhatsAppMessage(models.Model):
    """Log of every message sent to or received from a contact."""

    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"

    class MessageType(models.TextChoices):
        WELCOME = "welcome", "Welcome Sequence"
        DAILY_BREAD = "daily_bread", "Daily Bread"
        PRAYER_ALERT = "prayer_alert", "Prayer Alert"
        STORY_DROP = "story_drop", "Story Drop"
        KEYWORD_REPLY = "keyword_reply", "Keyword Reply"
        BROADCAST = "broadcast", "Admin Broadcast"
        USER_MESSAGE = "user_message", "User Message"
        VIRAL = "viral", "Viral / Share"

    contact = models.ForeignKey(
        WhatsAppContact,
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )
    direction = models.CharField(max_length=10, choices=Direction.choices)
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.USER_MESSAGE,
        blank=True,
    )
    body = models.TextField()
    provider_message_id = models.CharField(max_length=200, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    error_message = models.TextField(blank=True)
    broadcast = models.ForeignKey(
        "WhatsAppBroadcast",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="messages",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["direction"]),
            models.Index(fields=["status"]),
            models.Index(fields=["message_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        phone = self.contact.phone_number if self.contact else "unknown"
        return f"{self.direction} | {phone} | {self.created_at:%Y-%m-%d %H:%M}"


class WhatsAppBroadcast(models.Model):
    """Records of admin-initiated broadcast messages."""

    class BroadcastType(models.TextChoices):
        REVIVAL_ALERT = "revival_alert", "Revival Alert"
        NEW_CONTENT = "new_content", "New Content"
        PRAYER_CALL = "prayer_call", "Prayer Call"
        EVENT = "event", "Event Announcement"
        GENERAL = "general", "General"

    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="whatsapp_broadcasts",
    )
    broadcast_type = models.CharField(
        max_length=20,
        choices=BroadcastType.choices,
        default=BroadcastType.GENERAL,
    )
    message = models.TextField()
    recipient_count = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Broadcast {self.id} — {self.broadcast_type} ({self.created_at:%Y-%m-%d})"


class WhatsAppDeliveryMetric(models.Model):
    """
    Daily rollup metrics for analytics dashboard.
    Populated by the send_daily_bread_whatsapp management command.
    """
    date = models.DateField(unique=True)
    messages_sent = models.PositiveIntegerField(default=0)
    messages_delivered = models.PositiveIntegerField(default=0)
    messages_read = models.PositiveIntegerField(default=0)
    messages_failed = models.PositiveIntegerField(default=0)
    new_opt_ins = models.PositiveIntegerField(default=0)
    opt_outs = models.PositiveIntegerField(default=0)
    keyword_interactions = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Metrics {self.date}"

    @property
    def delivery_rate(self):
        if not self.messages_sent:
            return 0
        return round(self.messages_delivered / self.messages_sent * 100, 1)

    @property
    def read_rate(self):
        if not self.messages_delivered:
            return 0
        return round(self.messages_read / self.messages_delivered * 100, 1)

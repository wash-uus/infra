"""
Shared models: AuditLog, Notification, ContentReview, AppealRequest.
These are used across all role dashboards.
"""
from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Immutable record of every privileged action taken on the platform.
    Written by the audit middleware and explicit view calls.
    Never deleted — soft-archive via `archived=True` only (super_admin only).
    """
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="audit_actions",
        db_index=True,
    )
    action = models.CharField(max_length=120, db_index=True)
    target_model = models.CharField(max_length=80, blank=True)
    target_id = models.CharField(max_length=40, blank=True)
    detail = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["target_model", "target_id"]),
        ]

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor} → {self.action}"


class Notification(models.Model):
    """
    In-app notification sent to a user when an action affects their content.
    """
    class NotifType(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ACTION = "action", "Action Taken"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        APPEAL = "appeal", "Appeal Update"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    notif_type = models.CharField(max_length=20, choices=NotifType.choices, default=NotifType.INFO)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    link = models.CharField(max_length=300, blank=True, help_text="Optional frontend path")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"→ {self.recipient} | {self.title}"


class ContentReview(models.Model):
    """
    Review queue for both ContentItems and RevivalHub applications.
    """
    class ReviewStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class ReviewTarget(models.TextChoices):
        CONTENT = "content", "Content"
        HUB = "hub", "Hub Application"

    target_type = models.CharField(max_length=20, choices=ReviewTarget.choices)
    target_id = models.PositiveIntegerField(db_index=True)
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="submitted_reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_items",
    )
    status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        db_index=True,
    )
    reason = models.TextField(blank=True, help_text="Required when rejecting")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_type", "status"]),
        ]

    def __str__(self):
        return f"{self.target_type}#{self.target_id} → {self.status}"


class AppealRequest(models.Model):
    """
    User can appeal a moderation decision (content rejection, mute, suspend).
    """
    class AppealStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        UPHELD = "upheld", "Decision Upheld"
        OVERTURNED = "overturned", "Decision Overturned"

    appellant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="appeals",
    )
    review = models.ForeignKey(
        ContentReview,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appeals",
    )
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=AppealStatus.choices,
        default=AppealStatus.PENDING,
        db_index=True,
    )
    admin_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_appeals",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Appeal by {self.appellant} ({self.status})"


# ── Announcement ─────────────────────────────────────────────────────────────

class Announcement(models.Model):
    class Priority(models.TextChoices):
        INFO    = "info",    "Info"
        WARNING = "warning", "Warning"
        URGENT  = "urgent",  "Urgent"

    title      = models.CharField(max_length=200)
    body       = models.TextField()
    priority   = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.INFO,
    )
    is_active  = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, on_delete=models.SET_NULL,
        related_name="announcements",
    )
    expires_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Leave blank to never expire.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active", "priority"])]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"

from django.conf import settings
from django.db import models

from apps.groups.models import RevivalGroup

MAX_MESSAGE_LENGTH = 4000


class DirectMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_direct_messages"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_direct_messages"
    )
    text = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="messages/audio/", blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["timestamp"]
        indexes = [
            models.Index(fields=["sender", "receiver", "timestamp"]),
            models.Index(fields=["receiver", "is_read"]),
        ]

    def __str__(self):
        return f"DM from {self.sender} to {self.receiver}"


class GroupMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_group_messages"
    )
    group = models.ForeignKey(RevivalGroup, on_delete=models.CASCADE, related_name="messages")
    text = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="messages/group_audio/", blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["timestamp"]
        indexes = [
            models.Index(fields=["group", "timestamp"]),
            models.Index(fields=["group", "sender", "timestamp"]),
        ]

    def __str__(self):
        return f"Group msg from {self.sender} in {self.group}"


class GroupMessageReadReceipt(models.Model):
    """
    Tracks the last-read timestamp per user per group.
    Used by the unread-count endpoint to efficiently calculate
    unread group messages without scanning every message per request.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_read_receipts"
    )
    group = models.ForeignKey(RevivalGroup, on_delete=models.CASCADE, related_name="read_receipts")
    last_read_at = models.DateTimeField()

    class Meta:
        unique_together = [("user", "group")]
        indexes = [models.Index(fields=["user", "group"])]

    def __str__(self):
        return f"{self.user} read {self.group} at {self.last_read_at}"

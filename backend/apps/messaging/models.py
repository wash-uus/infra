from django.conf import settings
from django.db import models

from apps.groups.models import RevivalGroup


class DirectMessage(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_direct_messages")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_direct_messages")
    text = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="messages/audio/", blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["sender", "receiver", "timestamp"])]


class GroupMessage(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_group_messages")
    group = models.ForeignKey(RevivalGroup, on_delete=models.CASCADE, related_name="messages")
    text = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="messages/group_audio/", blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["group", "timestamp"])]

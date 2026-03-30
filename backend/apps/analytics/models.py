from django.conf import settings
from django.db import models


class ShareEvent(models.Model):
    class Platform(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"
        TWITTER = "twitter", "Twitter"
        FACEBOOK = "facebook", "Facebook"
        COPY = "copy", "Copy"
        NATIVE = "native", "Native Share"

    class ContentKind(models.TextChoices):
        STORY = "story", "Story"
        PRAYER = "prayer", "Prayer"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="share_events",
    )
    content_type = models.CharField(max_length=20, choices=ContentKind.choices, db_index=True)
    object_id = models.PositiveIntegerField(db_index=True)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["content_type", "object_id"], name="analytics_ct_obj_idx"),
            models.Index(fields=["created_at"], name="analytics_created_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.platform} share of {self.content_type} #{self.object_id}"

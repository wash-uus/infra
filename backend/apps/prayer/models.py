from django.conf import settings
from django.db import models


class PrayerRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="prayer_requests")
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_public = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    rejection_reason = models.TextField(blank=True, help_text="Brief note to user explaining rejection")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_prayers",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    prayer_count = models.PositiveIntegerField(default=0)
    prayed_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="prayed_requests", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_public"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title

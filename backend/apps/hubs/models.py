from django.conf import settings
from django.db import models


class RevivalHub(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"

    name = models.CharField(max_length=255)
    country = models.CharField(max_length=120)
    city = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    leader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="led_hubs")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    meeting_schedule = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["status"]), models.Index(fields=["country", "city"])]

    def __str__(self):
        return self.name


class HubMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    hub = models.ForeignKey(RevivalHub, on_delete=models.CASCADE, related_name="memberships")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "hub")

    def __str__(self):
        return f"{self.user} @ {self.hub}"

from django.conf import settings
from django.db import models


class RevivalGroup(models.Model):
    class Privacy(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    privacy = models.CharField(max_length=10, choices=Privacy.choices, default=Privacy.PUBLIC)
    moderators = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="moderated_groups", blank=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through="GroupMembership", related_name="revival_groups")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["privacy"])]

    def __str__(self):
        return self.name


class GroupMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    group = models.ForeignKey(RevivalGroup, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "group")
        indexes = [models.Index(fields=["user", "group"])]


class GroupJoinRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_join_requests")
    group = models.ForeignKey(RevivalGroup, on_delete=models.CASCADE, related_name="join_requests")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    note = models.TextField(blank=True)  # optional note from requester
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="reviewed_join_requests"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "group")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.group} ({self.status})"

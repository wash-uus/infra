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

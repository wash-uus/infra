from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        MEMBER = "member", "Member"
        MODERATOR = "moderator", "Moderator"
        ADMIN = "admin", "Admin"
        HUB_LEADER = "hub_leader", "Hub Leader"
        SUPER_ADMIN = "super_admin", "Super Admin"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    email_verified = models.BooleanField(default=False)
    is_approved = models.BooleanField(
        default=True,
        help_text="Admin approval required before user can access the platform.",
    )

    full_name = models.CharField(max_length=140, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    gender = models.CharField(
        max_length=24,
        choices=[
            ("male", "Male"),
            ("female", "Female"),
            ("prefer_not_to_say", "Prefer not to say"),
        ],
        blank=True,
    )

    bio = models.TextField(blank=True)
    country = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)

    born_again = models.CharField(
        max_length=8,
        choices=[("yes", "Yes"), ("no", "No")],
        blank=True,
    )
    year_of_salvation = models.PositiveSmallIntegerField(null=True, blank=True)
    church_name = models.CharField(max_length=120, blank=True)
    denomination = models.CharField(max_length=120, blank=True)
    serves_in_church = models.CharField(
        max_length=8,
        choices=[("yes", "Yes"), ("no", "No")],
        blank=True,
    )
    ministry_areas = models.JSONField(default=list, blank=True)
    testimony = models.TextField(blank=True)

    why_join = models.TextField(blank=True)
    unity_agreement = models.BooleanField(default=False)
    statement_of_faith = models.BooleanField(default=False)
    code_of_conduct = models.BooleanField(default=False)
    subscribe_scripture = models.BooleanField(default=True)

    membership_type = models.CharField(
        max_length=24,
        choices=[
            ("member", "Member"),
            ("digital_group", "Digital Group"),
            ("revival_hub", "Revival Hub"),
        ],
        default="member",
    )
    led_ministry_before = models.CharField(
        max_length=8,
        choices=[("yes", "Yes"), ("no", "No")],
        blank=True,
    )
    leadership_experience = models.TextField(blank=True)

    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)

    referred_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="referrals",
        help_text="User who referred this account via a share link.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return f"{self.email} ({self.role})"

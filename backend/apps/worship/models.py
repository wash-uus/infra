from django.conf import settings
from django.db import models


class WorshipTeam(models.Model):
    """Represents the Shouts of Joy Melodies worship team."""

    name = models.CharField(max_length=200, default="Shouts of Joy Melodies")
    tagline = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="worship/logos/", blank=True, null=True)
    cover_photo = models.ImageField(upload_to="worship/covers/", blank=True, null=True)
    founded_year = models.PositiveIntegerField(blank=True, null=True)
    whatsapp_link = models.URLField(blank=True, help_text="WhatsApp group invite link for the team community")
    facebook_link = models.URLField(blank=True, help_text="Facebook group link for the team community")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Worship Team"
        verbose_name_plural = "Worship Teams"

    def __str__(self):
        return self.name


class WorshipMember(models.Model):
    """A member of the worship team — either a vocalist or instrumentalist."""

    class Role(models.TextChoices):
        VOCALIST = "vocalist", "Vocalist"
        INSTRUMENTALIST = "instrumentalist", "Instrumentalist"

    team = models.ForeignKey(WorshipTeam, on_delete=models.CASCADE, related_name="members")
    # Optionally linked to an SRA platform user account
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="worship_memberships",
    )
    display_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=Role.choices)
    # For instrumentalists: what they play (e.g. "Lead Guitar", "Keys", "Drums")
    instrument = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to="worship/members/", blank=True, null=True)
    # Order in team listing (lower = first)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "display_name"]
        verbose_name = "Worship Team Member"
        verbose_name_plural = "Worship Team Members"

    def __str__(self):
        suffix = f" ({self.instrument})" if self.instrument else ""
        return f"{self.display_name} — {self.get_role_display()}{suffix}"


class WorshipTrack(models.Model):
    """An audio track released by the worship team."""

    team = models.ForeignKey(WorshipTeam, on_delete=models.CASCADE, related_name="tracks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="worship/tracks/", blank=True, null=True)
    cover_art = models.ImageField(upload_to="worship/track_covers/", blank=True, null=True)
    youtube_url = models.URLField(blank=True)
    released_at = models.DateField(blank=True, null=True)
    duration_seconds = models.PositiveIntegerField(blank=True, null=True)
    is_published = models.BooleanField(default=False)
    play_count = models.PositiveIntegerField(default=0)
    featured_members = models.ManyToManyField(WorshipMember, blank=True, related_name="featured_tracks")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-released_at", "-created_at"]
        verbose_name = "Worship Track"
        verbose_name_plural = "Worship Tracks"

    def __str__(self):
        return f"{self.title} ({self.team.name})"

    @property
    def duration_display(self):
        if not self.duration_seconds:
            return None
        m, s = divmod(self.duration_seconds, 60)
        return f"{m}:{s:02d}"


class TeamJoinRequest(models.Model):
    """A public request to join the Shouts of Joy Melodies worship team."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class Role(models.TextChoices):
        VOCALIST = "vocalist", "Vocalist"
        INSTRUMENTALIST = "instrumentalist", "Instrumentalist"

    team = models.ForeignKey(WorshipTeam, on_delete=models.CASCADE, related_name="join_requests")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="worship_join_requests",
    )
    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    instrument = models.CharField(max_length=100, blank=True, help_text="Required if role is instrumentalist")
    message = models.TextField(blank=True, help_text="Why do you want to join the team?")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    admin_note = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "Team Join Request"
        verbose_name_plural = "Team Join Requests"

    def __str__(self):
        return f"{self.full_name} → {self.team.name} ({self.get_status_display()})"

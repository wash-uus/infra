from django.conf import settings
from django.db import models
from django.utils import timezone
import logging
import requests
from urllib.parse import quote

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class PhotoSource(models.TextChoices):
    UNSPLASH = "unsplash", "Unsplash"
    PEXELS = "pexels", "Pexels"
    MANUAL = "manual", "Manually Added"


class ContentItem(models.Model):
    class ContentType(models.TextChoices):
        BOOK = "book", "Book (PDF)"
        JOURNAL = "journal", "Journal"
        MP3_SERMON = "mp3_sermon", "MP3 Sermon"
        VIDEO = "video", "Video"
        IMAGE = "image", "Image"
        WISDOM = "wisdom", "Word of Wisdom"
        DAILY_SCRIPTURE = "daily_scripture", "Daily Scripture"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=30, choices=ContentType.choices)
    media_file = models.FileField(upload_to="content/", blank=True, null=True)
    photo = models.ImageField(
        upload_to="content-photos/",
        blank=True,
        null=True,
        help_text="Featured photo (used for Daily Wisdom cards and similar content).",
    )
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contents")
    created_at = models.DateTimeField(auto_now_add=True)
    approved = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["type"]),
            models.Index(fields=["approved"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return self.title


class UserPhoto(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_photos")
    image = models.ImageField(upload_to="user-photos/")
    caption = models.CharField(max_length=220, blank=True)
    testimony = models.TextField(blank=True)
    approved = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["approved"]),
            models.Index(fields=["uploaded_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} · {self.uploaded_at:%Y-%m-%d %H:%M}"


class FetchedPhoto(models.Model):
    """
    Auto-sourced worship/spirit-filled images from Unsplash or Pexels.
    All images default to unapproved — admins must approve before they appear
    in the hero collage.
    """

    source = models.CharField(max_length=20, choices=PhotoSource.choices, default=PhotoSource.UNSPLASH)
    source_id = models.CharField(max_length=120, unique=True, help_text="ID from the source API")
    image_url = models.URLField(max_length=1024)
    thumb_url = models.URLField(max_length=1024, blank=True)
    alt_text = models.CharField(max_length=320, blank=True)
    photographer = models.CharField(max_length=200, blank=True)
    photographer_url = models.URLField(max_length=512, blank=True)
    search_term = models.CharField(max_length=120, blank=True)
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["approved"], name="ct_fph_approved_idx"),
            models.Index(fields=["source"], name="ct_fph_source_idx"),
            models.Index(fields=["created_at"], name="ct_fph_created_idx"),
        ]
        verbose_name = "Fetched Photo"
        verbose_name_plural = "Fetched Photos"

    def __str__(self):
        return f"[{self.source}] {self.alt_text or self.source_id}"


class DailyBread(models.Model):
    class BibleVersion(models.TextChoices):
        # Auto-fetched via bible-api.com
        KJV    = "KJV",    "King James Version (KJV)"
        ASV    = "ASV",    "American Standard Version (ASV)"
        WEB    = "WEB",    "World English Bible (WEB)"
        DARBY  = "DARBY",  "Darby Translation"
        BBE    = "BBE",    "Bible in Basic English (BBE)"
        YLT    = "YLT",    "Young's Literal Translation (YLT)"
        # Manual text entry (popular modern / licensed translations)
        NKJV   = "NKJV",   "New King James Version (NKJV)"
        NIV    = "NIV",    "New International Version (NIV)"
        NIV84  = "NIV84",  "New International Version 1984 (NIV84)"
        ESV    = "ESV",    "English Standard Version (ESV)"
        NLT    = "NLT",    "New Living Translation (NLT)"
        NASB   = "NASB",   "New American Standard Bible (NASB)"
        NASB20 = "NASB20", "New American Standard Bible 2020 (NASB2020)"
        AMP    = "AMP",    "Amplified Bible (AMP)"
        AMPC   = "AMPC",   "Amplified Bible Classic (AMPC)"
        MSG    = "MSG",    "The Message (MSG)"
        CSB    = "CSB",    "Christian Standard Bible (CSB)"
        HCSB   = "HCSB",   "Holman Christian Standard Bible (HCSB)"
        RSV    = "RSV",    "Revised Standard Version (RSV)"
        NRSV   = "NRSV",   "New Revised Standard Version (NRSV)"
        GNT    = "GNT",    "Good News Translation (GNT)"
        CEV    = "CEV",    "Contemporary English Version (CEV)"
        NCV    = "NCV",    "New Century Version (NCV)"
        ERV    = "ERV",    "Easy-to-Read Version (ERV)"
        ICB    = "ICB",    "International Children's Bible (ICB)"
        NET    = "NET",    "New English Translation (NET)"
        CJB    = "CJB",    "Complete Jewish Bible (CJB)"
        TPT    = "TPT",    "The Passion Translation (TPT)"
        TLB    = "TLB",    "The Living Bible (TLB)"
        VOICE  = "VOICE",  "The Voice Bible"

    title = models.CharField(max_length=120, default="Daily Bread")
    verse_reference = models.CharField(
        max_length=120,
        help_text="Example: John 3:16-18  — verse text is auto-fetched for KJV / ASV / WEB / DARBY / BBE / YLT. For all other versions enter it manually below.",
    )
    bible_version = models.CharField(max_length=12, choices=BibleVersion.choices, default=BibleVersion.KJV)
    verse_text = models.TextField(
        blank=True,
        help_text="Auto-populated for supported free translations. For licensed versions (NIV, ESV, NKJV …) type or paste the verse text here.",
    )
    photo = models.ImageField(
        upload_to="daily-bread/",
        blank=True,
        null=True,
        help_text="Optional featured photo displayed alongside this devotional.",
    )
    reflection = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    display_date = models.DateField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-display_date", "-updated_at"]
        indexes = [
            models.Index(fields=["is_active", "display_date"]),
        ]

    def __str__(self):
        return f"{self.display_date} · {self.verse_reference} ({self.bible_version})"

    # Versions actually served by the free bible-api.com endpoint
    _AUTO_FETCH_VERSIONS = {
        "KJV":   "kjv",
        "ASV":   "asv",
        "WEB":   "web",
        "DARBY": "darby",
        "BBE":   "bbe",
        "YLT":   "ylt",
    }

    def _translation_code(self):
        """Return the bible-api.com translation slug, or None if not supported."""
        return self._AUTO_FETCH_VERSIONS.get(self.bible_version)

    def _fetch_verse_text(self):
        if not self.verse_reference:
            return ""
        translation = self._translation_code()
        if not translation:
            return ""
        ref = quote(self.verse_reference)
        url = f"https://bible-api.com/{ref}?translation={translation}"
        response = requests.get(url, timeout=8)
        if response.status_code != 200:
            return ""
        data = response.json()
        text = (data.get("text") or "").strip()
        return " ".join(text.split())

    def save(self, *args, **kwargs):
        previous_reference = None
        previous_version = None
        if self.pk:
            previous = DailyBread.objects.filter(pk=self.pk).values("verse_reference", "bible_version").first()
            if previous:
                previous_reference = previous.get("verse_reference")
                previous_version = previous.get("bible_version")

        needs_auto_fetch = (
            not self.pk
            or self.verse_reference != previous_reference
            or self.bible_version != previous_version
        )

        if needs_auto_fetch and self._translation_code():
            try:
                fetched = self._fetch_verse_text()
            except Exception:
                logger.exception("DailyBread.save: verse fetch failed for pk=%s", self.pk)
                fetched = ""
            if fetched:
                self.verse_text = fetched

        super().save(*args, **kwargs)


class ShortStory(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        APPEALED = "appealed", "Under Appeal"

    title = models.CharField(max_length=180)
    story = models.TextField()
    author_name = models.CharField(max_length=120, blank=True)
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_stories",
        help_text="Set when submitted by a registered user (not admin-created).",
    )
    photo = models.ImageField(
        upload_to="short-stories/",
        blank=True,
        null=True,
        help_text="Optional featured image displayed with the story.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.APPROVED, db_index=True,
        help_text="Admin-created stories default to approved. User submissions default to pending.",
    )
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_stories",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["is_published", "published_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# Gallery
# ---------------------------------------------------------------------------

class GalleryItem(models.Model):
    class MediaType(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"

    media_type = models.CharField(max_length=10, choices=MediaType.choices, default=MediaType.PHOTO)
    title = models.CharField(max_length=180)
    caption = models.TextField(blank=True)

    # Photo upload
    image = models.ImageField(
        upload_to="gallery/photos/",
        blank=True,
        null=True,
        help_text="Upload a photo (JPG / PNG / WEBP).",
    )

    # Video: upload a file OR provide an embed URL (YouTube / Vimeo / direct MP4)
    video_file = models.FileField(
        upload_to="gallery/videos/",
        blank=True,
        null=True,
        help_text="Upload a video file (MP4 / MOV / WEBM). Leave blank if using an embed URL instead.",
    )
    video_url = models.URLField(
        max_length=512,
        blank=True,
        help_text="Paste a YouTube or Vimeo URL (e.g. https://youtu.be/xxxx). Used only when no file is uploaded.",
    )

    # Optional thumbnail for videos
    thumbnail = models.ImageField(
        upload_to="gallery/thumbs/",
        blank=True,
        null=True,
        help_text="Optional thumbnail image shown on the gallery grid for this video.",
    )

    approved = models.BooleanField(default=True, db_index=True)
    order = models.PositiveSmallIntegerField(
        default=0,
        help_text="Lower number = displayed first. Use 0 for chronological order.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "-created_at"]
        indexes = [
            models.Index(fields=["approved", "media_type"]),
            models.Index(fields=["order"]),
        ]
        verbose_name = "Gallery Item"
        verbose_name_plural = "Gallery Items"

    def __str__(self):
        return f"[{self.media_type.upper()}] {self.title}"

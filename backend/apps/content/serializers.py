from rest_framework import serializers

from apps.content.models import ContentItem, DailyBread, FetchedPhoto, GalleryItem, ShortStory, UserPhoto
from apps.content.utils import compress_hero_image, validate_image_file


class ContentItemSerializer(serializers.ModelSerializer):
    author_email = serializers.ReadOnlyField(source="author.email")
    author_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem
        fields = [
            "id",
            "title",
            "description",
            "type",
            "media_file",
            "media_url",
            "photo",
            "photo_url",
            "author",
            "author_email",
            "author_name",
            "created_at",
            "approved",
            "tags",
            "category",
        ]
        read_only_fields = ["id", "author", "created_at", "approved", "photo_url", "media_url", "author_name"]

    def get_author_name(self, obj):
        return obj.author.full_name or obj.author.email.split("@")[0]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url

    def get_media_url(self, obj):
        if not obj.media_file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.media_file.url) if request else obj.media_file.url

    def validate_media_file(self, value):
        if not value:
            return value
        allowed_extensions = {
            ".pdf", ".mp3", ".mp4", ".mov", ".jpg", ".jpeg", ".png", ".webp",
        }
        name = value.name.lower()
        if not any(name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError("Unsupported media type")
        # Enforce upload size limits per type
        max_bytes = 50 * 1024 * 1024  # 50 MB default
        if name.endswith(".mp3"):
            max_bytes = 30 * 1024 * 1024  # 30 MB for audio
        elif name.endswith((".mp4", ".mov")):
            max_bytes = 200 * 1024 * 1024  # 200 MB for video
        elif name.endswith(".pdf"):
            max_bytes = 20 * 1024 * 1024  # 20 MB for PDFs
        if value.size > max_bytes:
            raise serializers.ValidationError(
                f"File too large ({value.size / 1024 / 1024:.1f} MB). "
                f"Maximum allowed: {max_bytes // (1024 * 1024)} MB."
            )
        return value


# ── UserPhoto ─────────────────────────────────────────────────────────────────


class UserPhotoSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source="user.email")
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = UserPhoto
        fields = [
            "id",
            "user",
            "user_email",
            "image",
            "image_url",
            "caption",
            "testimony",
            "approved",
            "uploaded_at",
        ]
        read_only_fields = ["id", "user", "user_email", "approved", "uploaded_at", "image_url"]

    def get_image_url(self, obj):
        if not obj.image:
            return ""
        request = self.context.get("request")
        url = obj.image.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate_image(self, value):
        try:
            validate_image_file(value, max_mb=5)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        # Compress + convert to WebP before storage
        return compress_hero_image(value)


# ── FetchedPhoto ──────────────────────────────────────────────────────────────


class FetchedPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FetchedPhoto
        fields = [
            "id",
            "source",
            "source_id",
            "image_url",
            "thumb_url",
            "alt_text",
            "photographer",
            "photographer_url",
            "search_term",
            "approved",
            "created_at",
        ]
        read_only_fields = ["id", "source_id", "approved", "created_at"]


# ── HeroCollage — unified read-only shape ─────────────────────────────────────


class HeroCollageItemSerializer(serializers.Serializer):
    """
    Flattened, read-only shape for both UserPhoto and FetchedPhoto objects,
    consumed by the /api/hero-collage/ endpoint.
    """

    id = serializers.CharField()
    image_url = serializers.CharField()
    thumb_url = serializers.CharField()
    alt_text = serializers.CharField()
    caption = serializers.CharField()
    source = serializers.CharField()       # 'user' | 'unsplash' | 'pexels' | 'manual'
    photographer = serializers.CharField()
    photographer_url = serializers.CharField()


# ── GalleryItem ──────────────────────────────────────────────────────────────


class GalleryItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryItem
        fields = [
            "id",
            "media_type",
            "title",
            "caption",
            "image",
            "image_url",
            "video_file",
            "video_file_url",
            "video_url",
            "thumbnail",
            "thumbnail_url",
            "approved",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "approved", "created_at"]

    def _abs(self, obj_file):
        if not obj_file:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj_file.url)
        return obj_file.url

    def get_image_url(self, obj):
        return self._abs(obj.image)

    def get_video_file_url(self, obj):
        return self._abs(obj.video_file)

    def get_thumbnail_url(self, obj):
        return self._abs(obj.thumbnail)


class DailyBreadSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = DailyBread
        fields = [
            "id",
            "title",
            "verse_reference",
            "bible_version",
            "verse_text",
            "reflection",
            "display_date",
            "photo",
            "photo_url",
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url


class ShortStorySerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    submitter_name = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = ShortStory
        fields = [
            "id",
            "title",
            "story",
            "author_name",
            "published_at",
            "photo",
            "photo_url",
            "share_url",
            "status",
            "rejection_reason",
            "submitter_name",
        ]
        read_only_fields = [
            "id",
            "status",
            "rejection_reason",
            "submitter_name",
            "published_at",
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url

    def get_share_url(self, obj):
        return f"/stories/{obj.id}"

    def get_submitter_name(self, obj):
        if obj.submitter:
            return obj.submitter.full_name or obj.submitter.email.split("@")[0]
        return obj.author_name or "Anonymous"

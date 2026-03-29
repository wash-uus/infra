from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from apps.common.utils import log_action, send_notification
from apps.content.models import ContentItem, DailyBread, FetchedPhoto, GalleryItem, ShortStory, UserPhoto


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "type", "author", "photo_thumb", "approved", "created_at")
    list_filter = ("type", "approved", "category")
    search_fields = ("title", "description", "author__email")
    readonly_fields = ("created_at", "photo_preview")

    fieldsets = (
        ("Content", {"fields": ("title", "description", "type", "author", "approved", "tags", "category")}),
        ("Files", {"fields": ("media_file",)}),
        ("Featured Photo", {
            "fields": ("photo_preview", "photo"),
            "description": "Used as the display image for Daily Wisdom cards and similar content entries.",
        }),
        ("Meta", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    @admin.display(description="Photo")
    def photo_thumb(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="height:40px;border-radius:4px;object-fit:cover;" />',
                obj.photo.url,
            )
        return "—"

    @admin.display(description="Photo Preview")
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-height:300px;max-width:560px;border-radius:8px;object-fit:cover;" />',
                obj.photo.url,
            )
        return "No photo uploaded"


# ── UserPhoto ─────────────────────────────────────────────────────────────────


@admin.register(UserPhoto)
class UserPhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "thumb_preview", "user", "caption_short", "approved", "uploaded_at")
    list_filter = ("approved", "uploaded_at")
    search_fields = ("user__email", "caption", "testimony")
    readonly_fields = ("thumb_preview_large", "uploaded_at")
    actions = ["approve_selected", "reject_selected"]

    @admin.display(description="Preview")
    def thumb_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:50px;border-radius:4px;object-fit:cover;" />',
                obj.image.url,
            )
        return "—"

    @admin.display(description="Large Preview")
    def thumb_preview_large(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:340px;max-width:600px;border-radius:8px;object-fit:cover;" />',
                obj.image.url,
            )
        return "No image"

    @admin.display(description="Caption")
    def caption_short(self, obj):
        return obj.caption[:60] if obj.caption else "—"

    @admin.action(description="✅ Approve selected photos")
    def approve_selected(self, request, queryset):
        updated = queryset.update(approved=True)
        self.message_user(request, f"{updated} photo(s) approved for hero collage.")

    @admin.action(description="🚫 Reject (hide) selected photos")
    def reject_selected(self, request, queryset):
        updated = queryset.update(approved=False)
        self.message_user(request, f"{updated} photo(s) rejected.")


# ── FetchedPhoto ──────────────────────────────────────────────────────────────


@admin.register(FetchedPhoto)
class FetchedPhotoAdmin(admin.ModelAdmin):
    list_display = (
        "id", "thumb_preview", "source_badge", "alt_text_short",
        "photographer", "search_term", "approved", "created_at",
    )
    list_filter = ("approved", "source", "search_term", "created_at")
    search_fields = ("alt_text", "photographer", "source_id", "search_term")
    readonly_fields = (
        "thumb_preview_large", "source_id", "source", "photographer_url",
        "created_at", "updated_at",
    )
    actions = ["approve_selected", "reject_selected"]
    list_editable = ("approved",)
    ordering = ("-created_at",)

    fieldsets = (
        ("Image", {
            "fields": ("thumb_preview_large", "image_url", "thumb_url", "alt_text"),
        }),
        ("Attribution", {
            "fields": ("source", "source_id", "photographer", "photographer_url", "search_term"),
        }),
        ("Moderation", {
            "fields": ("approved", "created_at", "updated_at"),
        }),
    )

    @admin.display(description="Preview")
    def thumb_preview(self, obj):
        url = obj.thumb_url or obj.image_url
        if url:
            return format_html(
                '<img src="{}" style="height:50px;border-radius:4px;object-fit:cover;" />',
                url,
            )
        return "—"

    @admin.display(description="Large Preview")
    def thumb_preview_large(self, obj):
        url = obj.thumb_url or obj.image_url
        if url:
            return format_html(
                '<img src="{}" style="max-height:340px;max-width:600px;border-radius:8px;object-fit:cover;" />',
                url,
            )
        return "No image"

    @admin.display(description="Source")
    def source_badge(self, obj):
        colours = {"pexels": "#05A081", "unsplash": "#000", "manual": "#888"}
        colour = colours.get(obj.source, "#888")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">{}</span>',
            colour,
            obj.source.upper(),
        )

    @admin.display(description="Alt Text")
    def alt_text_short(self, obj):
        return obj.alt_text[:60] if obj.alt_text else "—"

    @admin.action(description="✅ Approve selected fetched photos")
    def approve_selected(self, request, queryset):
        updated = queryset.update(approved=True)
        self.message_user(request, f"{updated} photo(s) approved for hero collage.")

    @admin.action(description="🚫 Reject (hide) selected fetched photos")
    def reject_selected(self, request, queryset):
        updated = queryset.update(approved=False)
        self.message_user(request, f"{updated} photo(s) rejected.")


@admin.register(DailyBread)
class DailyBreadAdmin(admin.ModelAdmin):
    class Media:
        js = ("admin/js/bible_selector.js",)

    list_display = ("id", "display_date", "verse_reference", "bible_version", "photo_thumb", "is_active", "updated_at")
    list_filter = ("bible_version", "is_active", "display_date")
    search_fields = ("verse_reference", "verse_text", "reflection")
    readonly_fields = ("created_at", "updated_at", "photo_preview")
    ordering = ("-display_date", "-updated_at")
    list_editable = ("is_active",)

    fieldsets = (
        ("Daily Bread", {"fields": ("title", "display_date", "is_active")}),
        ("Bible Verse", {
            "fields": ("verse_reference", "bible_version", "verse_text"),
            "description": (
                "<strong>Auto-fetch:</strong> Verse text is automatically populated for "
                "KJV, ASV, WEB, Darby, BBE, and YLT when you save. "
                "For NIV, ESV, NKJV, NLT, AMP and all other licensed versions, "
                "please type or paste the verse text manually."
            ),
        }),
        ("Featured Photo", {"fields": ("photo_preview", "photo")}),
        ("Reflection", {"fields": ("reflection",)}),
        ("Meta", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Photo")
    def photo_thumb(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="height:40px;border-radius:4px;object-fit:cover;" />',
                obj.photo.url,
            )
        return "—"

    @admin.display(description="Photo Preview")
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-height:300px;max-width:560px;border-radius:8px;object-fit:cover;" />',
                obj.photo.url,
            )
        return "No photo uploaded"


# ── GalleryItem ───────────────────────────────────────────────────────────────


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = (
        "id", "media_type_badge", "title", "media_preview",
        "approved", "order", "created_at",
    )
    list_filter = ("media_type", "approved", "created_at")
    search_fields = ("title", "caption")
    readonly_fields = ("media_preview_large", "created_at", "updated_at")
    list_editable = ("approved", "order")
    ordering = ("order", "-created_at")
    actions = ["approve_selected", "reject_selected"]

    fieldsets = (
        ("Media Type & Info", {
            "fields": ("media_type", "title", "caption"),
        }),
        ("Photo Upload", {
            "fields": ("media_preview_large", "image"),
            "description": "Upload a JPG / PNG / WEBP photo. Only used when Media Type is 'Photo'.",
            "classes": ("collapse",),
        }),
        ("Video Upload", {
            "fields": ("video_file", "video_url"),
            "description": (
                "Upload an MP4 / MOV / WEBM file, OR paste a YouTube/Vimeo URL. "
                "Only used when Media Type is 'Video'."
            ),
            "classes": ("collapse",),
        }),
        ("Thumbnail", {
            "fields": ("thumbnail",),
            "description": "Optional — shown on the gallery grid for video items.",
            "classes": ("collapse",),
        }),
        ("Moderation & Order", {
            "fields": ("approved", "order"),
        }),
        ("Meta", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Type")
    def media_type_badge(self, obj):
        colour = "#D97706" if obj.media_type == "photo" else "#2563EB"
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px">{}</span>',
            colour,
            obj.get_media_type_display(),
        )

    @admin.display(description="Preview")
    def media_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:48px;border-radius:4px;object-fit:cover;" />',
                obj.image.url,
            )
        if obj.thumbnail:
            return format_html(
                '<img src="{}" style="height:48px;border-radius:4px;object-fit:cover;" />',
                obj.thumbnail.url,
            )
        if obj.video_url:
            return format_html('<span style="font-size:20px">▶</span>')
        return "—"

    @admin.display(description="Large Preview")
    def media_preview_large(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:340px;max-width:600px;border-radius:8px;object-fit:cover;" />',
                obj.image.url,
            )
        if obj.thumbnail:
            return format_html(
                '<img src="{}" style="max-height:340px;max-width:600px;border-radius:8px;object-fit:cover;" />',
                obj.thumbnail.url,
            )
        if obj.video_file:
            return format_html(
                '<video src="{}" controls style="max-width:600px;border-radius:8px;"></video>',
                obj.video_file.url,
            )
        return "No media uploaded"

    @admin.action(description="✅ Approve selected items")
    def approve_selected(self, request, queryset):
        updated = queryset.update(approved=True)
        self.message_user(request, f"{updated} gallery item(s) approved.")

    @admin.action(description="🚫 Reject (hide) selected items")
    def reject_selected(self, request, queryset):
        updated = queryset.update(approved=False)
        self.message_user(request, f"{updated} gallery item(s) rejected.")


@admin.register(ShortStory)
class ShortStoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "submitter",
        "status",
        "is_published",
        "published_at",
        "updated_at",
    )
    list_filter = ("status", "is_published", "published_at")
    search_fields = ("title", "story", "author_name", "submitter__email", "submitter__full_name")
    readonly_fields = ("created_at", "updated_at", "photo_preview", "reviewed_by", "reviewed_at")
    ordering = ("-published_at", "-updated_at")
    actions = ["approve_selected", "reject_selected"]

    fieldsets = (
        ("Story", {"fields": ("title", "story", "author_name", "submitter")}),
        ("Moderation", {
            "fields": ("status", "rejection_reason", "reviewed_by", "reviewed_at", "is_published", "published_at"),
            "description": "Set status to approve or reject. Submitters receive a notification on change.",
        }),
        ("Featured Photo", {"fields": ("photo_preview", "photo")}),
        ("Meta", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Photo")
    def photo_thumb(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="height:40px;border-radius:4px;object-fit:cover;" />',
                obj.photo.url,
            )
        return "—"

    @admin.display(description="Photo Preview")
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-height:300px;max-width:560px;border-radius:8px;object-fit:cover;" />',
                obj.photo.url,
            )
        return "No photo uploaded"

    @admin.action(description="✅ Approve selected stories")
    def approve_selected(self, request, queryset):
        updated = 0
        for story in queryset.filter(status=ShortStory.Status.PENDING):
            story.status = ShortStory.Status.APPROVED
            story.rejection_reason = ""
            story.is_published = True
            story.reviewed_by = request.user
            story.reviewed_at = timezone.now()
            story.save(update_fields=[
                "status",
                "rejection_reason",
                "is_published",
                "reviewed_by",
                "reviewed_at",
            ])
            if story.submitter:
                send_notification(
                    story.submitter,
                    "Your story is live ✓",
                    f'"{story.title}" has been approved and is now public.',
                    notif_type="approved",
                    link="/content",
                )
                log_action(request.user, "story.approve", "ShortStory", story.pk, detail=story.title)
            updated += 1
        self.message_user(request, f"{updated} story(ies) approved.")

    @admin.action(description="🚫 Reject selected stories")
    def reject_selected(self, request, queryset):
        updated = 0
        for story in queryset.exclude(status=ShortStory.Status.REJECTED):
            story.status = ShortStory.Status.REJECTED
            story.is_published = False
            story.reviewed_by = request.user
            story.reviewed_at = timezone.now()
            story.save(update_fields=["status", "is_published", "reviewed_by", "reviewed_at"])
            if story.submitter:
                send_notification(
                    story.submitter,
                    "Update on your story",
                    f'Your story "{story.title}" was not approved.',
                    notif_type="rejected",
                    link="/content",
                )
                log_action(request.user, "story.reject", "ShortStory", story.pk, detail=story.title)
            updated += 1
        self.message_user(request, f"{updated} story(ies) rejected.")

    def save_model(self, request, obj, form, change):
        status_changed = change and "status" in form.changed_data
        if status_changed:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
        if status_changed:
            approved = obj.status == ShortStory.Status.APPROVED
            obj.is_published = approved
            obj.save(update_fields=["is_published"])
        if status_changed and obj.submitter and obj.status in {ShortStory.Status.APPROVED, ShortStory.Status.REJECTED}:
            approved = obj.status == ShortStory.Status.APPROVED
            send_notification(
                obj.submitter,
                "Your story is live ✓" if approved else "Update on your story",
                (
                    f'"{obj.title}" has been approved and is now public.'
                    if approved
                    else f'Your story "{obj.title}" was not approved.'
                    + (f" Reason: {obj.rejection_reason}" if obj.rejection_reason else "")
                ),
                notif_type="approved" if approved else "rejected",
                link="/content",
            )
            log_action(
                request.user,
                "story.approve" if approved else "story.reject",
                "ShortStory",
                obj.pk,
                detail=obj.title,
            )


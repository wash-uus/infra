from django.contrib import admin
from django.utils import timezone

from apps.common.utils import log_action, send_notification
from apps.prayer.models import PrayerRequest


def _bulk_approve(modeladmin, request, queryset):
    updated = 0
    for prayer in queryset.filter(status=PrayerRequest.Status.PENDING):
        prayer.status = PrayerRequest.Status.APPROVED
        prayer.rejection_reason = ""
        prayer.reviewed_by = request.user
        prayer.reviewed_at = timezone.now()
        prayer.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"])
        send_notification(
            prayer.user,
            "Your prayer request is live ✓",
            f'"{prayer.title}" has been approved and is now on the prayer wall.',
            notif_type="approved",
            link="/prayer",
        )
        log_action(request.user, "prayer.approve", "PrayerRequest", prayer.pk, detail=prayer.title)
        updated += 1
    modeladmin.message_user(request, f"{updated} prayer request(s) approved.")
_bulk_approve.short_description = "✓ Approve selected requests"


def _bulk_reject(modeladmin, request, queryset):
    updated = 0
    for prayer in queryset.exclude(status=PrayerRequest.Status.REJECTED):
        prayer.status = PrayerRequest.Status.REJECTED
        prayer.reviewed_by = request.user
        prayer.reviewed_at = timezone.now()
        prayer.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        send_notification(
            prayer.user,
            "Update on your prayer request",
            f'Your request "{prayer.title}" was not approved.',
            notif_type="rejected",
            link="/prayer",
        )
        log_action(request.user, "prayer.reject", "PrayerRequest", prayer.pk, detail=prayer.title)
        updated += 1
    modeladmin.message_user(request, f"{updated} prayer request(s) rejected.")
_bulk_reject.short_description = "✗ Reject selected requests"


@admin.register(PrayerRequest)
class PrayerRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "status", "is_public", "prayer_count", "created_at")
    list_filter = ("status", "is_public", "created_at")
    search_fields = ("title", "description", "user__email", "user__full_name")
    readonly_fields = ("created_at", "prayer_count", "reviewed_by", "reviewed_at")
    ordering = ("-created_at",)
    list_per_page = 40
    actions = [_bulk_approve, _bulk_reject]

    fieldsets = (
        ("🙏 Prayer Request", {"fields": ("title", "description", "user", "is_public")}),
        ("✅ Moderation", {
            "fields": ("status", "rejection_reason", "reviewed_by", "reviewed_at"),
            "description": "Change status here to approve or reject. User will receive an in-app notification.",
        }),
        ("📊 Stats", {"fields": ("prayer_count", "created_at"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        status_changed = change and "status" in form.changed_data
        if status_changed:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
        if status_changed and obj.status in {PrayerRequest.Status.APPROVED, PrayerRequest.Status.REJECTED}:
            approved = obj.status == PrayerRequest.Status.APPROVED
            send_notification(
                obj.user,
                "Your prayer request is live ✓" if approved else "Update on your prayer request",
                (
                    f'"{obj.title}" has been approved and is now on the prayer wall.'
                    if approved
                    else f'Your request "{obj.title}" was not approved.'
                    + (f" Reason: {obj.rejection_reason}" if obj.rejection_reason else "")
                ),
                notif_type="approved" if approved else "rejected",
                link="/prayer",
            )
            log_action(
                request.user,
                "prayer.approve" if approved else "prayer.reject",
                "PrayerRequest",
                obj.pk,
                detail=obj.title,
            )

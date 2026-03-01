from django.contrib import admin
from django.utils.html import format_html

from apps.common.models import Announcement, AppealRequest, AuditLog, ContentReview, Notification


# ── Announcement ─────────────────────────────────────────────────────────────


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display  = ("id", "priority_badge", "title", "is_active", "expires_at", "created_by", "created_at")
    list_filter   = ("priority", "is_active", "created_at")
    search_fields = ("title", "body")
    readonly_fields = ("created_by", "created_at", "updated_at")
    list_editable = ("is_active",)
    ordering      = ("-created_at",)

    fieldsets = (
        ("Announcement", {"fields": ("title", "body", "priority")}),
        ("Visibility",   {"fields": ("is_active", "expires_at")}),
        ("Meta",         {"fields": ("created_by", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    PRIORITY_COLORS = {"info": "#3b82f6", "warning": "#f59e0b", "urgent": "#ef4444"}

    @admin.display(description="Priority")
    def priority_badge(self, obj):
        color = self.PRIORITY_COLORS.get(obj.priority, "#888")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:0.75rem;font-weight:600;">{}</span>',
            color, obj.get_priority_display(),
        )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "actor", "action", "target_model", "target_id", "ip_address", "created_at", "archived")
    list_filter = ("action", "target_model", "archived", "created_at")
    search_fields = ("actor__email", "action", "target_model", "target_id", "ip_address", "detail")
    readonly_fields = ("actor", "action", "target_model", "target_id", "detail", "ip_address", "created_at")
    ordering = ("-created_at",)
    list_per_page = 50
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False  # Audit logs are immutable

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "notif_type_badge", "title", "is_read", "created_at")
    list_filter = ("notif_type", "is_read", "created_at")
    search_fields = ("recipient__email", "title", "message")
    readonly_fields = ("created_at",)
    raw_id_fields = ("recipient",)
    ordering = ("-created_at",)
    list_per_page = 50

    NOTIF_COLORS = {
        "info": "#3b82f6",
        "warning": "#f59e0b",
        "action": "#8b5cf6",
        "approved": "#10b981",
        "rejected": "#ef4444",
        "appeal": "#e85d04",
    }

    @admin.display(description="Type")
    def notif_type_badge(self, obj):
        color = self.NOTIF_COLORS.get(obj.notif_type, "#666")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;'
            'border-radius:12px;font-size:0.75rem;font-weight:600;">{}</span>',
            color, obj.get_notif_type_display(),
        )


@admin.register(ContentReview)
class ContentReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "target_type", "target_id", "submitter", "reviewer", "status_badge", "created_at", "reviewed_at")
    list_filter = ("status", "target_type", "created_at")
    search_fields = ("submitter__email", "reviewer__email", "reason")
    readonly_fields = ("created_at", "reviewed_at")
    raw_id_fields = ("submitter", "reviewer")
    ordering = ("-created_at",)
    list_per_page = 40
    date_hierarchy = "created_at"

    STATUS_COLORS = {
        "pending": "#f59e0b",
        "approved": "#10b981",
        "rejected": "#ef4444",
    }

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#666")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:0.75rem;font-weight:600;">{}</span>',
            color, obj.get_status_display(),
        )


@admin.register(AppealRequest)
class AppealRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "appellant", "review", "status_badge", "resolved_by", "created_at", "resolved_at")
    list_filter = ("status", "created_at")
    search_fields = ("appellant__email", "reason", "admin_note")
    readonly_fields = ("created_at", "resolved_at")
    raw_id_fields = ("appellant", "review", "resolved_by")
    ordering = ("-created_at",)
    list_per_page = 40

    fieldsets = (
        ("📋 Appeal", {"fields": ("appellant", "review", "reason", "status")}),
        ("⚖️ Resolution", {"fields": ("admin_note", "resolved_by", "resolved_at")}),
        ("ℹ️ Meta", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    STATUS_COLORS = {
        "pending": "#f59e0b",
        "upheld": "#ef4444",
        "overturned": "#10b981",
    }

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, "#666")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:0.75rem;font-weight:600;">{}</span>',
            color, obj.get_status_display(),
        )

from django.contrib import admin

from .models import ShareEvent


@admin.register(ShareEvent)
class ShareEventAdmin(admin.ModelAdmin):
    list_display = ("id", "content_type", "object_id", "platform", "user", "ip_address", "created_at")
    list_filter = ("platform", "content_type", "created_at")
    search_fields = ("user__email", "ip_address")
    readonly_fields = ("user", "content_type", "object_id", "platform", "ip_address", "created_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

from django.contrib import admin

from apps.prayer.models import PrayerRequest


@admin.register(PrayerRequest)
class PrayerRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "is_public", "prayer_count", "created_at")
    list_filter = ("is_public", "created_at")
    search_fields = ("title", "description", "user__email", "user__full_name")
    readonly_fields = ("created_at", "prayer_count")
    ordering = ("-created_at",)
    list_per_page = 40

    fieldsets = (
        ("🙏 Prayer Request", {"fields": ("title", "description", "user", "is_public")}),
        ("📊 Stats", {"fields": ("prayer_count", "created_at"), "classes": ("collapse",)}),
    )

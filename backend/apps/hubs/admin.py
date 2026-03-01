from django.contrib import admin
from django.utils.html import format_html

from apps.hubs.models import HubMembership, RevivalHub


class HubMembershipInline(admin.TabularInline):
    model = HubMembership
    extra = 0
    readonly_fields = ("joined_at",)
    raw_id_fields = ("user",)


@admin.register(RevivalHub)
class RevivalHubAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "country", "city", "leader", "status_badge", "member_count", "created_at")
    list_filter = ("status", "country", "created_at")
    search_fields = ("name", "description", "country", "city", "leader__email")
    readonly_fields = ("created_at",)
    raw_id_fields = ("leader",)
    ordering = ("-created_at",)
    inlines = [HubMembershipInline]
    list_per_page = 30
    actions = ["approve_hubs"]

    fieldsets = (
        ("🏛 Hub Info", {"fields": ("name", "country", "city", "description", "leader", "status")}),
        ("📅 Schedule", {"fields": ("meeting_schedule",)}),
        ("ℹ️ Meta", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = "#10b981" if obj.status == "approved" else "#f59e0b"
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:0.75rem;font-weight:600;">{}</span>',
            color, obj.get_status_display(),
        )

    @admin.display(description="Members")
    def member_count(self, obj):
        return obj.memberships.count()

    @admin.action(description="✅ Approve selected hubs")
    def approve_hubs(self, request, queryset):
        updated = queryset.update(status=RevivalHub.Status.APPROVED)
        self.message_user(request, f"{updated} hub(s) approved.")


@admin.register(HubMembership)
class HubMembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "hub", "joined_at")
    list_filter = ("joined_at",)
    search_fields = ("user__email", "hub__name")
    readonly_fields = ("joined_at",)
    raw_id_fields = ("user", "hub")
    ordering = ("-joined_at",)

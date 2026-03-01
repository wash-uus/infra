from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html

from apps.accounts.models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "🔥 Spirit Revival Africa — Profile",
            {
                "fields": (
                    "role",
                    "email_verified",
                    "full_name",
                    "phone",
                    "gender",
                    "bio",
                    "country",
                    "city",
                    "profile_picture",
                )
            },
        ),
        (
            "⛪ Church & Faith",
            {
                "fields": (
                    "born_again",
                    "year_of_salvation",
                    "church_name",
                    "denomination",
                    "serves_in_church",
                    "ministry_areas",
                    "testimony",
                )
            },
        ),
        (
            "📋 Membership Details",
            {
                "fields": (
                    "why_join",
                    "unity_agreement",
                    "statement_of_faith",
                    "code_of_conduct",
                    "subscribe_scripture",
                    "membership_type",
                    "led_ministry_before",
                    "leadership_experience",
                )
            },
        ),
    )

    list_display = (
        "id",
        "avatar_preview",
        "email",
        "full_name",
        "role_badge",
        "country",
        "email_verified",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "email_verified", "is_active", "is_staff", "gender", "country")
    search_fields = ("email", "username", "full_name", "country", "city", "church_name")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login", "avatar_preview")
    list_per_page = 30

    @admin.display(description="Avatar")
    def avatar_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="height:36px;width:36px;border-radius:50%;object-fit:cover;" />',
                obj.profile_picture.url,
            )
        initials = (obj.full_name or obj.username or "?")[:1].upper()
        return format_html(
            '<div style="height:36px;width:36px;border-radius:50%;'
            'background:#e85d04;color:#fff;display:flex;align-items:center;'
            'justify-content:center;font-weight:bold;font-size:16px;">{}</div>',
            initials,
        )

    ROLE_COLORS = {
        "member": "#3b82f6",
        "moderator": "#8b5cf6",
        "hub_leader": "#10b981",
        "admin": "#f59e0b",
        "super_admin": "#ef4444",
    }

    @admin.display(description="Role")
    def role_badge(self, obj):
        color = self.ROLE_COLORS.get(obj.role, "#666")
        label = obj.get_role_display()
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;'
            'border-radius:12px;font-size:0.75rem;font-weight:600;">{}</span>',
            color, label,
        )

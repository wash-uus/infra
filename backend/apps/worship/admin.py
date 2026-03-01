from django.contrib import admin

from apps.worship.models import TeamJoinRequest, WorshipMember, WorshipTeam, WorshipTrack


class WorshipMemberInline(admin.TabularInline):
    model = WorshipMember
    extra = 1
    fields = ("display_name", "role", "instrument", "order", "is_active", "user")
    ordering = ("order", "display_name")


class WorshipTrackInline(admin.TabularInline):
    model = WorshipTrack
    extra = 0
    fields = ("title", "released_at", "is_published", "youtube_url", "duration_seconds")
    ordering = ("-released_at",)


@admin.register(WorshipTeam)
class WorshipTeamAdmin(admin.ModelAdmin):
    list_display = ("name", "tagline", "founded_year", "is_active", "created_at")
    search_fields = ("name", "tagline", "description")
    inlines = [WorshipMemberInline, WorshipTrackInline]
    fieldsets = (
        (None, {
            "fields": ("name", "tagline", "description", "is_active", "founded_year", "whatsapp_link", "facebook_link"),
        }),
        ("Media", {
            "fields": ("logo", "cover_photo"),
            "classes": ("collapse",),
        }),
    )


@admin.register(WorshipMember)
class WorshipMemberAdmin(admin.ModelAdmin):
    list_display = ("display_name", "team", "role", "instrument", "order", "is_active")
    list_filter = ("team", "role", "is_active")
    search_fields = ("display_name", "instrument", "bio")
    ordering = ("team", "order", "display_name")
    autocomplete_fields = ["user"]


@admin.register(WorshipTrack)
class WorshipTrackAdmin(admin.ModelAdmin):
    list_display = ("title", "team", "released_at", "is_published", "play_count")
    list_filter = ("team", "is_published")
    search_fields = ("title", "description")
    ordering = ("-released_at",)
    filter_horizontal = ("featured_members",)
    fieldsets = (
        (None, {
            "fields": ("team", "title", "description", "is_published"),
        }),
        ("Media", {
            "fields": ("audio_file", "cover_art", "youtube_url"),
        }),
        ("Details", {
            "fields": ("released_at", "duration_seconds", "featured_members"),
        }),
        ("Stats", {
            "fields": ("play_count",),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("play_count",)


@admin.register(TeamJoinRequest)
class TeamJoinRequestAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "role", "instrument", "team", "status", "submitted_at")
    list_filter = ("team", "role", "status")
    search_fields = ("full_name", "email", "instrument", "message")
    ordering = ("-submitted_at",)
    readonly_fields = ("full_name", "email", "phone", "role", "instrument", "message", "user", "submitted_at")
    fieldsets = (
        ("Applicant", {
            "fields": ("full_name", "email", "phone", "user"),
        }),
        ("Application", {
            "fields": ("team", "role", "instrument", "message"),
        }),
        ("Review", {
            "fields": ("status", "admin_note", "reviewed_at"),
        }),
        ("Meta", {
            "fields": ("submitted_at",),
            "classes": ("collapse",),
        }),
    )

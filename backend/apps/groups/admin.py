from django.contrib import admin

from apps.groups.models import GroupMembership, RevivalGroup


class GroupMembershipInline(admin.TabularInline):
    model = GroupMembership
    extra = 0
    readonly_fields = ("joined_at",)
    raw_id_fields = ("user",)


@admin.register(RevivalGroup)
class RevivalGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "privacy", "member_count", "created_at")
    list_filter = ("privacy", "created_at")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    inlines = [GroupMembershipInline]
    list_per_page = 30

    @admin.display(description="Members")
    def member_count(self, obj):
        return obj.members.count()


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "group", "joined_at")
    list_filter = ("joined_at",)
    search_fields = ("user__email", "group__name")
    readonly_fields = ("joined_at",)
    raw_id_fields = ("user", "group")
    ordering = ("-joined_at",)

from django.contrib import admin

from apps.messaging.models import DirectMessage, GroupMessage, GroupMessageReadReceipt


@admin.register(DirectMessage)
class DirectMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "text_preview", "has_audio", "is_read", "is_deleted", "timestamp")
    list_filter = ("is_read", "is_deleted", "timestamp")
    search_fields = ("sender__email", "sender__username", "receiver__email", "receiver__username", "text")
    readonly_fields = ("sender", "receiver", "timestamp")
    ordering = ("-timestamp",)
    list_per_page = 50
    date_hierarchy = "timestamp"
    actions = ["mark_deleted", "mark_undeleted"]
    fieldsets = (
        ("Participants", {"fields": ("sender", "receiver")}),
        ("Content", {"fields": ("text", "audio_file")}),
        ("Status", {"fields": ("is_read", "is_deleted", "timestamp")}),
    )

    @admin.display(description="Message")
    def text_preview(self, obj):
        return (obj.text[:60] + "…") if len(obj.text) > 60 else obj.text or "[audio]"

    @admin.display(description="Audio", boolean=True)
    def has_audio(self, obj):
        return bool(obj.audio_file)

    @admin.action(description="Mark selected messages as deleted")
    def mark_deleted(self, request, queryset):
        count = queryset.update(is_deleted=True)
        self.message_user(request, f"{count} message(s) marked as deleted.")

    @admin.action(description="Restore selected deleted messages")
    def mark_undeleted(self, request, queryset):
        count = queryset.update(is_deleted=False)
        self.message_user(request, f"{count} message(s) restored.")

    def has_add_permission(self, request):
        return False


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "group", "text_preview", "has_audio", "is_deleted", "timestamp")
    list_filter = ("is_deleted", "timestamp", "group")
    search_fields = ("sender__email", "sender__username", "group__name", "text")
    readonly_fields = ("sender", "group", "timestamp")
    ordering = ("-timestamp",)
    list_per_page = 50
    date_hierarchy = "timestamp"
    actions = ["mark_deleted", "mark_undeleted"]
    fieldsets = (
        ("Participants", {"fields": ("sender", "group")}),
        ("Content", {"fields": ("text", "audio_file")}),
        ("Status", {"fields": ("is_deleted", "timestamp")}),
    )

    @admin.display(description="Message")
    def text_preview(self, obj):
        return (obj.text[:60] + "…") if len(obj.text) > 60 else obj.text or "[audio]"

    @admin.display(description="Audio", boolean=True)
    def has_audio(self, obj):
        return bool(obj.audio_file)

    @admin.action(description="Mark selected messages as deleted")
    def mark_deleted(self, request, queryset):
        count = queryset.update(is_deleted=True)
        self.message_user(request, f"{count} message(s) marked as deleted.")

    @admin.action(description="Restore selected deleted messages")
    def mark_undeleted(self, request, queryset):
        count = queryset.update(is_deleted=False)
        self.message_user(request, f"{count} message(s) restored.")

    def has_add_permission(self, request):
        return False


@admin.register(GroupMessageReadReceipt)
class GroupMessageReadReceiptAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "group", "last_read_at")
    list_filter = ("group",)
    search_fields = ("user__email", "user__username", "group__name")
    ordering = ("-last_read_at",)
    list_per_page = 50
    readonly_fields = ("user", "group", "last_read_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

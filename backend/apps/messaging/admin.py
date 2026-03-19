from django.contrib import admin

from apps.messaging.models import DirectMessage, GroupMessage, GroupMessageReadReceipt


@admin.register(DirectMessage)
class DirectMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "text_preview", "has_audio", "is_read", "timestamp")
    list_filter = ("is_read", "timestamp")
    search_fields = ("sender__email", "receiver__email", "text")
    readonly_fields = ("timestamp",)
    raw_id_fields = ("sender", "receiver")
    ordering = ("-timestamp",)
    list_per_page = 50

    @admin.display(description="Message")
    def text_preview(self, obj):
        return (obj.text[:60] + "…") if len(obj.text) > 60 else obj.text or "[audio]"

    @admin.display(description="Audio", boolean=True)
    def has_audio(self, obj):
        return bool(obj.audio_file)


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "group", "text_preview", "has_audio", "timestamp")
    list_filter = ("timestamp", "group")
    search_fields = ("sender__email", "group__name", "text")
    readonly_fields = ("timestamp",)
    raw_id_fields = ("sender", "group")
    ordering = ("-timestamp",)
    list_per_page = 50

    @admin.display(description="Message")
    def text_preview(self, obj):
        return (obj.text[:60] + "…") if len(obj.text) > 60 else obj.text or "[audio]"

    @admin.display(description="Audio", boolean=True)
    def has_audio(self, obj):
        return bool(obj.audio_file)


@admin.register(GroupMessageReadReceipt)
class GroupMessageReadReceiptAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "group", "last_read_at")
    list_filter = ("group",)
    raw_id_fields = ("user", "group")
    ordering = ("-last_read_at",)
    list_per_page = 50

    @admin.display(description="Message")
    def text_preview(self, obj):
        return (obj.text[:60] + "…") if len(obj.text) > 60 else obj.text or "[audio]"

    @admin.display(description="Audio", boolean=True)
    def has_audio(self, obj):
        return bool(obj.audio_file)

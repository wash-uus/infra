from django.contrib import admin
from django.utils.html import format_html

from .models import WhatsAppBroadcast, WhatsAppContact, WhatsAppDeliveryMetric, WhatsAppMessage


@admin.register(WhatsAppContact)
class WhatsAppContactAdmin(admin.ModelAdmin):
    list_display = (
        "phone_number",
        "is_opted_in",
        "sequence_day",
        "sequence_completed",
        "opted_in_at",
        "last_interaction_at",
        "referral_code",
    )
    list_filter = ("is_opted_in", "sequence_completed")
    search_fields = ("phone_number", "referral_code")
    readonly_fields = ("opted_in_at", "opted_out_at", "last_interaction_at", "created_at")
    ordering = ("-last_interaction_at",)


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = (
        "contact",
        "direction",
        "message_type",
        "status",
        "short_body",
        "created_at",
    )
    list_filter = ("direction", "message_type", "status")
    search_fields = ("contact__phone_number", "body")
    readonly_fields = ("created_at", "delivered_at", "read_at")
    ordering = ("-created_at",)

    def short_body(self, obj):
        return obj.body[:80] + "…" if len(obj.body) > 80 else obj.body
    short_body.short_description = "Message"


@admin.register(WhatsAppBroadcast)
class WhatsAppBroadcastAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "broadcast_type",
        "sent_by",
        "recipient_count",
        "sent_count",
        "failed_count",
        "created_at",
        "completed_at",
    )
    list_filter = ("broadcast_type",)
    readonly_fields = ("created_at", "completed_at", "recipient_count", "sent_count", "failed_count")


@admin.register(WhatsAppDeliveryMetric)
class WhatsAppDeliveryMetricAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "messages_sent",
        "messages_delivered",
        "messages_read",
        "messages_failed",
        "delivery_rate_display",
        "read_rate_display",
        "new_opt_ins",
        "opt_outs",
    )
    ordering = ("-date",)

    def delivery_rate_display(self, obj):
        rate = obj.delivery_rate
        colour = "#2e7d32" if rate >= 90 else "#f57c00" if rate >= 70 else "#c62828"
        return format_html('<span style="color:{}">{:.1f}%</span>', colour, rate)
    delivery_rate_display.short_description = "Delivery Rate"

    def read_rate_display(self, obj):
        rate = obj.read_rate
        colour = "#2e7d32" if rate >= 50 else "#f57c00" if rate >= 25 else "#c62828"
        return format_html('<span style="color:{}">{:.1f}%</span>', colour, rate)
    read_rate_display.short_description = "Read Rate"

from rest_framework import serializers

from .models import WhatsAppBroadcast, WhatsAppContact, WhatsAppDeliveryMetric


class WhatsAppContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppContact
        fields = [
            "id",
            "phone_number",
            "is_opted_in",
            "opted_in_at",
            "opted_out_at",
            "last_interaction_at",
            "sequence_day",
            "sequence_completed",
            "referral_code",
            "created_at",
        ]
        read_only_fields = fields


class WhatsAppBroadcastCreateSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4096)
    broadcast_type = serializers.ChoiceField(
        choices=WhatsAppBroadcast.BroadcastType.choices,
        default=WhatsAppBroadcast.BroadcastType.GENERAL,
    )


class WhatsAppDeliveryMetricSerializer(serializers.ModelSerializer):
    delivery_rate = serializers.FloatField(read_only=True)
    read_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = WhatsAppDeliveryMetric
        fields = [
            "date",
            "messages_sent",
            "messages_delivered",
            "messages_read",
            "messages_failed",
            "new_opt_ins",
            "opt_outs",
            "keyword_interactions",
            "delivery_rate",
            "read_rate",
        ]

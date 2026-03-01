from rest_framework import serializers

from apps.prayer.models import PrayerRequest


class PrayerRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrayerRequest
        fields = ["id", "user", "title", "description", "is_public", "prayer_count", "created_at"]
        read_only_fields = ["id", "user", "prayer_count", "created_at"]

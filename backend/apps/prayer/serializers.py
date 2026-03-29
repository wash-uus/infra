from rest_framework import serializers

from apps.prayer.models import PrayerRequest


class PrayerRequestSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.user_id == request.user.id
        return False

    def get_author_name(self, obj):
        return obj.user.full_name or obj.user.username if obj.user_id else ""

    class Meta:
        model = PrayerRequest
        fields = [
            "id", "user", "author_name", "title", "description", "is_public",
            "status", "rejection_reason", "prayer_count", "is_owner", "created_at",
        ]
        read_only_fields = [
            "id", "user", "prayer_count", "is_owner", "created_at",
            "status", "rejection_reason",
        ]

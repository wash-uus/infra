from rest_framework import serializers

from apps.hubs.models import HubMembership, RevivalHub


class RevivalHubSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevivalHub
        fields = [
            "id",
            "name",
            "country",
            "city",
            "description",
            "leader",
            "status",
            "meeting_schedule",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]


class HubMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = HubMembership
        fields = ["id", "user", "hub", "joined_at"]
        read_only_fields = ["id", "user", "joined_at"]

from rest_framework import serializers

from apps.hubs.models import HubMembership, RevivalHub


class RevivalHubSerializer(serializers.ModelSerializer):
    is_member = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    def get_is_member(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return HubMembership.objects.filter(user=request.user, hub=obj).exists()
        return False

    def get_member_count(self, obj):
        return obj.memberships.count()

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
            "is_member",
            "member_count",
        ]
        read_only_fields = ["id", "status", "created_at"]


class HubMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = HubMembership
        fields = ["id", "user", "hub", "joined_at"]
        read_only_fields = ["id", "user", "joined_at"]

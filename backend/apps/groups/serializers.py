from rest_framework import serializers

from apps.groups.models import GroupMembership, RevivalGroup


class RevivalGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    is_member = serializers.SerializerMethodField()

    def get_is_member(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.members.filter(pk=request.user.pk).exists()
        return False

    class Meta:
        model = RevivalGroup
        fields = ["id", "name", "slug", "description", "privacy", "moderators", "member_count", "is_member", "created_at"]
        read_only_fields = ["id", "created_at"]


class GroupMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupMembership
        fields = ["id", "user", "group", "joined_at"]
        read_only_fields = ["id", "user", "joined_at"]

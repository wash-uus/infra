from rest_framework import serializers

from apps.groups.models import GroupJoinRequest, GroupMembership, RevivalGroup


class RevivalGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    is_member = serializers.SerializerMethodField()
    pending_request = serializers.SerializerMethodField()

    def get_is_member(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.members.filter(pk=request.user.pk).exists()
        return False

    def get_pending_request(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return GroupJoinRequest.objects.filter(
                user=request.user, group=obj, status=GroupJoinRequest.Status.PENDING
            ).exists()
        return False

    class Meta:
        model = RevivalGroup
        fields = ["id", "name", "slug", "description", "privacy", "moderators", "member_count", "is_member", "pending_request", "created_at"]
        read_only_fields = ["id", "created_at"]


class GroupMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupMembership
        fields = ["id", "user", "group", "joined_at"]
        read_only_fields = ["id", "user", "joined_at"]


class GroupJoinRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = GroupJoinRequest
        fields = ["id", "user", "user_email", "user_name", "group", "group_name", "status", "note", "created_at", "reviewed_at"]
        read_only_fields = ["id", "user", "status", "created_at", "reviewed_at"]

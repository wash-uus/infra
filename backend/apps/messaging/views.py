from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.messaging.models import DirectMessage, GroupMessage
from apps.messaging.serializers import DirectMessageSerializer, GroupMessageSerializer


class DirectMessageViewSet(viewsets.ModelViewSet):
    serializer_class = DirectMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            DirectMessage.objects.filter(sender=user, is_deleted=False)
            | DirectMessage.objects.filter(receiver=user, is_deleted=False)
        )

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own messages.")
        msg.is_deleted = True
        msg.save(update_fields=["is_deleted"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupMessageViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["group"]

    def get_queryset(self):
        user = self.request.user
        return GroupMessage.objects.filter(group__members=user, is_deleted=False)

    def perform_create(self, serializer):
        from apps.groups.models import GroupMembership
        user = self.request.user
        group = serializer.validated_data.get("group")
        if not GroupMembership.objects.filter(user=user, group=group).exists():
            raise PermissionDenied("You are not a member of this group.")
        serializer.save(sender=user)

    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own messages.")
        msg.is_deleted = True
        msg.save(update_fields=["is_deleted"])
        return Response(status=status.HTTP_204_NO_CONTENT)

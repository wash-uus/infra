from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsModeratorOrAbove
from apps.groups.models import GroupMembership, RevivalGroup
from apps.groups.serializers import RevivalGroupSerializer


class RevivalGroupViewSet(viewsets.ModelViewSet):
    queryset = RevivalGroup.objects.prefetch_related("members", "moderators").all()
    serializer_class = RevivalGroupSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ["name", "description"]
    filterset_fields = ["privacy"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsModeratorOrAbove()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        group = self.get_object()
        if group.privacy == RevivalGroup.Privacy.PRIVATE and request.user not in group.moderators.all():
            return Response({"detail": "This is a private group"}, status=status.HTTP_403_FORBIDDEN)
        GroupMembership.objects.get_or_create(user=request.user, group=group)
        return Response({"detail": "Joined group"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        group = self.get_object()
        GroupMembership.objects.filter(user=request.user, group=group).delete()
        return Response({"detail": "Left group"})

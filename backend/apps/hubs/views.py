from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminOrAbove
from apps.hubs.models import HubMembership, RevivalHub
from apps.hubs.serializers import RevivalHubSerializer


class RevivalHubViewSet(viewsets.ModelViewSet):
    serializer_class = RevivalHubSerializer
    filterset_fields = ["status", "country", "city"]
    search_fields = ["name", "description", "country", "city"]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role in {"admin", "super_admin", "moderator"}:
            return RevivalHub.objects.all()
        return RevivalHub.objects.filter(status=RevivalHub.Status.APPROVED)

    def get_permissions(self):
        if self.action in ["approve", "assign_leader", "destroy"]:
            return [IsAdminOrAbove()]
        if self.action in ["create", "join"]:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrAbove])
    def approve(self, request, pk=None):
        hub = self.get_object()
        hub.status = RevivalHub.Status.APPROVED
        hub.save(update_fields=["status"])
        return Response({"detail": "Hub approved"})

    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrAbove])
    def assign_leader(self, request, pk=None):
        hub = self.get_object()
        leader_id = request.data.get("leader")
        hub.leader_id = leader_id
        hub.save(update_fields=["leader"])
        return Response({"detail": "Leader assigned"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        hub = self.get_object()
        HubMembership.objects.get_or_create(user=request.user, hub=hub)
        return Response({"detail": "Joined hub", "is_member": True})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        hub = self.get_object()
        HubMembership.objects.filter(user=request.user, hub=hub).delete()
        return Response({"detail": "Left hub", "is_member": False})

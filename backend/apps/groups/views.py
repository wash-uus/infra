from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminOrAbove, IsModeratorOrAbove
from apps.groups.models import GroupJoinRequest, GroupMembership, RevivalGroup
from apps.groups.serializers import GroupJoinRequestSerializer, RevivalGroupSerializer

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
        # Already a member?
        if GroupMembership.objects.filter(user=request.user, group=group).exists():
            return Response({"detail": "Already a member"}, status=status.HTTP_200_OK)

        if group.privacy == RevivalGroup.Privacy.PRIVATE and request.user not in group.moderators.all():
            # Create a join request instead of adding directly
            obj, created = GroupJoinRequest.objects.get_or_create(
                user=request.user, group=group,
                defaults={"note": request.data.get("note", "")}
            )
            if not created and obj.status == GroupJoinRequest.Status.REJECTED:
                # Allow re-applying after rejection
                obj.status = GroupJoinRequest.Status.PENDING
                obj.note = request.data.get("note", obj.note)
                obj.save(update_fields=["status", "note"])
            if obj.status == GroupJoinRequest.Status.PENDING:
                return Response({"detail": "Join request submitted. Awaiting admin approval."}, status=status.HTTP_201_CREATED)
            return Response({"detail": "You already have a pending request for this group."}, status=status.HTTP_200_OK)

        GroupMembership.objects.get_or_create(user=request.user, group=group)
        return Response({"detail": "Joined group"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        group = self.get_object()
        GroupMembership.objects.filter(user=request.user, group=group).delete()
        # Cancel pending request too
        GroupJoinRequest.objects.filter(user=request.user, group=group, status=GroupJoinRequest.Status.PENDING).delete()
        return Response({"detail": "Left group"})


# ─────────────────────────────────────────────────────────────────────────────
# Standalone join-request management views  (Moderator+)
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework.decorators import api_view, permission_classes as perm_classes


@api_view(["GET"])
@perm_classes([IsModeratorOrAbove])
def list_join_requests_view(request):
    """GET /api/groups/join-requests/ — list all pending join requests."""
    group_id = request.query_params.get("group")
    qs = GroupJoinRequest.objects.filter(status=GroupJoinRequest.Status.PENDING).select_related("user", "group")
    if group_id:
        qs = qs.filter(group_id=group_id)
    serializer = GroupJoinRequestSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@perm_classes([IsModeratorOrAbove])
def approve_join_request_view(request, req_id):
    """POST /api/groups/join-requests/<id>/approve/ — approve a join request."""
    try:
        join_req = GroupJoinRequest.objects.get(id=req_id, status=GroupJoinRequest.Status.PENDING)
    except GroupJoinRequest.DoesNotExist:
        return Response({"detail": "Request not found or already resolved."}, status=404)
    GroupMembership.objects.get_or_create(user=join_req.user, group=join_req.group)
    join_req.status = GroupJoinRequest.Status.APPROVED
    join_req.reviewed_by = request.user
    join_req.reviewed_at = timezone.now()
    join_req.save(update_fields=["status", "reviewed_by", "reviewed_at"])
    return Response({"detail": f"{join_req.user.email} approved and added to {join_req.group.name}."})


@api_view(["POST"])
@perm_classes([IsModeratorOrAbove])
def reject_join_request_view(request, req_id):
    """POST /api/groups/join-requests/<id>/reject/ — reject a join request."""
    try:
        join_req = GroupJoinRequest.objects.get(id=req_id, status=GroupJoinRequest.Status.PENDING)
    except GroupJoinRequest.DoesNotExist:
        return Response({"detail": "Request not found or already resolved."}, status=404)
    join_req.status = GroupJoinRequest.Status.REJECTED
    join_req.reviewed_by = request.user
    join_req.reviewed_at = timezone.now()
    join_req.save(update_fields=["status", "reviewed_by", "reviewed_at"])
    return Response({"detail": f"Request from {join_req.user.email} rejected."})

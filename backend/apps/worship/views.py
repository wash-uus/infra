from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminOrAbove
from apps.worship.models import TeamJoinRequest, WorshipMember, WorshipTeam, WorshipTrack
from apps.worship.serializers import (
    TeamJoinRequestSerializer,
    WorshipMemberSerializer,
    WorshipTeamSerializer,
    WorshipTrackSerializer,
)


class WorshipTeamViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only team listing. Admins can update via Django Admin.
    Public endpoint — no authentication required.
    """

    queryset = WorshipTeam.objects.filter(is_active=True).prefetch_related(
        "members", "tracks"
    )
    serializer_class = WorshipTeamSerializer
    permission_classes = [permissions.AllowAny]


class WorshipMemberViewSet(viewsets.ReadOnlyModelViewSet):
    """List active worship team members, optionally filtered by role."""

    serializer_class = WorshipMemberSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["role", "team"]
    search_fields = ["display_name", "instrument", "bio"]

    def get_queryset(self):
        return WorshipMember.objects.filter(is_active=True).select_related("team")


class WorshipTrackViewSet(viewsets.ReadOnlyModelViewSet):
    """Published worship tracks. Admins manage via Django Admin."""

    serializer_class = WorshipTrackSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["team"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        return WorshipTrack.objects.filter(is_published=True).select_related("team").prefetch_related(
            "featured_members"
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def play(self, request, pk=None):
        """Increment play count."""
        track = self.get_object()
        WorshipTrack.objects.filter(pk=track.pk).update(play_count=track.play_count + 1)
        return Response({"play_count": track.play_count + 1}, status=status.HTTP_200_OK)


class TeamJoinRequestViewSet(viewsets.GenericViewSet):
    """
    POST   /worship/join/   — anyone can submit a join request
    GET    /worship/join/   — admins only, to review requests
    PATCH  /worship/join/{id}/review/ — admin approves/rejects
    """

    serializer_class = TeamJoinRequestSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "review"]:
            return [IsAdminOrAbove()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return TeamJoinRequest.objects.select_related("team").all()

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Attach logged-in user if present
        user = request.user if request.user.is_authenticated else None
        serializer.save(user=user)
        return Response(
            {"detail": "Your request has been submitted! The team will be in touch soon. 🙌"},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request):
        qs = self.get_queryset()
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        instance = self.get_object()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["patch"])
    def review(self, request, pk=None):
        """Admin approves or rejects a join request."""
        from django.utils import timezone
        instance = self.get_object()
        new_status = request.data.get("status")
        if new_status not in [TeamJoinRequest.Status.APPROVED, TeamJoinRequest.Status.REJECTED]:
            return Response({"detail": "status must be 'approved' or 'rejected'"}, status=400)
        instance.status = new_status
        instance.admin_note = request.data.get("admin_note", "")
        instance.reviewed_at = timezone.now()
        instance.save(update_fields=["status", "admin_note", "reviewed_at"])
        return Response({"detail": f"Request {new_status}."})

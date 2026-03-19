from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.groups.models import GroupMembership
from apps.messaging.models import (
    DirectMessage,
    GroupMessage,
    GroupMessageReadReceipt,
    MAX_MESSAGE_LENGTH,
)
from apps.messaging.serializers import DirectMessageSerializer, GroupMessageSerializer


class DirectMessageViewSet(viewsets.ModelViewSet):
    """CRUD for direct (1-to-1) messages plus conversation helpers."""

    serializer_class = DirectMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ------------------------------------------------------------------
    # Queryset helpers
    # ------------------------------------------------------------------

    def _base_qs(self):
        user = self.request.user
        return (
            DirectMessage.objects
            .filter(Q(sender=user) | Q(receiver=user), is_deleted=False)
            .select_related("sender", "receiver")
        )

    def get_queryset(self):
        qs = self._base_qs().order_by("timestamp")

        interlocutor = self.request.query_params.get("interlocutor")
        if interlocutor:
            user = self.request.user
            qs = qs.filter(
                Q(sender=user, receiver_id=interlocutor)
                | Q(sender_id=interlocutor, receiver=user)
            )

        since = self.request.query_params.get("since")
        if since:
            dt = parse_datetime(since)
            if dt:
                qs = qs.filter(timestamp__gt=dt)

        return qs

    # ------------------------------------------------------------------
    # List: conversations view vs filtered thread
    # ------------------------------------------------------------------

    def list(self, request, *args, **kwargs):
        # With a filter param → standard paginated list (thread / poll)
        if request.query_params.get("interlocutor") or request.query_params.get("since"):
            return super().list(request, *args, **kwargs)
        # No filter → return conversation summary (latest msg per partner)
        return self._conversations_response(request)

    def _conversations_response(self, request):
        user = request.user
        all_msgs = self._base_qs().order_by("-timestamp")
        seen, conversations = set(), []
        for dm in all_msgs:
            partner_id = dm.receiver_id if dm.sender_id == user.id else dm.sender_id
            if partner_id not in seen:
                seen.add(partner_id)
                conversations.append(dm)
        serializer = self.get_serializer(conversations, many=True)
        return Response({"results": serializer.data, "count": len(conversations)})

    # ------------------------------------------------------------------
    # Create / destroy
    # ------------------------------------------------------------------

    def perform_create(self, serializer):
        text = serializer.validated_data.get("text", "")
        if len(text) > MAX_MESSAGE_LENGTH:
            raise ValidationError({"text": f"Message exceeds {MAX_MESSAGE_LENGTH} characters."})
        serializer.save(sender=self.request.user)

    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own messages.")
        msg.is_deleted = True
        msg.save(update_fields=["is_deleted"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------
    # Extra actions
    # ------------------------------------------------------------------

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        """Mark all messages from a given sender as read (called after opening a thread)."""
        sender_id = request.data.get("sender_id")
        if not sender_id:
            return Response({"error": "sender_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        updated = DirectMessage.objects.filter(
            receiver=request.user,
            sender_id=sender_id,
            is_read=False,
            is_deleted=False,
        ).update(is_read=True)
        return Response({"marked_read": updated})


class GroupMessageViewSet(viewsets.ModelViewSet):
    """CRUD for group messages plus read-receipt tracking."""

    serializer_class = GroupMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = (
            GroupMessage.objects
            .filter(group__members=user, is_deleted=False)
            .select_related("sender", "group")
            .order_by("timestamp")
        )

        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_id=group_id)

        since = self.request.query_params.get("since")
        if since:
            dt = parse_datetime(since)
            if dt:
                qs = qs.filter(timestamp__gt=dt)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        group = serializer.validated_data.get("group")
        if not GroupMembership.objects.filter(user=user, group=group).exists():
            raise PermissionDenied("You are not a member of this group.")
        text = serializer.validated_data.get("text", "")
        if len(text) > MAX_MESSAGE_LENGTH:
            raise ValidationError({"text": f"Message exceeds {MAX_MESSAGE_LENGTH} characters."})
        serializer.save(sender=user)

    def destroy(self, request, *args, **kwargs):
        msg = self.get_object()
        if msg.sender != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own messages.")
        msg.is_deleted = True
        msg.save(update_fields=["is_deleted"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        """Update the last-read timestamp for a group (upsert)."""
        group_id = request.data.get("group_id")
        if not group_id:
            return Response({"error": "group_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not GroupMembership.objects.filter(user=request.user, group_id=group_id).exists():
            return Response({"error": "Not a member of this group."}, status=status.HTTP_403_FORBIDDEN)
        GroupMessageReadReceipt.objects.update_or_create(
            user=request.user,
            group_id=group_id,
            defaults={"last_read_at": timezone.now()},
        )
        return Response({"ok": True})


class UnreadCountView(APIView):
    """
    GET /api/messaging/unread-count/
    Returns { "dm": N, "group": N, "total": N } for the authenticated user.
    Used by the nav badge to show a notification dot.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        dm_unread = DirectMessage.objects.filter(
            receiver=user, is_read=False, is_deleted=False
        ).count()

        receipts = {
            r.group_id: r.last_read_at
            for r in GroupMessageReadReceipt.objects.filter(user=user)
        }
        user_group_ids = list(
            GroupMembership.objects.filter(user=user).values_list("group_id", flat=True)
        )
        group_unread = 0
        for gid in user_group_ids:
            qs = GroupMessage.objects.filter(group_id=gid, is_deleted=False).exclude(sender=user)
            last_read = receipts.get(gid)
            if last_read:
                qs = qs.filter(timestamp__gt=last_read)
            group_unread += qs.count()

        return Response({
            "dm": dm_unread,
            "group": group_unread,
            "total": dm_unread + group_unread,
        })

"""
Common API views:
  - NotificationListView  — authenticated users
  - AuditLogListView      — admin/super_admin only
  - ContentReviewListView — admin/super_admin
  - ReviewActionView      — admin/super_admin
  - AppealCreateView      — authenticated users
  - AppealReviewView      — admin/super_admin
"""
from django.db import models
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrAbove, IsModeratorOrAbove
from apps.common.models import Announcement, AuditLog, AppealRequest, ContentReview, Notification
from apps.common.serializers import (
    AnnouncementSerializer,
    AppealRequestSerializer,
    AuditLogSerializer,
    ContentReviewSerializer,
    NotificationSerializer,
    ReviewActionSerializer,
)
from apps.common.utils import get_client_ip, log_action, send_notification


# ── Announcements ────────────────────────────────────────────────────────────

class AnnouncementPublicListView(APIView):
    """Return active, non-expired announcements. Public — no auth required."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        qs = Announcement.objects.filter(is_active=True).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        )
        return Response({"results": AnnouncementSerializer(qs, many=True).data})


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """Return the current user's notifications; mark as read with PATCH."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def patch(self, request):
        """Mark all notifications as read."""
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All marked as read"})


class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread": count})


# ── Audit Logs ────────────────────────────────────────────────────────────────

class AuditLogListView(generics.ListAPIView):
    """Admin/super_admin: paginated audit log with optional actor filter."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminOrAbove]

    def get_queryset(self):
        qs = AuditLog.objects.filter(archived=False)
        actor_id = self.request.query_params.get("actor_id")
        action = self.request.query_params.get("action")
        if actor_id:
            qs = qs.filter(actor_id=actor_id)
        if action:
            qs = qs.filter(action__icontains=action)
        return qs


# ── Content Review ────────────────────────────────────────────────────────────

class ContentReviewListView(generics.ListAPIView):
    """Admin/super_admin: list items in review queue."""
    serializer_class = ContentReviewSerializer
    permission_classes = [IsAdminOrAbove]

    def get_queryset(self):
        status_filter = self.request.query_params.get("status", "pending")
        target_type = self.request.query_params.get("type")
        qs = ContentReview.objects.all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if target_type:
            qs = qs.filter(target_type=target_type)
        return qs


class ReviewActionView(APIView):
    """Admin/super_admin: approve or reject a review queue item."""
    permission_classes = [IsAdminOrAbove]

    def post(self, request, pk):
        review = ContentReview.objects.filter(pk=pk).first()
        if not review:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if review.status != "pending":
            return Response({"detail": "Already reviewed"}, status=status.HTTP_400_BAD_REQUEST)

        ser = ReviewActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action = ser.validated_data["action"]
        reason = ser.validated_data.get("reason", "")

        review.reviewer = request.user
        review.reviewed_at = timezone.now()

        if action == "approve":
            review.status = "approved"
            # Activate the target object
            self._set_target_status(review, "published")
            notif_type = "approved"
            msg = f"Your {review.target_type} submission has been approved and is now live."
        else:
            if not reason:
                return Response({"detail": "Reason required for rejection"},
                                status=status.HTTP_400_BAD_REQUEST)
            review.status = "rejected"
            review.reason = reason
            self._set_target_status(review, "rejected")
            notif_type = "rejected"
            msg = f"Your {review.target_type} submission was rejected. Reason: {reason}"

        review.save()

        if review.submitter:
            send_notification(
                recipient=review.submitter,
                title=f"Submission {review.status.capitalize()}",
                message=msg,
                notif_type=notif_type,
                link=f"/{review.target_type}/{review.target_id}",
            )

        log_action(
            actor=request.user,
            action=f"review_{action}",
            target_model=review.target_type,
            target_id=review.target_id,
            detail=reason,
            ip=get_client_ip(request),
        )

        return Response(ContentReviewSerializer(review).data)

    @staticmethod
    def _set_target_status(review, new_status):
        """Update the real object's status field based on review."""
        try:
            if review.target_type == "content":
                from apps.content.models import ContentItem  # noqa
                ContentItem.objects.filter(pk=review.target_id).update(status=new_status)
            elif review.target_type == "hub":
                from apps.hubs.models import RevivalHub  # noqa
                final = "active" if new_status == "published" else "rejected"
                RevivalHub.objects.filter(pk=review.target_id).update(status=final)
        except Exception:
            pass


# ── Appeals ───────────────────────────────────────────────────────────────────

class AppealCreateView(generics.CreateAPIView):
    serializer_class = AppealRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(appellant=self.request.user)


class AppealListView(generics.ListAPIView):
    """Admin/super_admin: list pending appeals."""
    serializer_class = AppealRequestSerializer
    permission_classes = [IsAdminOrAbove]

    def get_queryset(self):
        status_filter = self.request.query_params.get("status", "pending")
        return AppealRequest.objects.filter(status=status_filter)


class AppealResolveView(APIView):
    """Admin/super_admin: resolve an appeal."""
    permission_classes = [IsAdminOrAbove]

    def post(self, request, pk):
        appeal = AppealRequest.objects.filter(pk=pk).first()
        if not appeal:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if appeal.status != "pending":
            return Response({"detail": "Already resolved"}, status=status.HTTP_400_BAD_REQUEST)

        decision = request.data.get("decision")  # "upheld" or "overturned"
        note = request.data.get("note", "")
        if decision not in ("upheld", "overturned"):
            return Response({"detail": "decision must be 'upheld' or 'overturned'"},
                            status=status.HTTP_400_BAD_REQUEST)

        appeal.status = decision
        appeal.admin_note = note
        appeal.resolved_by = request.user
        appeal.resolved_at = timezone.now()
        appeal.save()

        send_notification(
            recipient=appeal.appellant,
            title="Your Appeal Has Been Resolved",
            message=f"Decision: {decision.capitalize()}. {note}",
            notif_type="appeal",
        )
        log_action(actor=request.user, action=f"appeal_{decision}",
                   target_model="appeal", target_id=appeal.pk,
                   ip=get_client_ip(request))

        return Response(AppealRequestSerializer(appeal).data)

from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import IsModeratorOrAbove
from apps.common.utils import log_action, send_notification
from apps.prayer.models import PrayerRequest
from apps.prayer.serializers import PrayerRequestSerializer


def _notify_prayer_outcome(prayer, approved: bool, reason: str = "") -> None:
    """Fire in-app notification + email when a prayer request is approved or rejected."""
    user = prayer.user
    if approved:
        notif_title = "Your prayer request is live ✓"
        notif_msg = f'Your request "{prayer.title}" has been approved and is now on the prayer wall.'
        notif_type = "approved"
        email_subject = "Your prayer request is now live — Spirit Revival Africa"
        email_body = (
            f"Hi {user.first_name or 'there'},\n\n"
            f"Your prayer request has been approved and is now visible on the prayer wall.\n\n"
            f'"{prayer.title}"\n\n'
            f"The community will begin interceding with you. You will see the prayer count rise as "
            f"brothers and sisters stand with you in faith.\n\n"
            f"Visit the prayer wall: {django_settings.FRONTEND_URL}/prayer\n\n"
            f"— Spirit Revival Africa"
        )
    else:
        notif_title = "Update on your prayer request"
        notif_msg = (
            f'Your request "{prayer.title}" was not approved.'
            + (f" Reason: {reason}" if reason else "")
        )
        notif_type = "rejected"
        email_subject = "Update on your prayer request — Spirit Revival Africa"
        email_body = (
            f"Hi {user.first_name or 'there'},\n\n"
            f"Your prayer request could not be approved at this time.\n\n"
            f'Request: "{prayer.title}"\n'
            + (f"Reason: {reason}\n\n" if reason else "\n")
            + f"You're welcome to revise and resubmit. If you believe this is an error, reply to this email.\n\n"
            f"— Spirit Revival Africa"
        )

    send_notification(user, notif_title, notif_msg, notif_type=notif_type, link="/prayer")

    if user.email:
        try:
            send_mail(
                email_subject,
                email_body,
                django_settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        except Exception:
            pass


class PrayerRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PrayerRequestSerializer
    search_fields = ["title", "description"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "share"]:
            return [permissions.AllowAny()]
        if self.action in ["approve", "reject"]:
            return [IsModeratorOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.is_staff or getattr(user, "role", "") in {"moderator", "admin", "super_admin"}:
                # Admins/moderators see everything
                status_filter = self.request.query_params.get("status")
                qs = PrayerRequest.objects.select_related("user", "reviewed_by").all()
                if status_filter:
                    qs = qs.filter(status=status_filter)
                return qs
            # Authenticated regular users: see approved public + own requests (any status)
            return PrayerRequest.objects.filter(
                Q(is_public=True, status=PrayerRequest.Status.APPROVED) | Q(user=user)
            ).select_related("user")
        # Anonymous: only approved public
        return PrayerRequest.objects.filter(
            is_public=True, status=PrayerRequest.Status.APPROVED
        ).select_related("user")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status=PrayerRequest.Status.PENDING)

    def _check_owner(self, instance):
        if instance.user_id != self.request.user.id:
            raise PermissionDenied("You can only modify your own prayer requests.")

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        # Editing resets to pending so admin re-reviews
        serializer.save(status=PrayerRequest.Status.PENDING, reviewed_by=None, reviewed_at=None)

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def approve(self, request, pk=None):
        prayer = self.get_object()
        prayer.status = PrayerRequest.Status.APPROVED
        prayer.rejection_reason = ""
        prayer.reviewed_by = request.user
        prayer.reviewed_at = timezone.now()
        prayer.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"])
        log_action(request.user, "prayer.approve", "PrayerRequest", prayer.pk,
                   detail=prayer.title)
        _notify_prayer_outcome(prayer, approved=True)
        return Response({"detail": "Prayer request approved and is now live."})

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def reject(self, request, pk=None):
        prayer = self.get_object()
        reason = request.data.get("reason", "")
        prayer.status = PrayerRequest.Status.REJECTED
        prayer.rejection_reason = reason
        prayer.reviewed_by = request.user
        prayer.reviewed_at = timezone.now()
        prayer.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at"])
        log_action(request.user, "prayer.reject", "PrayerRequest", prayer.pk,
                   detail=f"{prayer.title} | reason: {reason}")
        _notify_prayer_outcome(prayer, approved=False, reason=reason)
        return Response({"detail": "Prayer request rejected. User has been notified."})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def prayed(self, request, pk=None):
        prayer = self.get_object()
        if prayer.status != PrayerRequest.Status.APPROVED or not prayer.is_public:
            return Response({"detail": "This prayer request is not available for public prayer yet."}, status=400)
        if request.user not in prayer.prayed_by.all():
            prayer.prayed_by.add(request.user)
            PrayerRequest.objects.filter(pk=prayer.pk).update(prayer_count=F("prayer_count") + 1)
            prayer.refresh_from_db(fields=["prayer_count"])
        return Response({"prayer_count": prayer.prayer_count})

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def share(self, request, pk=None):
        """Return structured share card data for social / WhatsApp / email sharing."""
        prayer = self.get_object()
        if prayer.status != PrayerRequest.Status.APPROVED or not prayer.is_public:
            return Response({"detail": "This request is not publicly shareable."}, status=404)
        frontend_url = getattr(django_settings, "FRONTEND_URL", "https://spiritrevivalafrica.com")
        excerpt = prayer.description[:200].rstrip() + ("…" if len(prayer.description) > 200 else "")
        return Response({
            "title": prayer.title,
            "excerpt": excerpt,
            "url": f"{frontend_url}/prayer",
            "cta": "Stand in prayer → spiritrevivalafrica.com/prayer",
            "whatsapp_caption": (
                f"🙏 *Prayer Request — Spirit Revival Africa*\n\n"
                f"*{prayer.title}*\n\n"
                f"{excerpt}\n\n"
                f"Stand with us in prayer: {frontend_url}/prayer"
            ),
        })

"""
accounts/views.py — Auth + role-based dashboard API endpoints.
"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as _validate_password
from django.core import exceptions as django_exceptions
from django.core import signing
from django.core.mail import send_mail
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

logger = logging.getLogger(__name__)

from apps.accounts.permissions import (
    IsAdminOrAbove,
    IsModeratorOrAbove,
    IsSuperAdmin,
)
from apps.accounts.serializers import (
    AdminUserSerializer,
    EmailTokenObtainPairSerializer,
    EmailVerificationSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.common.utils import get_client_ip, log_action, send_notification
from apps.content.models import ContentItem
from apps.hubs.models import HubMembership, RevivalHub
from apps.prayer.models import PrayerRequest

User = get_user_model()


def _send_sms(to_phone: str, message: str, log_label: str = "SMS") -> None:
    """
    Send an SMS via Africa's Talking REST API.
    Uses only the `requests` library (already in requirements).
    Silently skips if AT_API_KEY / AT_USERNAME are not configured.
    """
    import requests as _requests

    api_key  = settings.AT_API_KEY
    username = settings.AT_USERNAME
    if not api_key or not username:
        logger.debug("%s skipped — Africa's Talking not configured", log_label)
        return

    # Normalise to E.164
    phone = to_phone.strip()
    if not phone.startswith("+"):
        phone = f"+{phone}"

    payload = {
        "username": username,
        "to":       phone,
        "message":  message,
    }
    sender_id = (settings.AT_SENDER_ID or "").strip()
    if sender_id:
        payload["from"] = sender_id

    env = "sandbox" if username == "sandbox" else "production"
    url = (
        "https://api.sandbox.africastalking.com/version1/messaging"
        if env == "sandbox"
        else "https://api.africastalking.com/version1/messaging"
    )
    try:
        resp = _requests.post(
            url,
            headers={"apiKey": api_key, "Accept": "application/json"},
            data=payload,
            timeout=10,
        )
        if resp.status_code != 201:
            logger.warning("%s: AT returned %s — %s", log_label, resp.status_code, resp.text[:200])
    except Exception:
        logger.exception("%s: request to Africa's Talking failed", log_label)


def _send_welcome_notifications(user) -> None:
    """Send a welcome SMS to a newly registered user (if phone is set)."""
    phone = (user.phone or "").strip()
    if not phone:
        return
    message = (
        f"Welcome to Spirit Revival Africa, {user.full_name or user.username}! "
        "Account created. Please verify your email then await admin approval. "
        "God bless you — SRA Team"
    )
    _send_sms(phone, message, log_label=f"WelcomeSMS user_id={user.id}")


# ════════════════════════════════════════════════════════════════════════════
# Auth
# ════════════════════════════════════════════════════════════════════════════

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()

        # ── Email verification ──────────────────────────────────────────────
        token = signing.dumps({"user_id": user.id})
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        try:
            send_mail(
                subject="Verify your Spirit Revival Africa account",
                message=(
                    f"Hi {user.full_name or user.username},\n\n"
                    f"Welcome to Spirit Revival Africa!\n\n"
                    f"Please verify your email address by clicking the link below:\n{verify_url}\n\n"
                    "If you didn't create this account, please ignore this email.\n\n"
                    "God bless you,\nThe SRA Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Verification email failed for user_id=%s", user.id)

        # ── Welcome SMS ─────────────────────────────────────────────────────
        _send_welcome_notifications(user)


class LoginThrottle(ScopedRateThrottle):
    """10 login attempts per minute per IP — prevents credential stuffing."""
    scope = "login"


class EmailLoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]
    serializer_class = EmailTokenObtainPairSerializer


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from apps.accounts.serializers import EmailVerificationSerializer as VS
        s = VS(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            payload = signing.loads(s.validated_data["token"], max_age=86400)
        except signing.BadSignature:
            return Response({"detail": "Invalid or expired token"}, status=400)
        user = User.objects.filter(id=payload.get("user_id")).first()
        if not user:
            return Response({"detail": "User not found"}, status=404)
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        return Response({"detail": "Email verified successfully"})


# ════════════════════════════════════════════════════════════════════════════
# Password Reset
# ════════════════════════════════════════════════════════════════════════════

class PasswordResetThrottle(AnonRateThrottle):
    """Strict per-IP rate limit for password reset requests."""
    rate = "5/hour"
    scope = "password_reset"


class PasswordResetRequestView(APIView):
    """Step 1 — send reset email (always returns 200 to prevent email enumeration)."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if email:
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if user:
                token = signing.dumps({"user_id": user.id, "purpose": "password_reset"})
                reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
                try:
                    send_mail(
                        subject="Reset your Spirit Revival Africa password",
                        message=(
                            f"Hi {user.username},\n\n"
                            f"Click the link below to reset your password (valid for 1 hour):\n{reset_url}\n\n"
                            "If you didn't request this, you can safely ignore this email."
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                except Exception:
                    logger.exception("Password reset email failed for user_id=%s", user.id)
            else:
                logger.warning("Password reset requested for unknown/inactive email: %s", email)
        return Response({"detail": "If that email is registered you will receive a reset link shortly."})


class PasswordResetConfirmView(APIView):
    """Step 2 — receive token + new password and save."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        if not token or not password:
            return Response({"detail": "token and password are required."}, status=400)
        try:
            _validate_password(password)
        except django_exceptions.ValidationError as exc:
            return Response({"detail": exc.messages}, status=400)
        try:
            payload = signing.loads(token, max_age=3600)  # 1-hour expiry
        except signing.SignatureExpired:
            return Response({"detail": "Reset link has expired. Please request a new one."}, status=400)
        except signing.BadSignature:
            return Response({"detail": "Invalid reset token."}, status=400)
        if payload.get("purpose") != "password_reset":
            return Response({"detail": "Invalid reset token."}, status=400)
        user = User.objects.filter(id=payload.get("user_id"), is_active=True).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        user.set_password(password)
        user.save(update_fields=["password"])
        # Invalidate all existing JWT sessions so old tokens can't be reused
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        return Response({"detail": "Password updated successfully. You can now sign in."})


# ════════════════════════════════════════════════════════════════════════════
# Profile  (all authenticated)
# ════════════════════════════════════════════════════════════════════════════

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# ════════════════════════════════════════════════════════════════════════════
# Member Dashboard
# ════════════════════════════════════════════════════════════════════════════

class MemberDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        prayer_qs = PrayerRequest.objects.filter(user=user)

        hub_membership = HubMembership.objects.filter(user=user).select_related("hub").first()

        try:
            from apps.groups.models import GroupMembership
            groups = list(GroupMembership.objects.filter(user=user).select_related("group").values(
                "group__id", "group__name", "joined_at"
            )[:20])
        except Exception:
            logger.exception("MemberDashboardView: failed to load groups for user %s", user.id)
            groups = []

        try:
            from apps.discipleship.models import UserLessonProgress
            progress = UserLessonProgress.objects.filter(user=user)
            completed = progress.filter(completed=True).count()
            total = progress.count()
        except Exception:
            logger.exception("MemberDashboardView: failed to load lesson progress for user %s", user.id)
            completed = total = 0

        return Response({
            "profile": UserSerializer(user, context={"request": request}).data,
            "prayer": {
                "total": prayer_qs.count(),
                "engagement": sum(p.prayer_count for p in prayer_qs),
                "recent": list(prayer_qs.values("id", "title", "prayer_count", "created_at")[:5]),
            },
            "groups": groups,
            "hub": {
                "id": hub_membership.hub.id if hub_membership else None,
                "name": hub_membership.hub.name if hub_membership else None,
                "city": hub_membership.hub.city if hub_membership else None,
            },
            "discipleship": {"completed": completed, "total": total},
            "content_submitted": ContentItem.objects.filter(author=user).count(),
        })


# ════════════════════════════════════════════════════════════════════════════
# Moderator Dashboard
# ════════════════════════════════════════════════════════════════════════════

class ModeratorStatsView(APIView):
    permission_classes = [IsModeratorOrAbove]

    def get(self, request):
        from apps.common.models import AuditLog, AppealRequest, ContentReview
        return Response({
            "pending_reviews": ContentReview.objects.filter(status="pending").count(),
            "pending_appeals": AppealRequest.objects.filter(status="pending").count(),
            "my_recent_actions": list(
                AuditLog.objects.filter(actor=request.user).values(
                    "action", "target_model", "target_id", "created_at"
                )[:15]
            ),
        })


# ════════════════════════════════════════════════════════════════════════════
# Hub Leader Dashboard
# ════════════════════════════════════════════════════════════════════════════

class HubLeaderStatsView(APIView):
    permission_classes = [IsModeratorOrAbove]

    def get(self, request):
        hub = RevivalHub.objects.filter(leader=request.user).first()
        if not hub:
            return Response({"hub": None, "members_total": 0, "members": []})
        members = list(
            HubMembership.objects.filter(hub=hub).select_related("user").values(
                "user__id", "user__username", "user__email", "joined_at"
            )[:100]
        )
        return Response({
            "hub": {
                "id": hub.id, "name": hub.name, "city": hub.city,
                "country": hub.country, "status": hub.status, "created_at": hub.created_at,
            },
            "members_total": HubMembership.objects.filter(hub=hub).count(),
            "members": members,
        })


# ════════════════════════════════════════════════════════════════════════════
# Admin Dashboard
# ════════════════════════════════════════════════════════════════════════════

class AdminStatsView(APIView):
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.common.models import AppealRequest, ContentReview
        return Response({
            "users": {
                "total": User.objects.count(),
                "verified": User.objects.filter(email_verified=True).count(),
                "by_role": list(User.objects.values("role").annotate(count=Count("id"))),
                "recent": list(User.objects.order_by("-date_joined").values(
                    "id", "username", "email", "role", "is_active", "date_joined")[:10]),
            },
            "content": {
                "total": ContentItem.objects.count(),
                "pending": ContentItem.objects.filter(approved=False).count(),
                "approved": ContentItem.objects.filter(approved=True).count(),
            },
            "hubs": {
                "total": RevivalHub.objects.count(),
                "pending": RevivalHub.objects.filter(status="pending").count(),
                "active": RevivalHub.objects.filter(status="approved").count(),
            },
            "prayer": {"total": PrayerRequest.objects.count()},
            "reviews": {
                "pending": ContentReview.objects.filter(status="pending").count(),
            },
            "appeals": {
                "pending": AppealRequest.objects.filter(status="pending").count(),
            },
        })


# ════════════════════════════════════════════════════════════════════════════
# Super Admin Dashboard
# ════════════════════════════════════════════════════════════════════════════

class SuperAdminStatsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        from apps.common.models import AuditLog, ContentReview, AppealRequest

        week_ago = timezone.now() - timedelta(days=7)

        # Audit entries with actor email flattened
        audit_qs = AuditLog.objects.select_related("actor").order_by("-created_at")[:25]
        recent_audit = [
            {
                "id": e.id,
                "actor_email": e.actor.email if e.actor else "—",
                "action": e.action,
                "target_model": e.target_model,
                "target_id": e.target_id,
                "ip_address": e.ip_address,
                "detail": e.detail,
                "created_at": e.created_at,
            }
            for e in audit_qs
        ]

        return Response({
            "platform": {
                "users": User.objects.count(),
                "active_users": User.objects.filter(is_active=True).count(),
                "hubs": RevivalHub.objects.count(),
                "content": ContentItem.objects.count(),
                "prayer": PrayerRequest.objects.count(),
            },
            "users_by_role": list(
                User.objects.values("role").annotate(count=Count("id"))
            ),
            "reviews": {
                "pending": ContentReview.objects.filter(status="pending").count(),
                "appeals": AppealRequest.objects.filter(status="pending").count(),
                "approved_week": ContentReview.objects.filter(
                    status="approved", reviewed_at__gte=week_ago
                ).count(),
                "rejected_week": ContentReview.objects.filter(
                    status="rejected", reviewed_at__gte=week_ago
                ).count(),
            },
            "recent_audit": recent_audit,
        })


# ════════════════════════════════════════════════════════════════════════════
# User Management  (Admin+)
# ════════════════════════════════════════════════════════════════════════════

class UserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminOrAbove]

    def get_queryset(self):
        qs = User.objects.all().order_by("-date_joined")
        q = self.request.query_params.get("q")
        role = self.request.query_params.get("role")
        active = self.request.query_params.get("active")
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(email__icontains=q) | Q(username__icontains=q))
        if role:
            qs = qs.filter(role=role)
        if active is not None:
            qs = qs.filter(is_active=(active.lower() == "true"))
        return qs


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminOrAbove]
    queryset = User.objects.all()


@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def promote_user_role(request, user_id):
    new_role = request.data.get("role")
    if new_role not in [c[0] for c in User.Role.choices]:
        return Response({"detail": "Invalid role"}, status=400)
    if new_role == "super_admin" and request.user.role != "super_admin":
        return Response({"detail": "Only super_admin can grant super_admin"}, status=403)
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=404)
    old_role = user.role
    user.role = new_role
    user.save(update_fields=["role"])
    log_action(actor=request.user, action="promote_user",
               target_model="user", target_id=user_id,
               detail=f"{old_role} → {new_role}", ip=get_client_ip(request))
    send_notification(user, "Your role has been updated",
                      f"Your role is now: {new_role}", notif_type="action")
    return Response({"detail": f"Role updated to {new_role}"})


@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def suspend_user(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=404)
    if user.role == "super_admin":
        return Response({"detail": "Cannot suspend super_admin"}, status=403)
    reason = request.data.get("reason", "Policy violation")
    user.is_active = False
    user.save(update_fields=["is_active"])
    log_action(actor=request.user, action="suspend_user",
               target_model="user", target_id=user_id,
               detail=reason, ip=get_client_ip(request))
    send_notification(user, "Account Suspended",
                      f"Your account has been suspended. Reason: {reason}",
                      notif_type="warning")
    return Response({"detail": "User suspended"})


@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def reactivate_user(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=404)
    user.is_active = True
    user.save(update_fields=["is_active"])
    log_action(actor=request.user, action="reactivate_user",
               target_model="user", target_id=user_id, ip=get_client_ip(request))
    send_notification(user, "Account Reactivated", "Your account is active again.",
                      notif_type="info")
    return Response({"detail": "User reactivated"})


@api_view(["GET"])
@permission_classes([IsAdminOrAbove])
def site_statistics(request):
    return AdminStatsView().get(request)


# ════════════════════════════════════════════════════════════════════════════
# Account Approval  (Admin+)
# ════════════════════════════════════════════════════════════════════════════

class PendingApprovalsView(generics.ListAPIView):
    """GET — list users who verified email but are awaiting admin approval."""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminOrAbove]

    def get_queryset(self):
        return User.objects.filter(is_approved=False, email_verified=True, is_active=True).order_by("date_joined")


@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def approve_user(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=404)
    user.is_approved = True
    user.save(update_fields=["is_approved"])
    log_action(actor=request.user, action="approve_user",
               target_model="user", target_id=user_id, ip=get_client_ip(request))
    send_notification(user, "Account Approved",
                      "Your Spirit Revival Africa account has been approved. Welcome to the movement!",
                      notif_type="info")
    try:
        send_mail(
            subject="Your Spirit Revival Africa account is approved!",
            message=(
                f"Hi {user.full_name or user.username},\n\n"
                "Great news — your account has been approved by our team.\n"
                "You can now sign in and join the revival movement!\n\n"
                f"Sign in here: {settings.FRONTEND_URL}/login\n\n"
                "God bless you,\nThe SRA Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        logger.exception("Approval email failed for user_id=%s", user_id)

    # Send approval SMS
    phone = (user.phone or "").strip()
    if phone:
        approval_text = (
            f"{user.full_name or user.username}, your Spirit Revival Africa account is now APPROVED! "
            f"Sign in: {settings.FRONTEND_URL}/login — SRA Team"
        )
        _send_sms(phone, approval_text, log_label=f"ApprovalSMS user_id={user_id}")

    return Response({"detail": "User approved"})


@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def reject_user(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=404)
    reason = request.data.get("reason", "Your account did not meet our membership requirements.")
    user.is_active = False
    user.save(update_fields=["is_active"])
    log_action(actor=request.user, action="reject_user",
               target_model="user", target_id=user_id,
               detail=reason, ip=get_client_ip(request))
    try:
        send_mail(
            subject="Spirit Revival Africa — Account Registration Update",
            message=(
                f"Hi {user.full_name or user.username},\n\n"
                f"Unfortunately we were unable to approve your account at this time.\n"
                f"Reason: {reason}\n\n"
                "If you believe this is a mistake, please contact us.\n\n"
                "God bless you,\nThe SRA Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        logger.exception("Rejection email failed for user_id=%s", user_id)
    return Response({"detail": "User rejected and deactivated"})


# ════════════════════════════════════════════════════════════════════════════
# Admin Messaging  (Admin+)
# ════════════════════════════════════════════════════════════════════════════

@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def admin_send_message(request, user_id):
    """POST — admin sends a direct message to a specific user."""
    from apps.messaging.models import DirectMessage
    target = User.objects.filter(id=user_id, is_active=True).first()
    if not target:
        return Response({"detail": "User not found"}, status=404)
    text = request.data.get("text", "").strip()
    if not text:
        return Response({"detail": "Message text is required."}, status=400)
    if len(text) > 4000:
        return Response({"detail": "Message exceeds 4000 characters."}, status=400)
    msg = DirectMessage.objects.create(sender=request.user, receiver=target, text=text)
    log_action(actor=request.user, action="admin_message_user",
               target_model="user", target_id=user_id,
               detail=f"Sent DM: {text[:80]}", ip=get_client_ip(request))
    send_notification(target, "New message from SRA Admin", text[:100], notif_type="info")
    return Response({"detail": "Message sent", "message_id": msg.id})


@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def admin_broadcast_message(request):
    """POST — admin sends a direct message to ALL active users at once."""
    from apps.messaging.models import DirectMessage
    text = request.data.get("text", "").strip()
    if not text:
        return Response({"detail": "Message text is required."}, status=400)
    if len(text) > 4000:
        return Response({"detail": "Message exceeds 4000 characters."}, status=400)

    sender = request.user
    recipients = User.objects.filter(is_active=True, is_approved=True).exclude(id=sender.id)
    batch = [
        DirectMessage(sender=sender, receiver=recipient, text=text)
        for recipient in recipients
    ]
    DirectMessage.objects.bulk_create(batch, batch_size=500, ignore_conflicts=False)
    count = len(batch)
    log_action(actor=request.user, action="admin_broadcast",
               target_model="user", target_id=None,
               detail=f"Broadcast to {count} users: {text[:80]}", ip=get_client_ip(request))
    return Response({"detail": f"Broadcast sent to {count} users."})


# ════════════════════════════════════════════════════════════════════════════
# Change Password  (authenticated users)
# ════════════════════════════════════════════════════════════════════════════

class ChangePasswordView(APIView):
    """POST {current_password, new_password} — changes password for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new_pw = request.data.get("new_password", "")
        if not current or not new_pw:
            return Response({"detail": "current_password and new_password are required."}, status=400)
        user = request.user
        if not user.check_password(current):
            return Response({"detail": "Current password is incorrect."}, status=400)
        try:
            _validate_password(new_pw, user=user)
        except django_exceptions.ValidationError as exc:
            return Response({"detail": exc.messages}, status=400)
        user.set_password(new_pw)
        user.save(update_fields=["password"])
        # Invalidate all active JWT sessions except implicitly — client must re-login.
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        return Response({"detail": "Password changed successfully. Please sign in again."})


# ════════════════════════════════════════════════════════════════════════════
# User Search  (authenticated users — for messaging/DM)
# ════════════════════════════════════════════════════════════════════════════

class UserSearchView(generics.ListAPIView):
    """GET /api/accounts/users/search/?q=<query> — returns matching active users."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        q = self.request.query_params.get("q", "").strip()
        if not q or len(q) < 2:
            return User.objects.none()
        return (
            User.objects.filter(is_active=True)
            .filter(
                Q(full_name__icontains=q)
                | Q(username__icontains=q)
                | Q(email__icontains=q)
            )
            .exclude(id=self.request.user.id)
            .order_by("full_name")[:20]
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = [
            {
                "id": u.id,
                "full_name": u.full_name or u.username,
                "username": u.username,
                "email": u.email,
                "profile_picture": (
                    request.build_absolute_uri(u.profile_picture.url)
                    if u.profile_picture
                    else None
                ),
            }
            for u in qs
        ]
        return Response(data)


# ════════════════════════════════════════════════════════════════════════════
# Google OAuth  — exchange a Google ID token for SRA JWT tokens
# ════════════════════════════════════════════════════════════════════════════

class GoogleAuthView(APIView):
    """
    POST { credential }  — credential is a Google ID token (JWT) issued by
    Google One Tap or the @react-oauth/google Sign-In button.

    Security model:
    - We verify the ID token cryptographically using google-auth library.
    - google-auth fetches Google's public JWK set, verifies the RS256
      signature, validates `aud` == GOOGLE_CLIENT_ID, and checks `exp`.
    - This prevents token substitution (tokens from other OAuth clients are
      rejected) and replay attacks (expired tokens are rejected locally).
    - We do NOT call Google's tokeninfo endpoint — that would mean trusting
      an opaque access_token whose `aud` could belong to any Google app.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        from rest_framework_simplejwt.tokens import RefreshToken
        import random, string as _string

        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            return Response({"detail": "Google login is not configured on this server."}, status=503)

        credential = request.data.get("credential", "").strip()
        if not credential:
            return Response({"detail": "No credential provided."}, status=400)

        # Cryptographically verify the Google ID token.
        # This raises ValueError for any verification failure.
        try:
            id_info = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            logger.warning("Google ID token verification failed: %s", exc)
            return Response({"detail": "Invalid or expired Google token."}, status=400)
        except Exception:
            logger.exception("Unexpected error verifying Google ID token")
            return Response({"detail": "Could not verify Google token."}, status=503)

        # id_info is now a verified dict with claims: sub, email, email_verified, name, ...
        if not id_info.get("email_verified"):
            return Response({"detail": "Google email is not verified."}, status=400)

        email = id_info.get("email", "").lower().strip()
        if not email:
            return Response({"detail": "Google account has no email address."}, status=400)

        # Find or create the SRA user
        user = User.objects.filter(email=email).first()
        if user is None:
            full_name = id_info.get("name", "") or email.split("@")[0]
            base = email.split("@")[0].lower()
            base = "".join(c if c.isalnum() or c == "_" else "_" for c in base)[:20] or "user"
            suffix = "".join(random.choices(_string.digits, k=4))
            username = f"{base}_{suffix}"
            attempt = 0
            while User.objects.filter(username=username).exists() and attempt < 10:
                suffix = "".join(random.choices(_string.digits, k=4))
                username = f"{base}_{suffix}"
                attempt += 1
            user = User.objects.create_user(
                email=email,
                username=username,
                full_name=full_name,
                password=None,  # no password — OAuth-only account
                email_verified=True,
                is_active=True,
            )
        elif not user.is_active:
            return Response({"detail": "This account has been suspended."}, status=403)

        # Issue SRA JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


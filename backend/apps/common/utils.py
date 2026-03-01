"""
Shared utility helpers for common app.
"""
from django.utils import timezone


def get_client_ip(request) -> str | None:
    """Extract real IP, respecting X-Forwarded-For."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_action(actor, action: str, target_model: str = "", target_id: str = "",
               detail: str = "", ip: str | None = None):
    """Write an AuditLog row. Import lazily to avoid circular imports."""
    from apps.common.models import AuditLog  # noqa: PLC0415
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_model=target_model,
        target_id=str(target_id) if target_id else "",
        detail=detail,
        ip_address=ip,
    )


def send_notification(recipient, title: str, message: str,
                      notif_type: str = "info", link: str = ""):
    """Create an in-app Notification row."""
    from apps.common.models import Notification  # noqa: PLC0415
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notif_type=notif_type,
        link=link,
    )

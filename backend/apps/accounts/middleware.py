"""
AuditLogMiddleware
------------------
Automatically writes an AuditLog entry for any *mutating* request
(POST, PUT, PATCH, DELETE) made by an authenticated user.
Non-mutating requests and anonymous users are ignored here;
sensitive views can call `log_action(...)` directly for finer control.
"""
from django.utils.deprecation import MiddlewareMixin

from apps.common.utils import get_client_ip, log_action


class AuditLogMiddleware(MiddlewareMixin):
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    def process_response(self, request, response):
        if request.method in self.SAFE_METHODS:
            return response
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return response
        # Only log 2xx responses (successful mutations)
        if not (200 <= response.status_code < 300):
            return response

        path = getattr(request, "path", "")
        log_action(
            actor=user,
            action=f"{request.method} {path}",
            ip=get_client_ip(request),
        )
        return response

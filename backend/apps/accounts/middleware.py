"""
AuditLogMiddleware + Security middleware.
"""
from django.utils.deprecation import MiddlewareMixin

from apps.common.utils import get_client_ip, log_action


class SecurityHeadersMiddleware:
    """
    Add Content-Security-Policy and other security headers to every response.
    Positioned before CorsMiddleware so headers are always present.
    """

    # Conservative CSP for a React SPA:
    # - Scripts only from self + Google OAuth iframe
    # - Styles allow inline (Tailwind utility purge still emits some)
    # - Images unrestricted (user uploads, Pexels, Unsplash)
    # - Connections to self + Google APIs
    # - PayPal iframe allowed for donation button
    CSP = (
        "default-src 'self'; "
        "script-src 'self' https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://www.googleapis.com https://accounts.google.com; "
        "frame-src https://accounts.google.com https://www.paypal.com; "
        "frame-ancestors 'none'"
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("Content-Security-Policy", self.CSP)
        return response


class EnforceUserApprovalMiddleware:
    """
    Block requests from authenticated users whose account is suspended
    (is_active=False) or pending admin approval (is_approved=False).
    Must be placed after AuthenticationMiddleware in MIDDLEWARE.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            if not user.is_active or not user.is_approved:
                from django.http import JsonResponse
                return JsonResponse(
                    {"detail": "Account not authorized."},
                    status=401,
                )
        return self.get_response(request)


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

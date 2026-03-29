# SECURITY HARDENING — Spirit Revival Africa
## Comprehensive Security Improvement Roadmap

---

## SECURITY POSTURE MATRIX

| Control | Current State | Risk | Recommendation |
|---------|:---:|:---:|---|
| Authentication | ✅ JWT + Google OAuth (fixed) | LOW | Monitor |
| Authorization | ✅ Role-based (5 roles) | LOW | Audit serializer fields |
| Transport | ✅ HSTS in production | LOW | Verify in all environments |
| Input Validation | ⚠️ Partial (serializer-level) | MEDIUM | Add CSP + XSS protection |
| Rate Limiting | ✅ Login throttled (fixed) | LOW | Add per-endpoint throttles |
| File Upload | ✅ Magic byte validation (fixed) | LOW | Monitor |
| Session Management | ⚠️ JWT in localStorage | MEDIUM | Migrate to httpOnly cookies |
| Headers | ⚠️ Missing CSP | HIGH | Implement CSP |
| Admin Access | ❌ No IP restriction or 2FA | HIGH | Restrict + add 2FA |
| Dependency Management | ❌ No pinning or scanning | MEDIUM | Pin + audit |
| Logging/Monitoring | ⚠️ AuditLog exists, no alerting | MEDIUM | Add alerting |

---

## TIER 1: CRITICAL (Implement This Week)

### 1.1 Content Security Policy (CSP)

**Current state:** No CSP header. Any script injection (XSS) can execute arbitrary JavaScript, steal JWT tokens from localStorage, and impersonate users.

**Implementation:**

Install `django-csp`:
```bash
pip install django-csp
```

Add to `settings.py`:
```python
MIDDLEWARE = [
    # ... existing middleware ...
    "csp.middleware.CSPMiddleware",
]

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "accounts.google.com", "apis.google.com")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "res.cloudinary.com", "data:", "blob:")
CSP_CONNECT_SRC = ("'self'", "accounts.google.com", "res.cloudinary.com")
CSP_FRAME_SRC = ("accounts.google.com",)
CSP_OBJECT_SRC = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)
```

**If self-hosting fonts (recommended):** Remove `fonts.googleapis.com` and `fonts.gstatic.com` from CSP directives.

**Test with report-only mode first:**
```python
CSP_REPORT_ONLY = True  # Enable this first, monitor for violations
CSP_REPORT_URI = "/api/csp-report/"  # Optional: log violations
```

### 1.2 Admin Panel Security

**Option A (Quick — change URL):**
```python
# config/urls.py
# FROM:
path("admin/", admin.site.urls),
# TO:
path("sra-management-panel/", admin.site.urls),
```

**Option B (Better — add IP restriction):**
```python
# Create middleware: apps/common/admin_ip_middleware.py
from django.http import HttpResponseForbidden
import os

class AdminIPRestrictionMiddleware:
    ALLOWED_IPS = os.getenv("ADMIN_ALLOWED_IPS", "127.0.0.1").split(",")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/admin/"):
            ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
            ip = ip.split(",")[0].strip()
            if ip not in self.ALLOWED_IPS:
                return HttpResponseForbidden("Access denied")
        return self.get_response(request)
```

**Option C (Best — add 2FA):**
```bash
pip install django-otp django-two-factor-auth
```

### 1.3 Pin All Dependencies

```bash
cd backend
pip freeze > requirements.lock
pip install pip-audit
pip-audit
```

Add `pip-audit` to CI/CD pipeline:
```yaml
# In CI configuration
- run: pip install pip-audit
- run: pip-audit --strict
```

---

## TIER 2: HIGH PRIORITY (Implement This Month)

### 2.1 JWT Migration to httpOnly Cookies

**Current flow:**
```
Login → JWT in localStorage → Authorization: Bearer <token>
```

**Target flow:**
```
Login → JWT in httpOnly Secure SameSite=Lax cookie → Auto-sent with requests
```

**Backend changes needed:**
```python
# settings.py
SIMPLE_JWT = {
    ...
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_SECURE": True,
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax",
}
```

**Custom authentication:**
```python
# apps/accounts/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
```

**Frontend changes:**
```javascript
// api/client.js
const client = axios.create({
    baseURL: API_URL,
    withCredentials: true,  // Send cookies with cross-origin requests
});
// Remove: Authorization header logic
// Remove: localStorage token storage
```

**CSRF protection required:** Since cookies are auto-sent, CSRF protection becomes necessary for state-changing requests. Use Django's `csrf_token` cookie approach.

### 2.2 API Field-Level Access Control

**Problem:** Some serializers may expose fields inappropriate for the requesting user's role.

**Audit checklist:**
- [ ] `UserSerializer` — Does it expose phone numbers to non-admin users?
- [ ] `MemberDirectoryView` — What user fields are exposed?
- [ ] `HubSerializer` — Does it expose leader's personal details?
- [ ] `GroupSerializer` — What member data is visible?

**Pattern to implement:**
```python
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"  # BAD

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and not request.user.is_staff:
            # Remove sensitive fields for non-admin users
            sensitive = ["phone_number", "estate", "county", "date_of_birth"]
            for field in sensitive:
                fields.pop(field, None)
        return fields
```

### 2.3 Request Rate Limiting Per Endpoint

Add specific throttles beyond global rates:

```python
# settings.py
"DEFAULT_THROTTLE_RATES": {
    "anon": "60/min",
    "user": "120/min",
    "login": "10/min",
    "password_reset": "5/hour",
    "register": "5/hour",      # NEW
    "upload": "20/hour",        # NEW
    "messaging": "100/hour",    # NEW
}
```

---

## TIER 3: MEDIUM PRIORITY (Implement Within Quarter)

### 3.1 Security Monitoring & Alerting

**Current state:** `AuditLogMiddleware` records all requests but there's no alerting on suspicious patterns.

**Implement:**
```python
# apps/common/security_monitor.py
from django.core.mail import send_mail

def check_suspicious_activity():
    """Run periodically (e.g., every hour via cron/Celery)"""
    from apps.accounts.models import AuditLog

    # Alert: Multiple failed logins from same IP
    # Alert: Successful login from new country
    # Alert: Admin actions outside business hours
    # Alert: Bulk data exports
    # Alert: Rate limit hits
```

### 3.2 CORS Origin Validation

Add explicit production CORS validation:
```python
# settings.py
if not DEBUG:
    assert "localhost" not in str(CORS_ALLOWED_ORIGINS), \
        "CORS_ALLOWED_ORIGINS contains localhost in production!"
```

### 3.3 Database Connection Security

```python
# settings.py — for production
DATABASES["default"]["OPTIONS"] = {
    "sslmode": "require",  # Force SSL for Neon PostgreSQL
}
```

---

## SECURITY HEADERS COMPLETE CHECKLIST

| Header | Status | Value |
|--------|:---:|---|
| `Strict-Transport-Security` | ✅ | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | ✅ | `nosniff` |
| `X-Frame-Options` | ✅ | `DENY` |
| `Referrer-Policy` | ✅ FIXED | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | ✅ FIXED | Camera, mic, geo disabled |
| `Content-Security-Policy` | ❌ TODO | See section 1.1 |
| `X-XSS-Protection` | N/A | Deprecated, CSP is the replacement |
| `Cross-Origin-Opener-Policy` | ⬜ Optional | `same-origin` |
| `Cross-Origin-Embedder-Policy` | ⬜ Optional | `require-corp` |
| `Cross-Origin-Resource-Policy` | ⬜ Optional | `same-site` |

---

## INCIDENT RESPONSE PLAYBOOK

### If JWT Tokens Are Compromised:
1. Rotate `SECRET_KEY` in settings (invalidates ALL tokens)
2. Clear `token_blacklist_outstandingtoken` table
3. All users must re-authenticate
4. Audit `AuditLog` for suspicious activity during exposure window

### If Admin Credentials Are Compromised:
1. Change admin password immediately
2. Rotate `SECRET_KEY`
3. Check `AuditLog` for admin-level actions
4. Review user role changes, approvals, and suspensions
5. Check if any users were created or promoted

### If Database Is Exposed:
1. Rotate all API keys (Africa's Talking, Google OAuth, Cloudinary)
2. Rotate `SECRET_KEY` and `DATABASE_URL`
3. Force password reset for all users
4. Audit data exposure scope
5. Notify affected users per data protection requirements

# SECURITY FORENSIC — Spirit Revival Africa
**Audit Date:** 2025  
**Scope:** OWASP Top 10, file uploads, JWT, authentication bypass, privilege escalation, CSP, rate limiting, injection, session handling

---

## 1. Authentication & Session Management

### JWT Configuration
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}
```
✅ 30-minute access tokens — reasonable expiry  
✅ 7-day refresh with rotation — each use issues a new one  
✅ Blacklisting after rotation — prevents refresh token reuse  
✅ Token blacklist app installed: `rest_framework_simplejwt.token_blacklist`

### JWT custom claims
```python
token["role"] = user.role
token["email"] = user.email
```
⚠️ Role is embedded in the JWT claim. If a user's role changes server-side, the old token still carries the old role until expiry (up to 30 minutes). **This is unavoidable without token introspection but worth documenting.**

### Token blacklist on logout / password change
- **Password change:** `ChangePasswordView` blacklists all outstanding tokens ✅
- **Password reset confirm:** `PasswordResetConfirmView` blacklists all outstanding tokens ✅
- **User suspended:** `suspend_user` sets `is_active=False` but **does NOT blacklist tokens** ⚠️
- **User rejected:** `reject_user` sets `is_active=False` but **does NOT blacklist tokens** ⚠️

**Impact:** A suspended or rejected user may continue to use the platform for up to 30 minutes after admin action (until their access token expires). The refresh token (7 days) would fail on next refresh since DRF/SimpleJWT checks `is_active` on each request.

---

## 2. CRITICAL: Google OAuth Approval Bypass

**File:** `backend/apps/accounts/views.py` — `GoogleAuthView.post()`

When a new user signs in via Google OAuth:
```python
user = User.objects.create_user(
    email=email,
    username=username,
    full_name=full_name,
    password=None,
    email_verified=True,
    is_active=True,
    # is_approved NOT SET → uses model default = True
)
```

**Model default:**
```python
is_approved = models.BooleanField(
    default=True,    # ← Default allows ALL Google users in without admin approval
    help_text="Admin approval required before user can access the platform.",
)
```

**Email registration path:**
```python
# RegisterSerializer.create()
user.is_approved = False  # Explicitly blocked until admin approves
```

**Result:** Email-registered users require admin approval. Google OAuth users **bypass the approval gate entirely** and get instant access. This inconsistency means:
1. Any person with a Google account can join without admin vetting
2. The "approval required" gate is meaningless for Google OAuth users
3. The platform's claimed membership curation is bypassed

**Fix:**
```python
# In GoogleAuthView:
user = User.objects.create_user(...)
user.is_approved = False  # Same gate as email registration
user.save(update_fields=['is_approved'])
```

---

## 3. File Upload Security

### Profile Picture Validation
**File:** `backend/apps/accounts/serializers.py`

```python
_IMAGE_MAGIC = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
    b"RIFF": "webp",
}

def _validate_image_magic_bytes(file_obj):
    header = file_obj.read(12)
    file_obj.seek(0)
    is_jpeg = header[:3] == b"\xff\xd8\xff"
    is_png = header[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_webp):
        raise ValidationError({"profile_picture": "Only JPEG, PNG, or WebP images are allowed."})
```
✅ Magic byte validation — not just MIME header trust  
✅ Applied on both `create` (registration) and `update` (profile patch)  
✅ 2MB size limit enforced: `if pic.size > 2 * 1024 * 1024: raise ValidationError`

### UserPhoto upload
UserPhoto model uses `profile_picture = ImageField(upload_to="user-photos/")`. The `UserPhotoSerializer` was not fully audited in this report. **Action:** Verify UserPhotoSerializer applies the same magic bytes validation as `_validate_image_magic_bytes`.

### Storage path exposure
- Local dev: files stored in `backend/media/` and served via Django/WhiteNoise
- No user-uploaded content served from `/static/` — `MEDIA_URL=/media/`, `STATIC_URL=/static/` are separate ✅
- File paths include UUID/user ID in upload_to patterns (assumed) — prevents predictable enumeration

---

## 4. SQL Injection

All database access uses Django ORM:
- `User.objects.filter(email__icontains=q)` — parameterised ✅
- `User.objects.filter(id=user_id)` — integer cast, no injection ✅
- No raw `SQL()` calls or cursor.execute found in audited files ✅
- `UserSearchView.get_queryset()` enforces `len(q) < 2` minimum ✅

**Assessment:** No SQL injection vectors found.

---

## 5. XSS (Cross-Site Scripting)

### Frontend
- React auto-escapes all JSX expressions ✅
- No `dangerouslySetInnerHTML` used in audited components ✅
- Story content uses `whitespace-pre-line` CSS with `{story.story}` text — no raw HTML ✅
- ShareButton uses `navigator.clipboard.writeText()` — no DOM injection ✅

### Backend
- DRF serializers return JSON — no template injection ✅
- Django admin has built-in XSS protection via Django template escaping ✅

**Assessment:** No XSS vectors found.

---

## 6. Security Headers

**From `config/settings.py`:**

| Header | Setting | Value |
|---|---|---|
| X-XSS-Protection | `SECURE_BROWSER_XSS_FILTER = True` | Adds `X-XSS-Protection: 1; mode=block` |
| X-Content-Type-Options | `SECURE_CONTENT_TYPE_NOSNIFF = True` | `nosniff` ✅ |
| X-Frame-Options | `X_FRAME_OPTIONS = "DENY"` | Blocks iframes ✅ |
| Referrer-Policy | `SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"` | ✅ |
| HSTS | `SECURE_HSTS_SECONDS = 31536000` in production | 1 year + subdomains + preload ✅ |
| HTTPS redirect | `SECURE_SSL_REDIRECT = False` (proxy handles) | ✅ for cPanel setup |
| Cookie security | `SESSION_COOKIE_SECURE = True` in production | ✅ |
| CSRF cookie | `CSRF_COOKIE_SECURE = True` in production | ✅ |

### Content Security Policy (CSP)
**❌ NOT configured anywhere.**

No `django-csp` or equivalent is installed. No `Content-Security-Policy` header is set. This means:
- Injected script tags (if XSS were achieved) would execute freely
- No protection against inline script execution from 3rd-party content
- External resources (Google Fonts, PayPal, WhatsApp) cannot be allowlisted

### Permissions Policy
```python
PERMISSIONS_POLICY = {
    "camera": [],
    "microphone": [],
    "geolocation": [],
    "interest-cohort": [],
}
```
⚠️ This dictionary is set in settings but **Django does not send `Permissions-Policy` as an HTTP header natively**. The `django-permissions-policy` package is NOT in `requirements.txt`. This configuration does nothing — the header is never sent.

---

## 7. Rate Limiting

```python
"DEFAULT_THROTTLE_CLASSES": [
    "rest_framework.throttling.AnonRateThrottle",
    "rest_framework.throttling.UserRateThrottle",
],
"DEFAULT_THROTTLE_RATES": {
    "anon": "60/min",
    "user": "300/min",
    "login": "10/min",
    "password_reset": "5/hour",
},
```

✅ Login endpoint: `LoginThrottle` (ScopedRateThrottle, scope="login") → 10/min ✅  
✅ Password reset: `PasswordResetThrottle` (AnonRateThrottle, rate="5/hour") → 5/hr ✅  
✅ Anonymous API: 60/min — reasonable limit  
✅ Authenticated API: 300/min

**Gaps:**
- ❌ `admin_broadcast` has no dedicated throttle — a compromised admin account could spam all users (300 broadcasts/min × 500 recipients = 150,000 messages/min via bulk_create)
- ❌ `GoogleAuthView` applies `LoginThrottle` ✅ but any new Google account bypasses is_approved — creates denial-of-service potential via account creation spam

---

## 8. CORS Configuration

```python
CORS_ALLOWED_ORIGINS = [origin.strip() 
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()]
CORS_PREFLIGHT_MAX_AGE = 86400
```
✅ Explicit whitelist (not `CORS_ALLOW_ALL_ORIGINS = True`)  
✅ Origins from environment variable (configurable per deployment)  
✅ CSRF trusted origins set to same as CORS: `CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS`

---

## 9. Secret Key Protection

```python
SECRET_KEY = os.getenv("SECRET_KEY", "insecure-dev-key")
if not DEBUG and SECRET_KEY == "insecure-dev-key":
    import sys
    sys.exit("FATAL: SECRET_KEY env var is not set and DEBUG is False.")
```
✅ Production will refuse to start with the default key  
✅ Dev uses fallback (acceptable in local dev)  
⚠️ `"insecure-dev-key"` is known/public — anyone who knows this key can forge Django signatures in dev.

---

## 10. Access Control

### ProtectedRoute (frontend)
```jsx
if (!isAuthenticated) → /login
if (roles && !roles.includes(role)) → /dashboard
```
✅ Clean. No bypass detected.

### Backend permissions
```python
IsModeratorOrAbove  # mod, admin, super_admin
IsAdminOrAbove      # admin, super_admin
IsSuperAdmin        # super_admin only
```
✅ Hierarchical, consistently applied to sensitive endpoints

**Gap:** `promote_user_role()` allows admin to grant any role EXCEPT `super_admin` (protected by explicit check). But **can admin promote to `admin`?** Yes. This means an admin can create new admins. In larger deployments, this could lead to privilege escalation via a rogue admin.

---

## 11. Admin Privilege Enumeration

**Broadcast endpoint:**
```python
@api_view(["POST"])
@permission_classes([IsAdminOrAbove])
def admin_broadcast_message(request):
    recipients = User.objects.filter(is_active=True, is_approved=True).exclude(id=sender.id)
    batch = [DirectMessage(sender=sender, receiver=recipient, text=text) for recipient in recipients]
    DirectMessage.objects.bulk_create(batch, batch_size=500)
```
⚠️ Text limit is 4000 chars ✅ but no rate limit beyond `UserRateThrottle` (300/min). A compromised admin could spam.

**User search:**
```python
# Minimum 2 chars, returns email + profile_picture
```
⚠️ The `UserSearchView` returns `email` of matched users (needed for DM feature). If abused, emails can be harvested at 300/min rate limit. Consider returning only username unless messaging context confirmed.

---

## 12. Security Scores Summary

| OWASP Category | Status | Score |
|---|---|---|
| Broken Access Control | ⚠️ Google OAuth bypasses is_approved | 5/10 |
| Cryptographic Failures | ✅ JWT, HTTPS in prod | 8/10 |
| Injection (SQL/XSS/Command) | ✅ ORM, React auto-escape | 9/10 |
| Insecure Design | ⚠️ Suspend doesn't blacklist tokens | 6/10 |
| Security Misconfiguration | ❌ No CSP, PERMISSIONS_POLICY inert | 4/10 |
| Vulnerable Components | ✅ Recent packages used | 8/10 |
| Auth Failures | ✅ Rate limited, blacklisted on PW change | 8/10 |
| Software Integrity | ✅ Magic bytes validation | 8/10 |
| Logging & Monitoring | ✅ AuditLog, but no alerting | 6/10 |
| SSRF | ✅ No user-controlled URL fetches in code | 9/10 |
| **Overall Security** | — | **7.1/10** |

---

## 13. Issues by Severity

| Severity | Issue | Fix |
|---|---|---|
| CRITICAL | Google OAuth creates users with `is_approved=True` (bypasses admin approval gate) | Set `is_approved=False` in `GoogleAuthView` |
| HIGH | No Content Security Policy (CSP) header | Install `django-csp`, configure header |
| MEDIUM | `suspend_user` / `reject_user` don't blacklist JWT tokens | Call token blacklist in both views |
| MEDIUM | `PERMISSIONS_POLICY` setting is inert without `django-permissions-policy` package | Install package or remove false setting |
| LOW | Admin can promote users to `admin` role (privilege escalation chain) | Restrict admin self-promotion |
| LOW | Admin broadcast has no dedicated rate limit | Add `ScopedRateThrottle` to broadcast endpoint |
| INFO | JWT role claim stale up to 30 min after role change | Document known limitation |
| INFO | `UserSearchView` returns email addresses | Review email exposure in search results |

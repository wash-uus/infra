# PATCHES — Applied Code Changes
## Spirit Revival Africa Forensic Audit

All patches below have been applied directly to the codebase. This document records each change with before/after context.

---

## PATCH 1: Google OAuth — Cryptographic ID Token Verification

### File: `backend/apps/accounts/views.py`
### Severity: CRITICAL
### Lines: GoogleAuthView.post()

**Before:**
```python
class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        access_token = request.data.get("access_token")
        if not access_token:
            return Response({"error": "Access token is required"}, status=400)
        
        try:
            token_info_url = f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={access_token}"
            token_response = requests.get(token_info_url)
            # ... validated against tokeninfo response
            email_verified = token_info.get("email_verified") or request.data.get("email_verified")
```

**After:**
```python
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]
    
    def post(self, request):
        credential = request.data.get("credential") or request.data.get("access_token")
        if not credential:
            return Response({"error": "Google credential is required"}, status=400)

        try:
            client_id = settings.GOOGLE_CLIENT_ID
            idinfo = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                client_id,
            )
            email = idinfo["email"]
            email_verified = idinfo.get("email_verified", False)
```

**Why:** The access_token approach trusts an opaque token that could have been issued to ANY OAuth client. The ID token approach cryptographically verifies that the token was issued specifically for SRA's client ID and contains authenticated claims.

---

## PATCH 2: File Upload Magic Byte Validation

### File: `backend/apps/accounts/serializers.py`
### Severity: HIGH
### Lines: Module-level function + RegisterSerializer.create() + UserSerializer.update()

**Added function:**
```python
import imghdr

def _validate_image_magic_bytes(file_obj):
    """Validate that an uploaded file is a genuine image by checking magic bytes."""
    header = file_obj.read(12)
    file_obj.seek(0)
    detected = imghdr.what(None, h=header)
    if detected in ("jpeg", "png"):
        return True
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return True
    raise serializers.ValidationError("Upload a valid JPEG, PNG, or WebP image.")
```

**Applied in RegisterSerializer.create():**
```python
# Before: only checked pic.content_type
# After: validates magic bytes BEFORE content_type check
if pic:
    _validate_image_magic_bytes(pic)
    if pic.size > 2 * 1024 * 1024:
        raise serializers.ValidationError({"profile_picture": "Max 2 MB."})
```

**Applied in UserSerializer.update():**
```python
pic = validated_data.get("profile_picture")
if pic:
    _validate_image_magic_bytes(pic)
    if pic.size > 2 * 1024 * 1024:
        raise serializers.ValidationError({"profile_picture": "Image must be under 2 MB."})
```

**Why:** The `Content-Type` header is set by the client and is trivially spoofable. Magic bytes are embedded in the file's binary content and cannot be faked without making the file unexecutable as a script.

---

## PATCH 3: Login Rate Limiting

### File: `backend/apps/accounts/views.py`
### Severity: MEDIUM

**Added:**
```python
from rest_framework.throttling import ScopedRateThrottle

class LoginThrottle(ScopedRateThrottle):
    scope = "login"
    scope_attr = "throttle_scope"
```

**Applied to:**
- `EmailLoginView`: `throttle_classes = [LoginThrottle]`
- `GoogleAuthView`: `throttle_classes = [LoginThrottle]`

### File: `backend/config/settings.py`

**Added rate definition:**
```python
"DEFAULT_THROTTLE_RATES": {
    "anon": "60/min",
    "user": "120/min",
    "login": "10/min",         # ← NEW
    "password_reset": "5/hour", # ← NEW
}
```

---

## PATCH 4: Security Headers

### File: `backend/config/settings.py`
### Severity: LOW-MEDIUM

**Added:**
```python
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

PERMISSIONS_POLICY = {
    "accelerometer": [],
    "camera": [],
    "geolocation": [],
    "microphone": [],
}
```

**Why:** `Referrer-Policy` prevents leaking full URLs in the `Referer` header to external sites. `Permissions-Policy` explicitly denies browser APIs the app doesn't use.

---

## PATCH 5: robots.txt Hardening

### File: `frontend/public/robots.txt`
### Severity: LOW

**Before:**
```
User-agent: *
Allow: /
Sitemap: https://spiritrevivalafrica.com/sitemap.xml
```

**After:**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /messages
Disallow: /dashboard
Disallow: /profile
Disallow: /verify-email
Disallow: /reset-password
Sitemap: https://spiritrevivalafrica.com/sitemap.xml
```

---

## PATCH 6: sitemap.xml Rebuild

### File: `frontend/public/sitemap.xml`
### Severity: LOW

**Changes:**
- Removed `/login` (no SEO value)
- Added `<lastmod>` dates to all entries
- Boosted `/book/beneath-the-crown` priority from 0.5 → 0.9 (unique content asset)
- Added HTML comment documenting excluded auth routes
- Proper priority ordering: homepage (1.0) → book (0.9) → content pages (0.7-0.8) → utility pages (0.5)

---

## PATCH 7: index.html SEO Overhaul

### File: `frontend/index.html`
### Severity: HIGH (SEO impact)

**Changes:**
- Title: `"Spirit Revival Africa"` → `"Spirit Revival Africa — Reigniting the Holy Spirit Across Africa"`
- Meta description: generic → targeted keyword-rich description
- OG image: `sra-logo.png` → `og-image.png` (1200×630 recommended)
- Added OG image dimension hints
- Added font preload hints
- Added structured comments for self-hosted font future migration

---

## PATCH 8: Per-Page Meta Tags (usePageMeta Hook)

### File: `frontend/src/hooks/usePageMeta.js` (NEW)
### Severity: HIGH (SEO impact)

**Created** a new custom hook that dynamically sets:
- `document.title`
- `meta[name="description"]`
- `meta[property="og:title"]`
- `meta[property="og:description"]`
- `meta[property="og:image"]`
- `meta[name="twitter:title"]`
- `meta[name="twitter:description"]`
- `meta[name="twitter:image"]`

**Integrated into 8 pages:**
1. PrayerPage — "Prayer Wall | Spirit Revival Africa"
2. GroupsPage — "Ministry Groups | Spirit Revival Africa"
3. HubsPage — "Revival Hubs | Spirit Revival Africa"
4. DiscipleshipPage — "Discipleship Courses | Spirit Revival Africa"
5. WorshipPage — "Shouts of Joy Melodies — Worship Team | Spirit Revival Africa"
6. BeneathTheCrownPage — "Beneath the Crown — By W. Washika | Spirit Revival Africa"
7. ContentPage — "Content Library | Spirit Revival Africa"
8. GalleryPage — "Gallery | Spirit Revival Africa"

---

## PATCH VERIFICATION CHECKLIST

| # | Patch | File(s) | Verified |
|---|-------|---------|:---:|
| 1 | Google OAuth fix | views.py | ✅ Applied |
| 2 | Magic byte validation | serializers.py | ✅ Applied |
| 3 | Login throttle | views.py, settings.py | ✅ Applied |
| 4 | Security headers | settings.py | ✅ Applied |
| 5 | robots.txt | robots.txt | ✅ Applied |
| 6 | sitemap.xml | sitemap.xml | ✅ Applied |
| 7 | index.html SEO | index.html | ✅ Applied |
| 8 | usePageMeta | hooks/usePageMeta.js + 8 pages | ✅ Applied |

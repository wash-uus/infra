# UNKNOWN RISKS — Spirit Revival Africa
## Risks Beyond Original Audit Scope

---

## 1. SESSION FIXATION VIA JWT REFRESH CHAIN

### Risk Level: MEDIUM
### Discovery: Code review of `client.js` refresh interceptor

**Finding:** When a 401 response triggers token refresh, ALL queued requests are retried with the new token. If the refresh endpoint itself is compromised (e.g., via MITM on HTTP), an attacker could inject a malicious refresh token that gets stored in localStorage. All subsequent requests would then carry attacker-controlled tokens.

**File:** `frontend/src/api/client.js`
```javascript
// Interceptor queues failed requests and replays them after refresh
// If the refresh response is tampered with, all queued requests get attacker tokens
```

**Mitigation:** Enforce HTTPS-only for all API calls (already done via HSTS in production). Ensure the refresh endpoint validates the old refresh token's `jti` claim against the blacklist. This IS already implemented via `BLACKLIST_AFTER_ROTATION: True`.

**Residual Risk:** LOW after HSTS. The rotation + blacklist pattern is correct.

---

## 2. AUDIT LOG MIDDLEWARE — INFORMATION DISCLOSURE

### Risk Level: LOW
### Discovery: Deep read of `backend/apps/accounts/middleware.py`

**Finding:** The `AuditLogMiddleware` logs every request to the database, including:
- Request path
- Request method
- User agent
- IP address
- User ID

This creates a comprehensive activity log, which is GOOD for security monitoring but:
1. **No log rotation policy** — the table will grow unbounded
2. **No PII deletion mechanism** — GDPR/data protection risk if users request data deletion
3. **Logs are stored in the same database as application data** — a SQL injection in any endpoint could expose the full activity log

**Mitigation:** Add log rotation (e.g., delete logs older than 90 days), separate audit logs from application DB, implement a log export/delete endpoint for PII compliance.

---

## 3. ADMIN PANEL EXPOSURE

### Risk Level: MEDIUM
### Discovery: `backend/config/urls.py`

**Finding:** Django admin is exposed at `/admin/` with no additional protection:
```python
path("admin/", admin.site.urls),
```

There is:
- No IP whitelisting
- No 2FA requirement (no django-otp or django-two-factor-auth)
- No custom admin URL path (security through obscurity, but still good practice)
- No admin login throttling beyond the global rate limit

**Exploitation:** An attacker who discovers admin credentials (or guesses them via the unthrottled admin login form) gets full database access.

**Mitigation:**
1. Change admin URL to a non-guessable path: `path("secret-panel-xyz/", admin.site.urls)`
2. Add `django-admin-honeypot` at `/admin/` to trap attackers
3. Restrict admin access by IP or VPN
4. Add 2FA via `django-otp`

---

## 4. EMAIL VERIFICATION TOKEN — TIMING ATTACK

### Risk Level: LOW
### Discovery: `backend/apps/accounts/views.py` VerifyEmailView

**Finding:** Email verification uses Django's signing framework:
```python
email = signing.loads(token, max_age=86400)
```

If the token is invalid, `signing.BadSignature` is raised and a 400 response is returned. If valid but expired, 400 with "Verification link has expired". If valid, 200.

The response TIME differs between these cases (signing verification is computationally more expensive than a quick exception). This creates a minor timing side-channel. However, since the token is a HMAC-signed blob (not a simple code), this timing difference provides no practical advantage to an attacker.

**Residual Risk:** NEGLIGIBLE.

---

## 5. DEAD CODE AND UNUSED IMPORTS

### Risk Level: INFO
### Discovery: Code review

**Findings:**
- `backend/apps/messaging/consumers.py` — WebSocket consumer code exists but is completely unused (all socket code was removed from settings/routing). This file should be deleted or archived.
- `backend/config/routing.py` — ASGI routing file exists but `ASGI_APPLICATION` is not set in settings. Dead code.
- Several `__pycache__/` directories are committed to version control — not a security risk but indicates lack of `.gitignore` enforcement.

**Mitigation:** Delete `consumers.py`, `routing.py`, and clean up `__pycache__` directories. Add `__pycache__/` and `*.pyc` to `.gitignore`.

---

## 6. DEPENDENCY SUPPLY CHAIN RISK

### Risk Level: MEDIUM
### Discovery: `backend/requirements.txt` analysis

**Findings:**
- `requirements.txt` uses unpinned versions for several packages (e.g., `django-cors-headers`, `Pillow`)
- No `requirements.lock` or `pip freeze` output committed
- No dependency vulnerability scanning (no `pip-audit`, no Snyk, no Dependabot)

**Key packages to monitor:**
| Package | Reason |
|---------|--------|
| `Pillow` | Image processing — frequently has CVEs |
| `djangorestframework-simplejwt` | Auth core — JWT vulnerabilities |
| `django-cors-headers` | CORS enforcement |
| `requests` | HTTP client — SSRF vector if misused |
| `google-auth` | OAuth verification |

**Mitigation:** Pin all versions, add `pip-audit` to CI, enable Dependabot/Snyk.

---

## 7. SMS PROVIDER API KEY MANAGEMENT

### Risk Level: MEDIUM
### Discovery: `backend/apps/accounts/views.py` SMS sending code

**Finding:** Africa's Talking API credentials are loaded from environment variables:
```python
username = os.getenv("AT_USERNAME")
api_key = os.getenv("AT_API_KEY")
```

If these env vars are accidentally logged, exposed in error pages, or leaked via `DEBUG=True` in production, an attacker could:
1. Send SMS messages at the organization's expense
2. Send phishing SMS to the entire user base using the organization's sender ID

**Mitigation:** Ensure `DEBUG=False` in production (already set conditionally). Add AT credentials to a secret manager rather than env vars if possible.

---

## 8. MISSING ACCESSIBILITY (A11Y) COMPLIANCE

### Risk Level: MEDIUM (Legal/Compliance)
### Discovery: Frontend code review

**Findings:**
- No ARIA labels on interactive elements
- No `alt` text management system for gallery images
- No keyboard navigation testing evidence
- No contrast ratio validation
- Hero section animations may trigger motion sensitivity issues (no `prefers-reduced-motion` check)
- Framer Motion animations have no `reducedMotion` prop

**Impact:** Potential legal liability under accessibility laws (varies by jurisdiction). Poor experience for users with disabilities.

**Mitigation:**
1. Add `aria-label` to all interactive elements
2. Add `alt` text field to gallery/content models
3. Add `prefers-reduced-motion` media query support
4. Audit with axe-core or Lighthouse accessibility audit

---

## 9. DATA EXPOSURE IN API RESPONSES

### Risk Level: MEDIUM
### Discovery: Serializer analysis

**Finding:** `UserSerializer` in `backend/apps/accounts/serializers.py` exposes a large number of user fields. The `MemberDirectorySerializer` (if it exists for the member directory feature) may expose:
- Phone numbers
- Physical addresses (estate, county)
- Church membership details
- Ministry involvement

Without field-level access control, any authenticated user could potentially enumerate other users' PII via the directory API.

**Mitigation:** Audit all serializer `fields` lists. Implement field-level visibility based on the requesting user's role. Consider separate serializers for public/private views.

---

## 10. WEBSOCKET POLLING OVERHEAD

### Risk Level: LOW (Performance)
### Discovery: `frontend/src/hooks/useMessagePolling.js`

**Finding:** Messages are polled every 4 seconds via HTTP. For N concurrent users, this creates N × 15 requests/minute to the API. With 100 users online, that's 1500 requests/minute — all hitting the Neon PostgreSQL database.

**Impact:** Database connection exhaustion during peak usage. Neon's connection pooler may handle this, but `conn_max_age=0` means every request opens and closes a DB connection.

**Mitigation:** Increase polling interval to 10-15 seconds. Implement conditional polling (only when messages page is active). Long-term: migrate to WebSocket when hosting supports it.

---

## RISK PRIORITY MATRIX

| # | Risk | Severity | Effort to Fix | Priority |
|---|------|----------|:---:|:---:|
| 3 | Admin panel exposure | MEDIUM | LOW | **P1** |
| 6 | Dependency supply chain | MEDIUM | LOW | **P1** |
| 7 | SMS API key management | MEDIUM | LOW | **P2** |
| 9 | Data exposure in APIs | MEDIUM | MEDIUM | **P2** |
| 8 | Accessibility compliance | MEDIUM | HIGH | **P3** |
| 5 | Dead code cleanup | INFO | LOW | **P4** |
| 2 | Audit log PII | LOW | MEDIUM | **P4** |
| 10 | Polling overhead | LOW | LOW | **P4** |
| 1 | Session fixation | LOW | NONE | RESOLVED |
| 4 | Timing attack | NEGLIGIBLE | NONE | RESOLVED |

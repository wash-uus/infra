# FORENSIC MONITORING SYSTEM — Spirit Revival Africa
## Continuous Security, SEO & Performance Monitoring

---

## PURPOSE

This document defines a monitoring system to:
1. Detect regressions from applied patches
2. Track ongoing security posture
3. Monitor SEO recovery progress
4. Alert on performance degradation
5. Ensure audit findings don't resurface

---

## 1. SECURITY MONITORING

### 1.1 Automated Dependency Scanning

**Tool:** `pip-audit` (Python) + `npm audit` (JavaScript)

**Schedule:** Every deployment + weekly cron

**Backend:**
```bash
# Add to CI/CD pipeline or cron job
pip-audit --strict --desc 2>&1 | tee /var/log/sra-pip-audit.log
# Fail deployment if critical vulnerabilities found
```

**Frontend:**
```bash
npm audit --production 2>&1 | tee /var/log/sra-npm-audit.log
# Review advisories — don't auto-fix without testing
```

**Alert condition:** Any vulnerability with CVSS > 7.0

### 1.2 Authentication Monitoring

**Metrics to track (from AuditLog):**

| Event | Normal Range | Alert Threshold |
|-------|:---:|:---:|
| Failed logins per IP per hour | 0-3 | > 5 |
| Failed logins per email per day | 0-2 | > 5 |
| Successful logins from new IP | varies | Always log |
| Google OAuth errors | 0 | > 3/hour |
| Token refresh failures | 0-5/day | > 20/day |
| Admin panel access | 0-10/day | > 20/day |

**Implementation — Django management command:**
```python
# backend/apps/common/management/commands/security_report.py
from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone

class Command(BaseCommand):
    help = "Generate daily security report"

    def handle(self, *args, **options):
        from apps.accounts.models import AuditLog  # adjust import
        yesterday = timezone.now() - timedelta(days=1)

        # Failed login attempts
        failed_logins = AuditLog.objects.filter(
            created_at__gte=yesterday,
            path__contains="/login",
            status_code=401
        ).count()

        # Admin panel access
        admin_access = AuditLog.objects.filter(
            created_at__gte=yesterday,
            path__startswith="/admin/"
        ).count()

        # Google OAuth errors
        oauth_errors = AuditLog.objects.filter(
            created_at__gte=yesterday,
            path__contains="/auth/google",
            status_code__gte=400
        ).count()

        self.stdout.write(f"Failed logins: {failed_logins}")
        self.stdout.write(f"Admin access: {admin_access}")
        self.stdout.write(f"OAuth errors: {oauth_errors}")

        # Send email alert if thresholds exceeded
        if failed_logins > 50 or oauth_errors > 10:
            # send_mail(...) alert to admin
            pass
```

**Schedule:** `python manage.py security_report` — daily via cron

### 1.3 Patch Regression Checks

After every deployment, verify these patches are still intact:

| Patch | Verification |
|-------|-------------|
| Google OAuth | `grep "verify_oauth2_token" backend/apps/accounts/views.py` returns match |
| Magic byte validation | `grep "_validate_image_magic_bytes" backend/apps/accounts/serializers.py` returns match |
| Login throttle | `grep "LoginThrottle" backend/apps/accounts/views.py` returns match |
| CSP header | `curl -I https://spiritrevivalafrica.com \| grep Content-Security-Policy` returns header |
| HSTS | `curl -I https://spiritrevivalafrica.com \| grep Strict-Transport-Security` returns header |
| Referrer-Policy | `curl -I https://spiritrevivalafrica.com \| grep Referrer-Policy` returns header |

**Automate with a post-deploy script:**
```bash
#!/bin/bash
echo "=== Post-Deploy Security Check ==="
URL="https://spiritrevivalafrica.com"

# Check security headers
for header in "Strict-Transport-Security" "X-Content-Type-Options" "X-Frame-Options" "Referrer-Policy"; do
    if curl -sI "$URL" | grep -qi "$header"; then
        echo "✅ $header present"
    else
        echo "❌ $header MISSING — ALERT!"
    fi
done

# Check robots.txt blocks /api/
if curl -s "$URL/robots.txt" | grep -q "Disallow: /api/"; then
    echo "✅ robots.txt blocks /api/"
else
    echo "❌ robots.txt does NOT block /api/ — ALERT!"
fi
```

---

## 2. SEO MONITORING

### 2.1 Google Search Console (Weekly)

**Metrics to track:**

| Metric | Baseline | Target (30d) | Target (90d) |
|--------|:---:|:---:|:---:|
| Total indexed pages | 0-1 | ≥ 5 | ≥ 10 |
| Total impressions/week | 0 | > 50 | > 500 |
| Average CTR | N/A | > 2% | > 4% |
| Average position | N/A | < 50 | < 20 |
| Coverage errors | Unknown | 0 critical | 0 critical |

**Weekly checklist:**
- [ ] Check "Coverage" for indexing errors
- [ ] Review "Performance" for impression trends
- [ ] Check "Mobile Usability" for mobile issues
- [ ] Review "Core Web Vitals" for performance regressions
- [ ] Check "Sitemaps" for processing status

### 2.2 Page Title and Meta Verification

**Monthly automated check:**
```bash
#!/bin/bash
ROUTES=(
    "/"
    "/content"
    "/prayer"
    "/groups"
    "/hubs"
    "/discipleship"
    "/worship"
    "/book/beneath-the-crown"
    "/gallery"
)

BASE="https://spiritrevivalafrica.com"

for route in "${ROUTES[@]}"; do
    title=$(curl -s "$BASE$route" | grep -oP '<title>\K[^<]+')
    echo "$route → $title"
done
```

**Note:** This only works if pre-rendering is active. For CSR-only, use a headless browser (Puppeteer) to render pages first.

### 2.3 Structured Data Validation

After implementing JSON-LD (see SEO_RECOVERY_PLAN.md):
- Test each page at https://search.google.com/test/rich-results
- Monitor "Enhancements" in Google Search Console for structured data errors

---

## 3. PERFORMANCE MONITORING

### 3.1 Core Web Vitals (Real User Data)

**Tool options:**
1. **Google Search Console** — Free, shows CWV from Chrome User Experience Report
2. **web-vitals library** — Add to frontend for real user monitoring:

```javascript
// frontend/src/main.jsx — add at bottom
import { onLCP, onFID, onCLS } from "web-vitals";

function sendToAnalytics(metric) {
    // Send to your analytics endpoint
    console.log(metric.name, metric.value);
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
```

3. **Lighthouse CI** — Run in CI pipeline:
```bash
npx lhci autorun --config=lighthouserc.json
```

### 3.2 API Response Time Monitoring

**Add to AuditLogMiddleware or create dedicated middleware:**
```python
import time

class PerformanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        duration = time.time() - start

        # Log slow requests (> 2 seconds)
        if duration > 2.0:
            import logging
            logger = logging.getLogger("performance")
            logger.warning(
                f"SLOW REQUEST: {request.method} {request.path} "
                f"took {duration:.2f}s (user: {request.user})"
            )

        response["X-Response-Time"] = f"{duration:.3f}s"
        return response
```

### 3.3 Neon Database Cold Start Tracking

**Implement a health check endpoint:**
```python
# backend/apps/common/views.py
from django.db import connection
import time

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_time = time.time() - start

        return Response({
            "status": "healthy",
            "db_latency_ms": round(db_time * 1000, 1)
        })
```

**Keep-alive cron (prevent cold starts):**
```bash
# Run every 4 minutes
*/4 * * * * curl -s https://spiritrevivalafrica.com/api/health/ > /dev/null
```

---

## 4. UPTIME MONITORING

### 4.1 External Uptime Check

**Free tools:**
- [UptimeRobot](https://uptimerobot.com) — Free for 50 monitors
- [Freshping](https://freshping.io) — Free for 50 checks

**Configure:**
- Check `https://spiritrevivalafrica.com` every 5 minutes
- Check `https://spiritrevivalafrica.com/api/health/` every 5 minutes
- Alert via email + SMS on downtime > 1 minute

### 4.2 SSL Certificate Monitoring

**Check URL:** `https://spiritrevivalafrica.com`
**Alert:** When SSL certificate expires within 14 days

---

## 5. PERIODIC AUDIT SCHEDULE

| Audit Type | Frequency | Tool/Method |
|-----------|:---:|---|
| Dependency vulnerabilities | Weekly | `pip-audit` + `npm audit` |
| Security headers | Weekly | securityheaders.com scan |
| SEO indexing status | Weekly | Google Search Console |
| Core Web Vitals | Monthly | Lighthouse CI + GSC |
| Full code security review | Quarterly | Manual review + OWASP checklist |
| Penetration testing | Semi-annual | External security firm |
| Accessibility audit | Quarterly | axe-core + Lighthouse |
| Backup verification | Monthly | Restore backup to staging |

---

## 6. MONITORING DASHBOARD (Recommended)

Create a simple status page tracking:

```
╔══════════════════════════════════════════╗
║  SPIRIT REVIVAL AFRICA — System Status   ║
╠══════════════════════════════════════════╣
║  Website:     🟢 UP (99.8% — 30 days)   ║
║  API:         🟢 UP (avg 180ms)          ║
║  Database:    🟢 Healthy (12ms)          ║
║  SSL:         🟢 Valid (expires 2026-12) ║
║  Security:    🟢 All headers present     ║
║  SEO:         🟡 5/10 pages indexed      ║
║  Dependencies:🟢 No critical vulns       ║
║  Last Audit:  2026-03-29                 ║
╚══════════════════════════════════════════╝
```

**Stack options:**
- **Simple:** GitHub Actions cron + Markdown in repo
- **Medium:** Uptime Robot status page (free)
- **Full:** Grafana dashboard with Prometheus metrics

---

## 7. ALERT ESCALATION

| Severity | Example | Response Time | Channel |
|----------|---------|:---:|---|
| CRITICAL | Site down, security breach | < 15 min | SMS + Email |
| HIGH | Auth errors spike, SSL expiring | < 1 hour | Email |
| MEDIUM | Performance degradation, new vuln | < 24 hours | Email |
| LOW | Minor indexing issue, slow query | < 1 week | Dashboard |

# EXECUTION BOARD — Spirit Revival Africa
## Prioritized Roadmap: 48 Hours → 7 Days → 30 Days

---

## SCORING METHODOLOGY

Each task is scored on three dimensions:
- **Impact** (1-5): How much this improves the product/security/SEO
- **Effort** (1-5): How much work is required (1 = trivial, 5 = major)
- **Risk** (1-5): What happens if this is NOT done (5 = critical exposure)

**Priority Score = (Impact × 2) + Risk - Effort**

---

## 🔴 48-HOUR SPRINT (Score ≥ 10)

| # | Task | Impact | Effort | Risk | Score | Status |
|---|------|:---:|:---:|:---:|:---:|:---:|
| 1 | Deploy Google OAuth fix | 5 | 1 | 5 | **14** | ✅ CODE DONE |
| 2 | Deploy file upload validation | 5 | 1 | 4 | **13** | ✅ CODE DONE |
| 3 | Deploy login throttle | 4 | 1 | 4 | **11** | ✅ CODE DONE |
| 4 | Hide live stats counter on homepage | 4 | 1 | 4 | **11** | ⬜ TODO |
| 5 | Add `google-auth` to requirements.txt (verify present) | 5 | 1 | 5 | **14** | ✅ VERIFIED |
| 6 | Deploy security headers (referrer, permissions) | 3 | 1 | 3 | **8** | ✅ CODE DONE |
| 7 | Deploy robots.txt + sitemap.xml fixes | 3 | 1 | 3 | **8** | ✅ CODE DONE |
| 8 | Deploy per-page meta tags | 4 | 1 | 3 | **10** | ✅ CODE DONE |
| 9 | Change admin URL from /admin/ | 3 | 1 | 4 | **9** | ⬜ TODO |
| 10 | Create og-image.png (1200×630) | 3 | 2 | 2 | **6** | ⬜ TODO |

**48-Hour Deliverable:** All security patches deployed, SEO basics live, stats counter hidden, admin URL changed.

---

## 🟡 7-DAY SPRINT (Score 6-9)

| # | Task | Impact | Effort | Risk | Score | Status |
|---|------|:---:|:---:|:---:|:---:|:---:|
| 11 | Install + configure django-csp | 5 | 2 | 5 | **13** | ⬜ TODO |
| 12 | Self-host Inter font | 3 | 2 | 1 | **5** | ⬜ TODO |
| 13 | Code-split all routes (lazy loading) | 4 | 2 | 2 | **8** | ⬜ TODO |
| 14 | Add Cloudinary transformation params | 4 | 2 | 2 | **8** | ⬜ TODO |
| 15 | Seed gallery with 10+ photos | 4 | 2 | 3 | **9** | ⬜ TODO |
| 16 | Seed prayer wall with 5+ requests | 3 | 1 | 2 | **7** | ⬜ TODO |
| 17 | Seed content library with 3+ articles | 4 | 3 | 2 | **7** | ⬜ TODO |
| 18 | Pin all Python dependencies | 3 | 1 | 3 | **8** | ⬜ TODO |
| 19 | Register Google Search Console | 4 | 1 | 3 | **10** | ⬜ TODO |
| 20 | Submit sitemap to GSC | 3 | 1 | 3 | **8** | ⬜ TODO |
| 21 | Set up vite-plugin-prerender | 5 | 3 | 4 | **11** | ⬜ TODO |
| 22 | Simplify registration (email+name+password first) | 5 | 3 | 4 | **11** | ⬜ TODO |
| 23 | Add pip-audit to build/CI | 3 | 1 | 3 | **8** | ⬜ TODO |

**7-Day Deliverable:** CSP headers live, pre-rendering deployed, registration simplified, content seeded, Google Search Console active.

---

## 🟢 30-DAY SPRINT (Score 1-5)

| # | Task | Impact | Effort | Risk | Score | Status |
|---|------|:---:|:---:|:---:|:---:|:---:|
| 24 | Migrate JWT to httpOnly cookies | 4 | 4 | 3 | **5** | ⬜ TODO |
| 25 | Add structured data (JSON-LD) | 3 | 2 | 1 | **5** | ⬜ TODO |
| 26 | Implement security monitoring/alerting | 3 | 3 | 3 | **6** | ⬜ TODO |
| 27 | Add admin 2FA (django-otp) | 3 | 3 | 4 | **7** | ⬜ TODO |
| 28 | Audit serializer field exposure | 3 | 2 | 3 | **7** | ⬜ TODO |
| 29 | Add accessibility (ARIA, keyboard, contrast) | 3 | 4 | 2 | **4** | ⬜ TODO |
| 30 | Delete dead code (consumers.py, routing.py) | 2 | 1 | 1 | **4** | ⬜ TODO |
| 31 | Install analytics (GA4 or Plausible) | 3 | 1 | 2 | **7** | ⬜ TODO |
| 32 | Create testimony carousel for homepage | 4 | 3 | 2 | **7** | ⬜ TODO |
| 33 | Restructure navigation (hide empty features) | 3 | 2 | 2 | **6** | ⬜ TODO |
| 34 | Add auto-approval for email-verified accounts | 4 | 2 | 3 | **9** | ⬜ TODO |
| 35 | Implement audit log rotation (90 days) | 2 | 2 | 2 | **4** | ⬜ TODO |
| 36 | Add error boundary per-page (not just top-level) | 2 | 2 | 2 | **4** | ⬜ TODO |
| 37 | Optimize DB queries (select_related) | 3 | 3 | 1 | **4** | ⬜ TODO |
| 38 | Increase polling interval to 15s (messaging) | 2 | 1 | 1 | **4** | ⬜ TODO |

---

## DEPENDENCY CHAIN

Some tasks have dependencies. Respect this order:

```
Google OAuth Fix (#1)  ← Must deploy BEFORE any new Google signups
    ↓
CSP Headers (#11)      ← Test in report-only mode BEFORE enforcing
    ↓
JWT Cookie Migration (#24) ← Requires CSRF setup BEFORE removing localStorage tokens

Pre-rendering (#21)    ← Must be set up BEFORE GSC indexing request (#20)
                         (otherwise Google caches the empty HTML)

Registration Simplification (#22) ← Should coincide with content seeding (#15-17)
                                     (so new users have something to see)
```

---

## DEPLOYMENT CHECKLIST

### Before Deploying Patches:

- [ ] Backup database
- [ ] Run `python manage.py test` (if tests exist)
- [ ] Verify `google-auth` in production `pip freeze`
- [ ] Set `GOOGLE_CLIENT_ID` in production env vars
- [ ] Set `ADMIN_ALLOWED_IPS` in production env vars (if implementing IP restriction)
- [ ] Test Google OAuth flow end-to-end after deployment
- [ ] Test file upload with valid images after deployment
- [ ] Test file upload with a renamed `.txt → .jpg` to verify rejection
- [ ] Monitor error logs for 24 hours post-deploy

### After Deploying:

- [ ] Verify robots.txt accessible at https://spiritrevivalafrica.com/robots.txt
- [ ] Verify sitemap.xml accessible at https://spiritrevivalafrica.com/sitemap.xml
- [ ] Check page titles on each public route (View Source or browser tab)
- [ ] Verify OG tags with https://developers.facebook.com/tools/debug/
- [ ] Test login throttle: attempt 11+ rapid logins — should be blocked
- [ ] Check security headers: https://securityheaders.com/?q=spiritrevivalafrica.com
- [ ] Submit sitemap to Google Search Console

---

## PROGRESS TRACKING

### Completed in This Audit Session:
- ✅ 8 code patches applied and documented
- ✅ 10 forensic report files created
- ✅ All vulnerabilities verified from source code
- ✅ All audit claims validated with file:line evidence

### Immediate Next Steps (for the development team):
1. **Deploy all backend patches** (views.py, serializers.py, settings.py)
2. **Deploy all frontend patches** (index.html, robots.txt, sitemap.xml, usePageMeta + page integrations)
3. **Hide stats counter** on homepage
4. **Change admin URL**
5. **Begin content seeding** (gallery photos, prayer requests, articles)

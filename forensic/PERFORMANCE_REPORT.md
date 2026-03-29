# PERFORMANCE REPORT — Spirit Revival Africa
## Core Web Vitals Analysis & Optimization Plan

---

## CURRENT PERFORMANCE PROFILE

### Architecture Bottlenecks

| Layer | Issue | Impact on Performance |
|-------|-------|----------------------|
| Frontend | Full CSR — empty HTML shell until JS parses | LCP 3-5s+ |
| Frontend | No code splitting on 16 of 20 routes | Large initial bundle |
| Frontend | Google Fonts loaded via external CSS | Render-blocking |
| Frontend | Framer Motion loaded on every page | Unnecessary JS for non-animated pages |
| Backend | Neon PostgreSQL cold starts | 500-1500ms first-request latency |
| Backend | `conn_max_age=0` — new DB connection per request | ~50ms overhead per request |
| Backend | No Redis cache — every API call hits DB | No request caching |
| Hosting | cPanel/Passenger WSGI | Limited concurrency |
| Media | Cloudinary images without transformation params | Full-resolution images served |

---

## CORE WEB VITALS ESTIMATES

### LCP (Largest Contentful Paint) — POOR

**Current estimate: 4-6 seconds on 3G / 2-3 seconds on 4G**

Why:
1. Browser downloads `index.html` (empty shell) — 100ms
2. Browser discovers and downloads JS bundle — 500-1500ms depending on connection
3. React initializes, router resolves, component mounts — 200-500ms
4. Component fires API call for dynamic content — 200-2000ms (cold start)
5. Content renders — LCP fires

**The LCP element** on the homepage is the hero section's background image/collage. This image is not preloaded and depends on React rendering before it's even requested.

**Target: < 2.5 seconds**

### FID/INP (Interaction to Next Paint) — LIKELY GOOD

**Current estimate: 50-100ms**

The app doesn't have heavy input handlers. React event delegation is efficient. Framer Motion animations are GPU-accelerated. This metric is likely passing.

**Target: < 200ms (already meeting)**

### CLS (Cumulative Layout Shift) — MODERATE RISK

**Current estimate: 0.1-0.3**

Risk factors:
- Dynamic content loading causes layout shifts when API data arrives
- Images without explicit `width`/`height` attributes
- Font swap from system font → Google Fonts Inter causes text reflow

**Target: < 0.1**

---

## OPTIMIZATION PLAN

### Priority 1: Reduce LCP (Biggest impact)

#### 1a. Preload Hero Image
Add to `index.html`:
```html
<link rel="preload" as="image" href="/path/to/hero-image.webp" type="image/webp">
```

This starts downloading the LCP image BEFORE JavaScript even loads.

#### 1b. Pre-render Homepage HTML
Using `vite-plugin-prerender` (see SEO_RECOVERY_PLAN.md), the homepage HTML will contain actual content. This means:
- Googlebot sees real content immediately
- LCP fires on the pre-rendered HTML, not after JS execution
- Estimated LCP improvement: **2-3 seconds faster**

#### 1c. Self-Host Google Fonts
Current: `<link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet">`

This requires:
1. DNS resolution for fonts.googleapis.com (100-200ms)
2. CSS download (50-100ms)
3. DNS resolution for fonts.gstatic.com (100-200ms)
4. Font file download (100-500ms)

Self-hosting eliminates steps 1-2 and reduces total font load time by 200-400ms.

**Implementation:**
```bash
# Download Inter font files
# Place in frontend/public/fonts/Inter-Variable.woff2
# Update CSS to use local files
```

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

### Priority 2: Reduce Bundle Size

#### 2a. Aggressive Code Splitting
Currently only 4 pages are lazy-loaded. Add lazy loading to ALL non-homepage routes:

```javascript
// router/index.jsx
const PrayerPage = lazy(() => import("../pages/PrayerPage"));
const GroupsPage = lazy(() => import("../pages/GroupsPage"));
const HubsPage = lazy(() => import("../pages/HubsPage"));
const DiscipleshipPage = lazy(() => import("../pages/DiscipleshipPage"));
const WorshipPage = lazy(() => import("../pages/WorshipPage"));
const BeneathTheCrownPage = lazy(() => import("../pages/BeneathTheCrownPage"));
// ... etc
```

**Estimated savings: 40-60% reduction in initial bundle**

#### 2b. Analyze Bundle with Vite
```bash
npx vite-bundle-visualizer
```

Identify:
- Framer Motion's bundle contribution (typically 30-50KB gzipped)
- Unused dependencies
- Duplicate dependencies

#### 2c. Tree-Shake Framer Motion
If only using basic animations:
```javascript
// Instead of:
import { motion } from "framer-motion";
// Use:
import { motion } from "framer-motion/m";
// Or import only needed features
```

### Priority 3: Optimize Images

#### 3a. Cloudinary Transformation Parameters
Current gallery images load at full resolution. Add Cloudinary transformations:

```javascript
// Transform Cloudinary URLs:
// FROM: https://res.cloudinary.com/dybvwbfdp/image/upload/v123/photo.jpg
// TO:   https://res.cloudinary.com/dybvwbfdp/image/upload/w_800,f_auto,q_auto/v123/photo.jpg
```

Parameters:
- `w_800` — max width 800px (gallery grid doesn't need more)
- `f_auto` — serve WebP to supporting browsers, JPEG to others
- `q_auto` — automatic quality optimization (typically 60-80% reduction)

**Estimated savings: 60-80% image payload reduction**

#### 3b. Add explicit dimensions to images
```html
<!-- Prevent CLS by specifying dimensions -->
<img width="400" height="300" loading="lazy" ... />
```

### Priority 4: API Response Optimization

#### 4a. Django Response Caching
For public endpoints that don't change frequently:

```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

class PlatformStatsView(APIView):
    @method_decorator(cache_page(300))  # 5-minute cache
    def get(self, request):
        ...
```

#### 4b. Database Query Optimization
Add `select_related()` and `prefetch_related()` to queryset-heavy views:

```python
# Instead of N+1 queries:
users = User.objects.all()
# Use:
users = User.objects.select_related('hub').prefetch_related('groups')
```

#### 4c. Neon Cold Start Mitigation
Options:
1. **Neon Autoscaling** — keep minimum 1 compute unit warm
2. **Health check endpoint** — cron job pinging `/api/health/` every 4 minutes to prevent cold starts
3. **Connection pooling** — increase `conn_max_age` to 60 seconds if not using external pooler

---

## PERFORMANCE BUDGET

| Metric | Current (est.) | Target | Budget |
|--------|:-:|:-:|:-:|
| LCP | 4-6s | < 2.5s | 2.5s |
| FID/INP | 50-100ms | < 100ms | 100ms |
| CLS | 0.1-0.3 | < 0.1 | 0.1 |
| Total JS bundle | ~400KB (est.) | < 200KB | 200KB gzip |
| Total CSS | ~50KB (est.) | < 30KB | 30KB gzip |
| Hero image | ~200KB (est.) | < 100KB | 100KB |
| Time to Interactive | 5-8s | < 3s | 3s |
| API response (warm) | 200-500ms | < 150ms | 150ms |
| API response (cold) | 1-3s | < 500ms | 500ms |

---

## IMPLEMENTATION PRIORITY

| # | Optimization | Impact | Effort | Priority |
|---|-------------|:---:|:---:|:---:|
| 1a | Preload hero image | HIGH | LOW | **P0** |
| 1c | Self-host fonts | MEDIUM | LOW | **P0** |
| 2a | Code split all routes | HIGH | LOW | **P1** |
| 3a | Cloudinary transformations | HIGH | LOW | **P1** |
| 1b | Pre-render homepage | HIGH | MEDIUM | **P1** |
| 3b | Image dimensions for CLS | MEDIUM | LOW | **P2** |
| 4a | API response caching | MEDIUM | LOW | **P2** |
| 4b | Query optimization | MEDIUM | MEDIUM | **P3** |
| 4c | Cold start mitigation | MEDIUM | LOW | **P3** |
| 2b | Bundle analysis | LOW | LOW | **P3** |
| 2c | Tree-shake Framer Motion | LOW | MEDIUM | **P4** |

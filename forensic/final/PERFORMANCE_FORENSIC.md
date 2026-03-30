# PERFORMANCE FORENSIC — Spirit Revival Africa
**Audit Date:** 2025  
**Scope:** LCP/CLS risks, image loading, font loading, JavaScript bundle, API data fetching

---

## 1. Build Configuration (`frontend/vite.config.js`)

```js
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
});
```

**Code splitting analysis:**
- ✅ `vendor` chunk: React, ReactDOM, react-router-dom separated from app code
- ✅ `motion` chunk: framer-motion (large library ~120KB gzip) isolated — only loaded on pages that use it
- ✅ `forms` chunk: react-hook-form + zod + resolvers isolated — only loaded on form pages

**Gaps:**
- ❌ `@react-oauth/google` is not in a separate chunk — adds to main bundle or vendor
- ❌ No lazy loading of page components (`React.lazy()` / `Suspense`) — all pages bundled together
- ❌ No dynamic imports for heavy pages like `ProfileSettingsPage`

**Estimated bundle without lazy loading:**
Main bundle likely 200-400KB gzipped for all pages loaded upfront.

---

## 2. Font Loading

**From `frontend/index.html`:**
```html
<!-- TO ACTIVATE: download Inter woff2 files to /public/fonts/ -->
<!-- Fallback: Google Fonts (remove once self-hosted) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:..." />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
```

**Status:** Using Google Fonts CDN (the self-hosted option is commented out).

**Performance impact:**
- ✅ `preconnect` to Google Fonts origin — eliminates DNS lookup latency
- ✅ `preload as="style"` — font stylesheet preloaded
- ⚠️ `display=swap` is set implicitly by `&display=swap` in the URL ✅
- ⚠️ 7 font weights (300-900) requested — unnecessary; 400, 600, 700, 800 are sufficient for this design
- ⚠️ External dependency: if Google Fonts is slow or blocked (Africa region, some ISPs), Inter falls back to `sans-serif` — text appears but styled sub-optimally
- ⚠️ Self-hosted option is stubbed but not activated — the `/public/fonts/` directory is empty

**LCP Impact:** Font is render-blocking if the CDN is slow. The preload mitigates this but doesn't eliminate it.

---

## 3. Image Loading — Hero Collage (`DynamicCollage.jsx`)

The hero collage fetches up to 24 images from `/api/hero-collage/`. Each image is rendered as:
```jsx
<img src={photo.url} alt={...} className="h-full w-full object-cover" />
```

**Issues:**
- ❌ No `loading="lazy"` attribute on any image
- ❌ No `width` / `height` attributes — causes CLS (Cumulative Layout Shift) as images load
- ❌ No `srcset` / `sizes` for responsive images
- ❌ No image size limits on FetchedPhoto (Pexels/Unsplash images can be several MB)

**LCP Impact:** The hero section (above the fold) includes heavy images. Without lazy loading or proper sizing, the hero will cause high LCP times — especially on mobile in low-bandwidth African markets.

---

## 4. Image Loading — Founder Photo

In `HomePage.jsx`:
```jsx
<img src="/washika.jpg" alt="W. Washika" className="h-full w-full object-cover object-top" />
```
- No `width`/`height` → CLS risk
- No `loading="lazy"` (but it's below the fold — lazy would be appropriate here ✅ needed)
- No WebP version offered

---

## 5. Story Cards — Image Loading

```jsx
{story.photo_url ? (
  <div className="relative h-48 w-full overflow-hidden">
    <img src={story.photo_url} alt={story.title}
         className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
  </div>
) : ...}
```
- ❌ No `loading="lazy"` — card images load eagerly regardless of viewport
- ❌ No `width`/`height` attributes
- The `h-48` container holds the aspect ratio — CLS is partially mitigated by the fixed-height container ✅

---

## 6. API Fetching Pattern

### HomePage data flow
```js
fetchFeed() → getHomeFeed({ stories_limit: 3 }) + announcements + heroCollage
```
All 3 data sources are fetched independently (not in parallel via `Promise.all()`).

**File: `src/pages/HomePage.jsx`**
```js
const fetchFeed = () => {
  let mounted = true;
  getHomeFeed({ stories_limit: 3 })
    .then(({ data }) => { ... })
    .catch(() => { ... });
  return () => { mounted = false; };
};
```
- `AnnouncementBanner` has its own fetch
- `DynamicCollage` has its own fetch
- All 3 fire simultaneously on mount → 3 parallel API calls ✅ (at least they're not sequential)

**But:** each runs independently — no shared loading state. Hero, announcements, and feed all have separate loading states. Content appears piecemeal. This can cause visible layout jumps.

---

## 7. Framer Motion Usage

The `motion` chunk is correctly isolated but not audited in detail. If used heavily on the homepage (which has many animated elements), it may increase TTI (Time to Interactive).

`framer-motion` at version 12.34.3 is mature and tree-shakeable. Usage on just the hero section is acceptable.

---

## 8. Prayer Page — Pagination

```jsx
useEffect(() => {
  api.get("/prayer/requests/")
    .then((r) => {
      setRequests(r.data.results || []);
      setNextUrl(r.data.next || null);
    })
}, []);
```
- ✅ Uses cursor-style pagination (DRF `PageNumberPagination` with `PAGE_SIZE=20`)
- ✅ "Load More" button lazy-loads additional pages
- ❌ No skeleton loading state for initial load — just 4 `animate-pulse` skeleton cards (acceptable ✅)

---

## 9. No Testing / Monitoring

- No Vite build analysis tool (`rollup-plugin-visualizer`) in devDependencies — no way to see bundle composition
- No performance monitoring (Lighthouse CI, Sentry, etc.)
- No Service Worker / PWA capabilities
- No HTTP caching headers configured beyond what nginx/Apache defaults provide
- No CDN / edge caching configured in deploy configs (neither railway.json nor render.yaml show CDN config)

---

## 10. Backend Performance Notes

### Database
- Local: SQLite (dev) — no concerns
- Production: PostgreSQL via Neon (from `conn_max_age=0` comment) — connection pooled via PgBouncer
- `conn_health_checks=True` ✅ — stale connections discarded

### API Query Issues (potential)
- `PlatformStatsView`: runs 4 separate queries (nations, groups, users, testimonies count) on every request — no caching
- `AdminStatsView`: multiple aggregation queries on every admin dashboard load — no caching
- `HeroCollageView`: fetches and shuffles up to 24 items — shuffle on every request, no caching

### CORS Preflight
```python
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours cache
```
✅ Preflight responses cached for 24 hours — reduces OPTIONS request overhead.

---

## 11. Performance Scores Summary

| Criterion | Status | Score |
|---|---|---|
| Code splitting (Vite chunks) | ✅ Good baseline | 7/10 |
| Route-level lazy loading | ❌ None | 1/10 |
| Image lazy loading | ❌ None anywhere | 0/10 |
| LCP risk (hero images) | ❌ High risk, no sizing | 2/10 |
| CLS risk (no width/height on images) | ⚠️ Partial mitigation | 3/10 |
| Font loading | ✅ Preconnect + preload | 7/10 |
| Font weight pruning | ⚠️ 7 weights loaded (need 4) | 4/10 |
| API parallelism | ✅ 3 parallel fetches | 7/10 |
| Backend caching | ❌ None | 2/10 |
| PWA / Service Worker | ❌ None | 0/10 |
| **Overall Performance** | — | **3.3/10** |

---

## 12. Recommendations

### P0 — Add lazy loading to images
```jsx
<img src={story.photo_url} loading="lazy" width={400} height={192} ... />
```
Apply to: story cards, founder photo, gallery images, all collage images below fold.

### P0 — Hero image LCP optimisation
First collage image should use `loading="eager"` with `fetchpriority="high"`. Others lazy.

### P1 — Route-level code splitting
```jsx
// In router/index.jsx:
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProfileSettingsPage = React.lazy(() => import('./pages/ProfileSettingsPage'));
// ...wrapped in <Suspense fallback={<LoadingSpinner />}>
```

### P1 — Reduce font weights
```
?family=Inter:wght@400;600;700;800&display=swap
```
Remove 300, 500, 900.

### P2 — Add width/height to images
Use actual rendered dimensions as `width`/`height` attributes to prevent CLS.

### P2 — Install bundle visualizer
```
npm install -D rollup-plugin-visualizer
```

### P3 — Add Redis caching for heavy reads
Cache `PlatformStatsView`, `AnnouncementPublicListView`, `HeroCollageView` for 60-300 seconds.

### P3 — Self-host Inter font
Download woff2 files to `/public/fonts/`, uncomment the preload tags in `index.html`, remove Google Fonts `link` tags.

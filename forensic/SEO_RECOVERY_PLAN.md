# SEO RECOVERY PLAN — Spirit Revival Africa
## From Invisible to Indexable

---

## CURRENT SEO STATE: CATASTROPHIC

### Why the Site is Invisible to Google

1. **100% Client-Side Rendering (CSR)** — Google receives an empty `<div id="root"></div>` for every URL. While Googlebot CAN execute JavaScript, it:
   - Defers JS-rendered content to a "second wave" of indexing
   - Often fails to render complex SPAs
   - Cannot follow client-side route transitions
   - Sees zero content on initial crawl

2. **Identical meta tags on ALL pages** — Before our fix, every page had the same `<title>` and `<meta description>`. Google treats this as duplicate content.

3. **No structured data** — No JSON-LD, no schema.org markup. Google has no machine-readable context about the site's content type.

4. **No canonical URLs** — Pages have no `<link rel="canonical">` tags.

5. **Thin content** — Most pages have zero user-generated content.

---

## FIXES ALREADY APPLIED ✅

### Fix 1: Per-Page Meta Tags (usePageMeta hook)
- Created `frontend/src/hooks/usePageMeta.js`
- Integrated into 8 public-facing pages with unique titles and descriptions
- Each page now sets: document.title, meta description, og:title, og:description, og:image, twitter:title, twitter:description, twitter:image

### Fix 2: index.html Defaults
- Rewrote default title: "Spirit Revival Africa — Reigniting the Holy Spirit Across Africa"
- Added keyword-rich meta description
- Set proper OG image dimensions (1200×630)

### Fix 3: robots.txt
- Blocked /api/, /messages, /dashboard, /profile, /verify-email, /reset-password
- Prevents crawl budget waste on auth-gated routes

### Fix 4: sitemap.xml
- Removed auth-gated routes
- Added lastmod dates
- Proper priority hierarchy

**Impact of these fixes:** Moderate improvement for Googlebot's second-wave JS rendering. But the fundamental CSR problem remains.

---

## CRITICAL: THE CSR PROBLEM AND SOLUTIONS

### Option A: Pre-Rendering with vite-plugin-prerender (RECOMMENDED)

**Effort:** LOW (1-2 days)
**Impact:** HIGH

Install `vite-plugin-prerender` to generate static HTML for public routes at build time:

```javascript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import prerender from "vite-plugin-prerender";

export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: [
        "/",
        "/content",
        "/prayer",
        "/groups",
        "/hubs",
        "/discipleship",
        "/worship",
        "/book/beneath-the-crown",
        "/gallery",
      ],
      renderer: new prerender.PuppeteerRenderer({
        renderAfterTime: 5000,
      }),
    }),
  ],
});
```

**What this does:**
- At build time, launches headless Chrome to render each route
- Captures the fully-rendered HTML
- Saves it as static HTML files
- When Googlebot visits `/prayer`, it gets a fully-rendered HTML page instead of an empty shell

**Limitations:**
- Only works for STATIC routes (not `/story/:slug` or `/discipleship/course/:courseId`)
- Build time increases by ~30 seconds
- Content is only as fresh as the last deployment

### Option B: Server-Side Rendering with React Router SSR

**Effort:** HIGH (1-2 weeks)
**Impact:** VERY HIGH

Migrate to React Router's built-in SSR capabilities (v7+):

```
1. Convert vite.config.js to use React Router's Vite plugin
2. Add loader functions to each route for server-side data fetching
3. Deploy with a Node.js server (move off cPanel static hosting)
```

**Tradeoffs:**
- Requires a Node.js hosting environment (not available on current cPanel setup)
- Significant code restructuring
- Better long-term solution for dynamic content pages

### Option C: Hybrid — Static Homepage + CSR Everything Else

**Effort:** MEDIUM (3-5 days)
**Impact:** MODERATE

Pre-render ONLY the homepage and key landing pages. Keep everything else as CSR.

This is the pragmatic middle ground — it gives Google a real homepage to index while avoiding a full SSR migration.

---

## SEO ACTION PLAN

### Week 1: Meta Tags + Technical SEO (DONE ✅)

- [x] Per-page titles and descriptions
- [x] OG image setup
- [x] robots.txt hardening
- [x] sitemap.xml rebuild

### Week 2: Pre-Rendering Setup

1. Install `vite-plugin-prerender` or equivalent
2. Configure pre-rendering for 9 public routes
3. Test build output — verify HTML contains actual content
4. Deploy and request re-indexing via Google Search Console

### Week 3: Structured Data

Add JSON-LD to key pages:

**Homepage — Organization schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "ReligiousOrganization",
  "name": "Spirit Revival Africa",
  "url": "https://spiritrevivalafrica.com",
  "description": "Reigniting the Holy Spirit Across Africa",
  "foundingDate": "2024",
  "areaServed": "Africa"
}
```

**Book page — Book schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Book",
  "name": "Beneath the Crown",
  "author": {
    "@type": "Person",
    "name": "W. Washika"
  }
}
```

**Content articles — Article schema (per item)**

### Week 4: Google Search Console + Analytics

1. **Register** spiritrevivalafrica.com in Google Search Console
2. **Submit** sitemap.xml
3. **Request indexing** for all public URLs
4. **Install** Google Analytics 4 or privacy-respecting alternative (Plausible, Umami)
5. **Monitor** Core Web Vitals from real user data

---

## PER-PAGE SEO TEMPLATE

| Page | Title | Meta Description | Priority Keywords |
|------|-------|-----------------|-------------------|
| Homepage | Spirit Revival Africa — Reigniting the Holy Spirit Across Africa | Join a Christ-centred community reigniting revival across Africa through prayer, discipleship, and worship | revival africa, holy spirit, christian community africa |
| Prayer | Prayer Wall \| Spirit Revival Africa | Lift up and intercede for prayer requests from believers across Africa | prayer wall, prayer requests africa, intercede |
| Groups | Ministry Groups \| Spirit Revival Africa | Connect with ministry groups and serve together across the African continent | ministry groups, christian ministry africa |
| Hubs | Revival Hubs \| Spirit Revival Africa | Find and join a Spirit Revival Hub in your city or start one in your community | revival hubs, christian community, church network africa |
| Discipleship | Discipleship Courses \| Spirit Revival Africa | Grow your faith with Bible-based discipleship courses and study guides | discipleship courses, bible study africa, faith growth |
| Worship | Shouts of Joy Melodies — Worship Team \| Spirit Revival Africa | Meet the worship team behind Shouts of Joy Melodies and experience African praise | worship team, african worship, shouts of joy melodies |
| Book | Beneath the Crown — By W. Washika \| Spirit Revival Africa | Explore Beneath the Crown by W. Washika — a powerful spiritual book on identity and purpose | beneath the crown, w washika, christian book africa |
| Content | Content Library \| Spirit Revival Africa | Sermons, devotionals, and teachings from Spirit Revival Africa's ministry | sermons, devotionals, christian content africa |
| Gallery | Gallery \| Spirit Revival Africa | Photos and moments from Spirit Revival Africa's ministry events across the continent | gallery, ministry photos, christian events africa |

---

## OG IMAGE REQUIREMENTS

Create a `og-image.png` at exactly **1200 × 630 pixels**:

**Design specs:**
- Background: SRA brand color gradient or ministry photo
- Logo: Top-left or centered
- Text: "Spirit Revival Africa" in large type
- Tagline: "Reigniting the Holy Spirit Across Africa"
- Format: PNG or JPG, < 300KB
- Place in: `frontend/public/og-image.png`

**Per-page OG images (advanced):**
For maximum social sharing impact, create unique OG images for:
- Book page (book cover)
- Gallery page (photo collage)
- Each content article (article thumbnail)

---

## TIMELINE TO INDEXING

| Milestone | ETA | Status |
|-----------|-----|--------|
| Meta tags applied | Done | ✅ |
| Sitemap submitted to GSC | Week 1 | ⬜ |
| Pre-rendering deployed | Week 2 | ⬜ |
| Structured data added | Week 3 | ⬜ |
| First organic impressions | Week 4-6 | ⬜ |
| First page 1 ranking | Month 2-3 | ⬜ |
| 50+ daily organic visitors | Month 4-6 | ⬜ |

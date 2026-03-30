# VIRAL LOOP AUDIT — Spirit Revival Africa
**Audit Date:** 2025  
**Scope:** ShareButton implementation, OG tags, deep links, share preview quality, growth hooks

---

## 1. ShareButton Component (`src/components/ShareButton.jsx`)

### Architecture
```
ShareButton({ endpoint, label, className })
  → onClick: calls GET {endpoint} to load share card data
  → Opens dropdown with 4 options:
     1. "Share now"       — navigator.share() or clipboard fallback
     2. "Share on WhatsApp" — wa.me link with encoded text
     3. "Copy share text" — clipboard copy of formatted text
     4. "Join the movement" — links to /register (growth hook ✅)
```

### Share Data Format (from backend)
```json
{
  "title": "Prayer title or content title",
  "excerpt": "First 200 chars...",
  "url": "https://spiritrevivalafrica.com/prayer",
  "cta": "Stand in prayer → ...",
  "whatsapp_caption": "🙏 *Prayer Request...*\n\n..."
}
```

### WhatsApp Integration
```jsx
const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareData.url || joinUrl}`.trim())}`
```
- ✅ Mobile-native: opens WhatsApp with prefilled message
- ✅ Properly URL-encoded
- ✅ WhatsApp caption includes emoji formatting (`*bold*`)
- ✅ Falls back to content URL if no share URL provided

### Native Share API
```jsx
if (navigator.share) {
  await navigator.share({ title, text, url });
}
```
- ✅ Uses Web Share API when available (mobile browsers)
- ✅ Falls back to clipboard copy when unavailable
- ✅ Error handled gracefully

### Growth Hook
Every `ShareButton` dropdown includes a "Join the movement" link → `/register`. This means every shared item drives traffic into the recruitment funnel. ✅

---

## 2. Share Endpoints

### Prayer Request Share
```
GET /api/prayer/requests/{id}/share/
Permission: AllowAny
Guard: status=APPROVED AND is_public=True → returns 404 otherwise ✅
```
**Response:**
```json
{
  "title": "...",
  "excerpt": "...(200 chars)...",
  "url": "https://spiritrevivalafrica.com/prayer",
  "cta": "Stand in prayer → spiritrevivalafrica.com/prayer",
  "whatsapp_caption": "🙏 *Prayer Request — Spirit Revival Africa*\n\n*{title}*\n\n..."
}
```
**⚠️ Deep Link Issue:** `url` points to `/prayer` (the list), NOT `/prayer/{id}`. A recipient gets a link to the prayer list, not the specific prayer. No way to scroll to the specific item.

### Short Story Share
```
GET /api/content/short-stories/{id}/share/
Permission: AllowAny (from StoryPage.jsx usage)
Guard: Not verified server-side — endpoint blindly serves data for any accessible story
```
**Response:**
```
url → "https://spiritrevivalafrica.com/content"  ← ⚠️ WRONG
```
**⚠️ CRITICAL Deep Link Issue:** The story share URL points to `/content` (the content library), not `/stories/{id}`. The correct URL should be `{FRONTEND_URL}/stories/{id}`. This means anyone who shares a story sends recipients to the wrong page.

**However:** On `StoryPage.jsx`, the `ShareButton` endpoint is:
```jsx
<ShareButton endpoint={`/content/short-stories/${story.id}/share/`} />
```
So the correct story ID is in the endpoint, but the returned `url` is still `/content`. The native share and WhatsApp will both share the wrong link.

### ContentItem Share
```
GET /api/content/items/{id}/share/
Permission: AllowAny
Guard: item.approved must be True ✅
```
**Response:**
```
url → "https://spiritrevivalafrica.com/content"
```
**⚠️ Deep Link Issue:** All content item shares point to `/content` — the entire library page. No deep link to the specific item.

---

## 3. Open Graph Tags

### Static OG Tags (`frontend/index.html`)
```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Spirit Revival Africa" />
<meta property="og:title" content="Spirit Revival Africa — Reigniting the Holy Spirit Across Africa" />
<meta property="og:description" content="Join Africa's growing interdenominational revival movement..." />
<meta property="og:image" content="https://spiritrevivalafrica.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://spiritrevivalafrica.com/" />
<meta name="twitter:card" content="summary_large_image" />
```
✅ OG tags exist with correct dimensions declared.

### Dynamic OG Tags (via `usePageMeta`)
```jsx
setMeta('meta[property="og:title"]', fullTitle);
setMeta('meta[property="og:description"]', desc);
setMeta('meta[property="og:image"]', image);
setMeta('meta[name="twitter:title"]', fullTitle);
setMeta('meta[name="twitter:description"]', desc);
setMeta('meta[name="twitter:image"]', image);
```
- Updates title, description, og:image per page ✅
- **Does NOT update `og:url`** — canonical URL stays as homepage for all pages ⚠️
- **Does NOT update `twitter:url`** ⚠️

### OG Image File
Referenced at: `https://spiritrevivalafrica.com/og-image.png`  
**⚠️ Missing:** `og-image.png` is NOT in `frontend/public/`. The file referenced in all OG tags does not exist. When shared on social media, the image card will show broken/missing image on Facebook, Twitter, LinkedIn, WhatsApp web.

---

## 4. Deep Link Analysis

| Share Type | Shared URL | Correct? | Impact |
|---|---|---|---|
| Specific story | `/stories/{id}` | **✅ On story page, ShareButton sends user to /stories/{id}** (wait — the API returns `/content` not `/stories/{id}`, so NO) | ❌ High: shared story link goes to content library |
| Prayer request | `/prayer` | ❌ List page — lost context | MEDIUM: recipient sees all prayers, not the one shared |
| Content item | `/content` | ❌ Library page — lost context | LOW for library, no individual deep links |
| Homepage | `https://spiritrevivalafrica.com/` | ✅ | — |
| Register | `/register` (growth hook) | ✅ | — |

**Corrective action needed:** Each share endpoint should return the specific front-end URL for that item:
- Story: `f"{FRONTEND_URL}/stories/{story.id}"`
- Prayer: `f"{FRONTEND_URL}/prayer"` (no individual prayer route exists — this is a UX gap)  
- ContentItem: `f"{FRONTEND_URL}/content"` (no individual content item route — library only)

---

## 5. Viral Loop Quality Score

| Mechanism | Status | Score |
|---|---|---|
| WhatsApp share | ✅ Working, branded caption | 9/10 |
| Native Share API | ✅ Working | 9/10 |
| Clipboard copy | ✅ Working | 8/10 |
| "Join the movement" CTA in share menu | ✅ Present | 9/10 |
| OG image | ❌ File missing | 0/10 |
| og:url per page | ❌ Not updated | 3/10 |
| Story deep link | ❌ Wrong URL in share response | 1/10 |
| Prayer deep link | ⚠️ No individual route | 4/10 |
| Twitter card | ✅ Declared, image missing | 4/10 |
| Overall viral loop | — | **5.2/10** |

---

## 6. Recommendations (Prioritised)

### P0 — Create the OG image
Create `/frontend/public/og-image.png` (1200×630px) with SRA branding. Every shared URL currently has a broken preview card.

### P1 — Fix story share URL
In `backend/apps/content/views.py` ShortStoryViewSet `share` action:
```python
# Current (wrong):
"url": f"{frontend_url}/content"
# Fix:
"url": f"{frontend_url}/stories/{story.id}"
```

### P2 — Update og:url in usePageMeta
```js
setMeta('meta[property="og:url"]', window.location.href);
```

### P3 — Individual prayer deep links
Create `/prayer/{id}` route with a single prayer view, and update the prayer share endpoint URL to use it.

### P4 — Add share button to HomePage stories
The story cards on the homepage have "Read more →" modal but no ShareButton. Adding one there extends the viral surface to the homepage.

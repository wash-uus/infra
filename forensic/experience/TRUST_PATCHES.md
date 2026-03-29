# TRUST_PATCHES.md — Trust Killers Removed

## Changes Applied to Code

### 1. Stats Counter — REMOVED
**File:** `frontend/src/pages/HomePage.jsx`
**Problem:** Live API showing 4 members, 0 testimonies, 1 nation. Actively destroys trust on arrival.
**Fix:** Removed the entire stats section and the `FALLBACK_STATS` constant. Also removed the `platformStats` state and its API fetch (`/common/platform-stats/`). Removed the `api` import that was only used for this fetch.
**Status:** ✅ Done

### 2. Scrolling Marquee (4× same scripture) — REPLACED
**File:** `frontend/src/pages/HomePage.jsx`
**Problem:** `[...Array(4)].map()` — Acts 1:7–9 repeated 4 times. Looked like a broken component.
**Fix:** Replaced with a clean, centered static blockquote (Acts 1:8 KJV) with amber citation. Single verse, full authority.
**Status:** ✅ Done

### 3. Fallback "Faith in Action / SRA Team" story — REMOVED
**File:** `frontend/src/pages/HomePage.jsx`
**Problem:** Hardcoded placeholder story pretending to be real community content.
**Fix:** When `stories.length === 0`, the Stories section now shows an empty state with: title "Stories are coming.", subtitle "Be the first to share what God has been doing in your life.", and a "Share Your Story" CTA linking to `/register`. This is honest and still drives conversion.
**Status:** ✅ Done

### 4. "Live Messaging" feature card — REMOVED
**File:** `frontend/src/pages/HomePage.jsx`
**Problem:** Public visitors clicking this hit a login wall — a dead end + trust kill.
**Fix:** Removed from the features array entirely.
**Status:** ✅ Done

### 5. "Revival Hubs" feature card — REMOVED
**File:** `frontend/src/pages/HomePage.jsx`
**Problem:** Leads to a thin/empty page — false promise on homepage.
**Fix:** Removed from the features array.
**Status:** ✅ Done

### 6. Features grid: 6 cards → 4 focused pillars
**File:** `frontend/src/pages/HomePage.jsx`
**Remaining:** Prayer Network | Content Library | Community Groups | Discipleship Courses
**Status:** ✅ Done

## What Was NOT Changed (intentionally)
- Stats API endpoint still exists in backend — untouched. Can be restored with threshold logic later.
- Hubs and Worship pages still exist and are still reachable by direct URL — just not promoted.
- Marquee CSS animation class (`animate-marquee`) still in Tailwind config — not removed.

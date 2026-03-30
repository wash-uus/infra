# EXPERIENCE FORENSIC — Spirit Revival Africa
**Audit Date:** 2025  
**Scope:** H1/CTA hierarchy, navigation, page-level UX, empty states, story flow, prayer badges, modals

---

## 1. Homepage (`src/pages/HomePage.jsx`)

### H1 Hierarchy
The homepage renders `<HeroSection />` as its first meaningful block. The actual `<h1>` lives inside `TextContent.jsx` (a child of HeroSection). The main page JSX has no top-level `<h1>` — heading hierarchy starts inside components.

**Assessment:** Functionally correct but the H1 is buried three components deep. Screen readers will find it. SEO bots will find it after JS executes.

### Content Sections (in DOM order)
1. `<HeroSection>` — hero collage + title + CTA buttons
2. `<AnnouncementBanner>` — horizontal ticker if any active announcements
3. Fixed quote block — Acts 1:8 KJV (hardcoded, always visible)
4. Founder section — W. Washika photo, bio, book link
5. Features grid — Prayer Network, Content Library, Community Groups, Discipleship Courses (4 cards, linking to real routes) ✅
6. Daily Bread — dynamic feed from `GET /api/content/home-feed/`, falls back to Acts 1:8 hardcoded ✅
7. Short Stories — 3 stories from feed, modal on "Read more →", link to full story page ✅
8. Empty state for stories — shows "Be the first to share" + link to `/stories/submit` ✅
9. Support section — PayPal donation button ✅
10. Final CTA — "Your Revival Journey Starts Here." + "Join the Movement — It's Free" button ✅

### CTA Analysis
- Primary CTA in hero: `CTAButtons.jsx` → "Join the Movement" (→ `/register`) + "Read the Book" ✅
- Secondary CTA at bottom: "Join the Movement — It's Free" → `/register` ✅
- Book CTA: "📖 Get the Book — KSH 600" → `/book/beneath-the-crown` ✅
- Support CTA: PayPal link with real account ✅

**Issue:** The features grid links to `/groups`, `/content`, `/prayer`, `/discipleship` — if those pages have no content (new/empty DB), users will hit empty states with no encouragement to create content. The UI handles this for prayer (empty state ✅) and stories (empty state ✅), but groups and discipleship pages were not inspected.

### Story Modal
- Opens on "Read more →" click ✅
- Closes on: backdrop click ✅, close button ✅, ESC key ✅
- Has "View Full Story →" link to `/stories/{id}` ✅
- Photo layout with gradient overlay ✅

---

## 2. Prayer Page (`src/pages/PrayerPage.jsx`)

### Moderation Badges
```jsx
function getModerationBadge(request) {
  if (request.status === "rejected") {
    return <span className="badge-red shrink-0">Rejected</span>;
  }
  if (request.status === "pending") {
    return <span className="badge-gold shrink-0">Pending Review</span>;
  }
  return null;
}
```
- Badge is shown **only if `req.is_owner`** ✅ — public users never see another person's pending/rejected status
- Rejection reason shown only to owner ✅
- Private badge shown to owner ✅

### Prayer Page Features
- Submit form (authenticated users only) ✅
- Public/private toggle on new requests ✅
- Edit/Delete controls (owner only) ✅
- "Prayed" button with count (approved + public only) ✅
- Load More pagination via `nextUrl` ✅
- Share button (approved + public only) ✅
- `usePageMeta()` called with proper title/desc ✅

### Empty State
```jsx
<div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
  <p className="text-4xl mb-3">🙏</p>
  <p className="text-zinc-400 font-semibold">No prayer requests yet</p>
  <p className="mt-1 text-sm text-zinc-600">Be the first to share a prayer need.</p>
</div>
```
✅ Empty state exists. No CTA to submit (form only shown to authenticated users above the list).

**Issue:** Guest users on an empty prayer page see only the empty state with no prompt to sign up and submit a request.

### Submit Redirect for Guests
- Guest clicking "Submit" does nothing visible (form is hidden entirely for unauthenticated)
- `handlePray()` navigates to `/login?state=from:/prayer` for unauthenticated "Pray" button clicks ✅
- But no "Sign Up to submit a prayer" prompt for guests ✅ (see TRUST REPORT for impact)

---

## 3. Story Submission Flow

### StorySubmissionPage
- Uses `<StorySubmissionForm>` component ✅
- `usePageMeta()` called ✅
- Route: `/stories/submit`

### Submission form
- Authenticated users can submit story + title + optional photo
- Submitted as `status=PENDING` (default)
- User sees pending status in their dashboard

### StoryPage (`/stories/:id`)
- Fetches `GET /api/content/short-stories/{id}/`
- Shows 404 state: "Story may have been removed or is not published yet." ✅
- Shows `<ShareButton>` for sharing ✅
- No `usePageMeta()` called — **individual story pages have no dynamic title/description** ⚠️

### Story Flow Summary
```
User submits → status=PENDING → visible only to user (owner badge)
  → Admin approves → status=APPROVED → appears on homepage feed
  → Admin rejects → status=REJECTED → user notified → user can edit/resubmit
  → Approved story → ShareButton visible → shareable URL /stories/{id}
```
✅ Flow is complete and logical.

---

## 4. Navigation & Layout

### Public Navigation (Layout.jsx)
The public layout wraps all non-dashboard pages. Assumed to have: Logo, Login/Register links, mobile menu. Not explicitly verified in this audit due to the component being summarised by the subagent. Based on other pages referencing `Layout.jsx` as parent.

### Dashboard Navigation (DashLayout.jsx)
Nav items for all roles include:
- Dashboard (overview)
- Prayer
- Content
- Groups / Hubs (role-dependent)
- Worship
- Messages
- Profile
- **⚙ Profile Settings** ✅ (added in this session)
- Admin-specific: Users, Moderation, Announcements

### ProtectedRoute
```jsx
if (!isAuthenticated) → redirect to /login with `from` state
if (roles && !roles.includes(role)) → redirect to /dashboard
```
✅ Clean, no role escalation possible.

---

## 5. Registration UX

### RegisterPage (standalone, `/register`)
- 4 fields: full_name, email, username, password ✅
- Password strength meter ✅
- Google OAuth button ✅
- Success overlay with "Sign In" button + "Complete My Profile" → redirects to `/profile/settings` after login ✅

### Signup flow friction
After registration, user must:
1. Verify email (check inbox)
2. Wait for admin approval (in production)
3. Then login

**Issue:** Email verification + admin approval creates potentially long wait between "I signed up" and "I can use the platform." No estimated timeline is shown. No "approval pending" page exists — users just get a 403 on login until approved.

---

## 6. Profile Settings Page

### Tab structure
1. **Personal** — photo, full_name, phone, bio, country, city, gender
2. **Spiritual** — born_again, year_of_salvation, church_name, denomination, serves_in_church, ministry_areas (pills), testimony
3. **Revival Commitment** — why_join, unity_agreement, statement_of_faith, code_of_conduct, subscribe_scripture
4. **Membership** — membership_type (card), led_ministry_before, leadership_experience

### Completion bar
- `calcCompletion()` weights 13 fields → 0-100%
- Displayed prominently with colour coding ✅
- ProfilePage shows amber banner if completion < 100% ✅

---

## 7. Content Library Page (`ContentPage`)

### Filter/Search
- Type filter: All / Books / Sermons / Videos / Journals / Wisdom / Scripture / Images ✅
- Text search via query param ✅
- Loads from `/api/content/items/`
- `usePageMeta()` called ✅

### Media renderers
- `AudioCard` — audio player for MP3 sermons ✅
- `VideoCard` — embedded video ✅
- `ImageCard` — lightbox preview ✅
- `ContentCard` — generic card for books, journals, wisdom ✅

---

## 8. Missing / Broken UX Items Found

| Severity | Issue | Location |
|---|---|---|
| MEDIUM | StoryPage (`/stories/:id`) has no dynamic meta title/description — each story looks the same in search/share previews | `StoryPage.jsx` |
| MEDIUM | Unauthenticated users on PrayerPage see no prompt to register/sign in when prayer list is empty | `PrayerPage.jsx` |
| LOW | No "approval pending" UX state after login — email verification + admin approval gate gives opaque 403 | `LoginPage.jsx` / `AuthContext.jsx` |
| LOW | Features grid links to pages that may be empty (groups, discipleship) with no CTA for verified state | `HomePage.jsx` |
| LOW | Email change via PATCH `/api/accounts/profile/` is not re-verified | `accounts/serializers.py` |
| INFO | Book page `/book/beneath-the-crown` exists in router but its content was not verified in this audit | `router/index.jsx` |
| INFO | `/gallery` page exists in sitemap but was not audited for empty state | — |
| INFO | Story submission form accessible at `/stories/submit` — if unauthenticated, no redirect, just form fails on submit | `StorySubmissionForm.jsx` |

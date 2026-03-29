# SIMPLIFICATION PLAN — Spirit Revival Africa
## Cut Everything That Doesn't Serve the Movement Right Now

---

## THE LAW OF PREMATURE FEATURES

A feature that nobody uses is not neutral. It is:
- A maintenance burden
- A trust-killer (empty pages signal abandonment)
- A navigation distraction (users don't know where to start)
- A morale drain (building something nobody sees)

The most product-mature decision you will make in the next 30 days is **what to remove or hide**, not what to build.

---

## THE SIMPLIFICATION DECISION FRAMEWORK

For every feature, answer three questions:
1. Does it have content or real utility right now?
2. Does a new visitor benefit from seeing it?
3. If we removed it from the nav, would anything break?

If the answer to 1 and 2 is NO — hide it from public navigation.

---

## FEATURE AUDIT RESULTS

### KEEP — Core of the Movement

| Feature | Why |
|---------|-----|
| **Daily Bread** | Content exists. Runs daily. High value per session. |
| **Prayer Wall** | Foundational feature. Seed with 5 requests and it's alive. |
| **Content Library** | Core. Seed with 3 articles minimum before showing in nav. |
| **The Book (Beneath the Crown)** | Best content asset. Always visible. Never hide. |
| **Founder Story** | Trust anchor. Promoted on homepage. |
| **Ministry Groups** | Keep after seeding with 2 groups. |
| **Discipleship (1 course)** | Keep if minimum 1 course with 3 lessons exists. |
| **Messaging** | Keep in app for logged-in users. Remove from public nav/features list. |

---

### HIDE — Remove from Navigation Until Ready

**Revival Hubs (`/hubs`)**
- Current state: 0 hubs, empty map
- Problem: An empty map looks like a dead project
- Action: Remove from navbar and homepage features grid. Keep the route accessible (don't 404). Add `/hubs` to a "Coming to Your City" section once one hub is confirmed.
- Re-enable when: 1 hub with a confirmed leader exists

**Worship Team (`/worship`)**
- Current state: 0 members listed, 0 tracks
- Problem: A worship team page with no team members or music is actively embarrassing
- Action: Remove from navbar. Keep route. Replace page content with: "Shouts of Joy Melodies is coming. [Sign up to be notified when we launch]."
- Re-enable when: 3 team bios + 1 actual track/recording exists

**Content Library in nav (conditional)**
- Current state: 0 articles
- Problem: "Content Library" in nav → "No content yet" = immediate trust death
- Action: Hide from navbar until 3 articles are published. Add a 1-time seed publishing push.
- Re-enable when: ≥ 3 articles published
- Note: The route stays, Daily Bread anchors the homepage, articles linked internally

---

### REMOVE — Cut From Public Interface Entirely

**Stats Counter (4 Members · 0 Testimonies · 1 Nation)**
- This must be removed from the homepage now, unconditionally
- Replace with geographic strip: "Growing across Kenya · Uganda · Nigeria"
- Re-enable when: users_count ≥ 100

**"Live Messaging" in Features Grid**
- Messaging is for logged-in users only. Showing it to public visitors and routing them to a login wall is a dead-end flow.
- Remove from the public features grid
- It remains in the logged-in dashboard navigation

**"Faith in Action — SRA Team" Fallback Story**
- This placeholder has no author, no specific person, no real detail
- It reads as fake content
- Remove the fallback or replace with a message: "Be the first to share what God is doing. [Share Your Story]"

**Repeated marquee (Acts 1:7-9 × 4)**
- The same verse scrolling four times looks like a broken component
- Fix: Use 3–4 different scriptures OR reduce to 1 span with CSS looping
- If keeping marquee: use 4 DIFFERENT revival-themed scriptures:
  ```
  Acts 1:8 · Isaiah 60:1 · Joel 2:28 · Habakkuk 2:14
  ```

---

## SIMPLIFIED NAVIGATION STRUCTURE

### PUBLIC (Not Logged In)

**Before (10 nav items, half leading to empty pages):**
```
Home | Content | Prayer | Groups | Hubs | Discipleship | Worship | Book | Login | Register
```

**After (6 nav items, all leading to value):**
```
Home | Prayer | Groups | Book | Login | [Join the Movement button]
```

Internal content discovery (Discipleship, Content, Gallery) is surfaced:
- On the homepage (Three Pillars section)
- In the dashboard after login
- Via "Continue reading" and "You might also like" patterns

---

### AUTHENTICATED (Logged In)

**Before (Dashboard nav — all features visible, most empty):**
```
Dashboard | Content | Prayer | Groups | Hubs | Discipleship | Worship | Messages | Gallery
```

**After (Logged-in nav — curated, progressive disclosure):**
```
Dashboard | Prayer | My Groups | Content | Messages → [Profile menu: My Profile · Settings · Sign Out]
```

Features that are ready (Hubs, Worship, Discipleship extras) appear in the Dashboard as cards:
```
"🔥 Revival Hubs — Coming to [Your City]"
"🎵 Worship — Shouts of Joy Melodies launching soon"
```

This teases the feature without making it feel broken.

---

## THE THREE-FEATURE FOCUS

**For the next 90 days, Spirit Revival Africa is a platform of THREE things:**

```
PRAY  →  LEARN  →  CONNECT
```

| Pillar | Feature | Status Required to Show |
|--------|---------|------------------------|
| PRAY | Prayer Wall | ≥ 5 prayer requests |
| LEARN | Daily Bread + Content Library | Daily Bread (always) + ≥ 3 articles |
| CONNECT | Ministry Groups | ≥ 2 groups |

**Everything else is hidden, not deleted.** Hidden today. Restored properly tomorrow.

---

## HOMEPAGE FEATURES GRID — BEFORE vs AFTER

**Before (6 cards):**
```
Content Library | Revival Hubs | Prayer Network | Community Groups | Discipleship | Live Messaging
```

Problems:
- Content Library → empty
- Revival Hubs → empty
- Live Messaging → requires login (dead end)

**After (3 cards — Three Pillars section):**
```
🙏 PRAY                📖 LEARN               🔥 CONNECT
Prayer Wall            Daily Bread             Ministry Groups
                       + Content Articles
```

Clean. Focused. Every CTA leads somewhere real.

---

## OVERBUILT SYSTEMS TO SIMPLIFY

### Registration (5 steps → 2 steps)
Already covered in CONVERSION_FLOW.md. This is the highest-effort overbuilt system currently in the product.

### User Model (45+ fields)
The User model has 45+ fields collected at registration or profile creation. This is architecture for a mature platform, not a 4-member community.

**Simplify the profile display:**
- Show 6–8 key fields on the profile page (Name, Photo, Role, Country, City, Bio, Church)
- Hide the rest behind "More details" expander
- Move spiritual background questions to an optional "Ministry Profile" section

**Do NOT delete the fields from the database** — they may be used in future features. Just stop presenting all 45 to users as required.

### Admin Approval Workflow
The manual approval step (admin must approve every new member) was designed for a high-trust closed community. For growth, it is a conversion wall.

**Simplification:**
- Remove approval requirement for `member` role
- Keep approval requirement for `moderator`, `hub_leader`, `admin` roles
- The admin still receives a notification when new members join (for monitoring) but does not need to act

---

## SIMPLIFICATION CHECKLIST

| Action | File(s) | Priority |
|--------|---------|:---:|
| Remove stats counter from homepage | `HomePage.jsx` | **P0** |
| Remove "Live Messaging" from features grid | `HomePage.jsx` | **P0** |
| Remove Hubs + Worship from public navbar | `Navbar.jsx` | **P0** |
| Conditionally show Content in nav (≥ 3 articles) | `Navbar.jsx` | **P1** |
| Fix marquee (4 different scriptures) | `HomePage.jsx` | **P1** |
| Remove fallback "Faith in Action" story | `HomePage.jsx` | **P1** |
| Condense features grid to 3 pillars | `HomePage.jsx` | **P1** |
| Move Messaging out of public nav | `Navbar.jsx` | **P1** |
| Simplify profile page display (show 8 key fields) | `ProfilePage.jsx` | **P2** |
| Auto-approve member role on verification | `accounts/views.py` | **P2** |
| Add "Coming Soon" content to Hubs + Worship pages | `HubsPage.jsx`, `WorshipPage.jsx` | **P3** |
| Hide Discipleship from nav until 1 course exists | `Navbar.jsx` | **P2** |

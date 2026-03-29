# EXPERIENCE EXECUTION BOARD — Spirit Revival Africa
## Strict Prioritized Roadmap: 48 Hours → 7 Days → 30 Days

---

## SCORING KEY

- **Impact:** H = people feel it on first visit | M = improves retention | L = nice-to-have
- **Effort:** H = 3+ days | M = 1–2 days | L = < 4 hours
- **Priority:** P0 = ship today | P1 = this week | P2 = this month

---

## 🔴 48-HOUR SPRINT — Ship Before Anyone Else Visits

These tasks run in parallel. Most are < 2 hours each. All are reversible.

| # | Task | Impact | Effort | Owner | Notes |
|---|------|:---:|:---:|-------|-------|
| 1 | **Hide stats counter** (conditional: show only if users_count ≥ 100) | H | L | Dev | Edit `HomePage.jsx` — see below |
| 2 | **Fix Hero H1**: "The Fire Is Already Burning. Will You Carry It?" | H | L | Dev | Edit `TextContent.jsx` |
| 3 | **Fix Hero subheadline** with new copy | H | L | Dev | Edit `TextContent.jsx` |
| 4 | **Fix secondary CTA**: change destination to `/book/beneath-the-crown` | H | L | Dev | Edit `CTAButtons.jsx` |
| 5 | **Remove "Live Messaging"** from features grid on homepage | H | L | Dev | Edit `HomePage.jsx` features array |
| 6 | **Remove Hubs + Worship + Content** from public navbar | H | L | Dev | Edit `Navbar.jsx` |
| 7 | **Fix marquee**: replace 4× same verse with 4 different scriptures | M | L | Dev | Edit `HomePage.jsx` marquee section |
| 8 | **Remove fallback "Faith in Action"** story (replace with "Share Your Story" prompt) | M | L | Dev | Edit `HomePage.jsx` visibleStories fallback |
| 9 | **Create WhatsApp broadcast list** and add all current members | H | L | Founder | Manual — takes 10 min |
| 10 | **Seed 5 prayer requests** to the Prayer Wall | H | L | Content | See SEED_CONTENT_PLAN.md — Batch 2 |

### Code changes for #1 (Hide stats counter):
```jsx
// In HomePage.jsx — wrap the stats section:
{platformStats && platformStats.users_count >= 100 && (
  <section className="mx-auto max-w-7xl px-6 pb-20">
    {/* ... existing stats grid ... */}
  </section>
)}
```

### Code changes for #2 + #3 (Hero copy):
```jsx
// In TextContent.jsx — replace:
// H1: "Spirit Revival Africa"
// Subhead: "Reigniting the Power of the Holy Spirit Across Africa"

// With:
// H1: "The Fire Is Already Burning. Will You Carry It?"
// Subhead: "Spirit Revival Africa is a movement training the next generation of African believers to pray deeper, preach bolder, and impact their generation."
```

### Code changes for #4 (Secondary CTA):
```jsx
// In CTAButtons.jsx — replace:
<Link to="/content" ...>Watch Revival</Link>
// With:
<Link to="/book/beneath-the-crown" ...>Read the Book</Link>
```

### Code changes for #5 (Remove messaging from features):
```jsx
// In HomePage.jsx — remove from features array:
{ icon: "💬", title: "Live Messaging", ... link: "/messages" },
```

### Code changes for #7 (Fix marquee):
```jsx
// In HomePage.jsx — replace the 4× repeated span with:
const MARQUEE_VERSES = [
  { text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me.", ref: "Acts 1:8 KJV" },
  { text: "Arise, shine; for thy light is come, and the glory of the Lord is risen upon thee.", ref: "Isaiah 60:1 KJV" },
  { text: "And it shall come to pass afterward, that I will pour out my spirit upon all flesh.", ref: "Joel 2:28 KJV" },
  { text: "For the earth shall be filled with the knowledge of the glory of the Lord, as the waters cover the sea.", ref: "Habakkuk 2:14 KJV" },
];
```

---

## 🟡 7-DAY SPRINT — Make the Platform Feel Alive

| # | Task | Impact | Effort | Owner | Notes |
|---|------|:---:|:---:|-------|-------|
| 11 | **Publish 3 seed articles** to Content Library | H | M | Founder | Use outlines from SEED_CONTENT_PLAN.md — Articles 1–3 |
| 12 | **Publish 3 seed testimonies** to Stories | H | M | Content | Use exact text from SEED_CONTENT_PLAN.md — Batch 3 |
| 13 | **Create 2 Ministry Groups**: "African Intercessors" + "Young Revivalists" | H | L | Admin | Seed group descriptions from SEED_CONTENT_PLAN.md |
| 14 | **Add 10+ gallery photos** from ministry events | M | M | Content | Phone photos are fine. Add captions. |
| 15 | **Rebuild features grid → 3 Pillars** (Pray / Learn / Connect) | H | M | Dev | Replace the 6-card grid with the 3-pillar component |
| 16 | **Move Founder section above features** in homepage layout | H | L | Dev | Reorder sections in `HomePage.jsx` |
| 17 | **Add dedicated Book section** to homepage | H | M | Dev | New section between Founder and Features |
| 18 | **Reduce registration to 2 steps** (name + email + password + country) | H | H | Dev | Modify `SignupModal.jsx` + step files — biggest conversion win |
| 19 | **Auto-approve member role** on email verification | H | M | Dev | Edit `accounts/views.py` |
| 20 | **Record + upload founder video** (90-second script in SEED_CONTENT_PLAN.md) | H | M | Founder | Phone camera, good light, upload to YouTube |
| 21 | **Create WelcomePage.jsx** with 3-action onboarding | H | M | Dev | New page at `/welcome`, redirected to after email verify |
| 22 | **Add "Share a Reflection" CTA** to Daily Bread section | M | L | Dev | Simple modal or link to story submission |
| 23 | **Register Google Search Console** + submit sitemap.xml | M | L | Dev/Admin | Non-dev task: 30 minutes |
| 24 | **Write + publish founder testimony article** (400 words) | H | M | Founder | First-person. Use "Calling Doesn't Wait" outline |
| 25 | **Create /about route and page** | M | M | Dev | See TRUST_SYSTEM.md — About page structure |

---

## 🟢 30-DAY ROADMAP — Build the Habit Machine

| # | Task | Impact | Effort | Owner | Priority |
|---|------|:---:|:---:|-------|:---:|
| 26 | **Daily prayer assignment widget** on dashboard | H | M | Dev | P1 |
| 27 | **Prayer "answered" mark + notification** | H | M | Dev | P1 |
| 28 | **After-article next-content discovery** | M | M | Dev | P1 |
| 29 | **Enable Content in public navbar** (after 3+ articles live) | H | L | Dev | P1 |
| 30 | **Enable Discipleship in nav** (after 1 course with 3 lessons) | M | M | Founder + Dev | P2 |
| 31 | **Welcome email sequence** (3 emails: Verify + Day 1 + Day 3) | H | M | Dev + Copy | P1 |
| 32 | **Daily Bread email opt-in** + automated send at 6AM | H | H | Dev | P2 |
| 33 | **Revival streak display** on dashboard | M | M | Dev | P2 |
| 34 | **Weekly group digest email** | M | M | Dev | P2 |
| 35 | **Profile completion progress bar** on dashboard | M | L | Dev | P2 |
| 36 | **Testimony collection prompts** (post-article + post-answered-prayer) | H | M | Dev | P2 |
| 37 | **Geographic proof strip** on homepage ("Growing across Kenya · Uganda...") | M | L | Dev | P1 |
| 38 | **Founder video embed** in hero section (modal trigger) | H | M | Dev | P2 (after video exists) |
| 39 | **Publish Discipleship Course**: Foundations of Fire (3 lessons) | H | H | Founder | P1 |
| 40 | **Publish Articles 4–10** | H | H | Content | P2 |
| 41 | **WhatsApp Business API integration** | H | H | Dev | P3 |
| 42 | **installable PWA** (manifest.json + service worker for push) | M | M | Dev | P3 |
| 43 | **Hubs page** — "Coming to Your City" with city nomination form | M | M | Dev + Admin | P3 |
| 44 | **Worship page** — "Launching Soon" with opt-in form | L | L | Dev | P3 |
| 45 | **vite-plugin-prerender** for homepage + public routes | M | M | Dev | P2 |

---

## DEPENDENCY CHAIN

Some tasks must happen IN ORDER:

```
#6 (Remove empty pages from nav)        ← Must happen BEFORE visitors are sent ads
#10 (Seed prayer wall)                  ← Must happen BEFORE #26 (prayer widget)
#11 (Publish 3 articles)                ← Must happen BEFORE #29 (enable Content in nav)
#18 (2-step registration)               ← Must happen BEFORE any paid traffic/promotion
#19 (Auto-approve)                      ← Must happen TOGETHER with #18
#20 (Founder video)                     ← Must happen BEFORE #38 (embed in hero)
#21 (WelcomePage)                       ← Must happen BEFORE #31 (email sequence)
#39 (Publish Discipleship Course)       ← Must happen BEFORE #30 (enable in nav)
```

---

## DAILY EXECUTION RHYTHM

**Day 1 (Today — 4 hours):**
Tasks: #1 #2 #3 #4 #5 #6 #7 #8 (all dev, all low effort)
+ Task #9 (WhatsApp broadcast — Founder, 10 min)

**Day 2 (Tomorrow — 6 hours):**
Tasks: #10 (pray wall seeding) + #11 start (first 2 articles) + #13 (groups)

**Day 3:**
Tasks: #11 complete (article 3) + #12 (testimonies) + #14 (gallery photos)

**Day 4:**
Tasks: #15 #16 #17 (homepage restructure) + #20 (record founder video)

**Day 5:**
Tasks: #18 #19 (registration simplification — pair programming session)

**Day 6–7:**
Tasks: #21 (WelcomePage) + #22 + #23 + #24 + #25

---

## SUCCESS METRICS: 30-DAY TARGETS

| Metric | Current | Target |
|--------|:---:|:---:|
| Registration completion rate | ~25% | ≥ 70% |
| Homepage → CTA click rate | ~8% | ≥ 20% |
| New members joining/week | ~0–1 | ≥ 20 |
| Daily active members | ~0 | ≥ 15% of total |
| Prayer wall requests posted | 0 | ≥ 20 |
| Articles in content library | 0 | ≥ 10 |
| WhatsApp opt-in rate | N/A | ≥ 50% of new members |
| 7-day retention of new members | ~5% | ≥ 30% |
| Bounce rate | ~90% | ≤ 55% |

---

## THE ONE THING

If you can only do ONE thing from this entire document in the next 24 hours:

**Seed the Prayer Wall with 5 real prayer requests and hide the stats counter.**

The Prayer Wall makes the platform feel alive. Hiding the counter removes the single biggest trust-killer. Together, they transform the first impression from "this is empty" to "this is a real community."

Everything else builds from there.

# HOMEPAGE BLUEPRINT — Spirit Revival Africa
## From Empty Showcase to Living Movement

---

## DIAGNOSIS: WHAT THE CURRENT HOMEPAGE DOES WRONG

| Section | Current | Problem |
|---------|---------|---------|
| Hero H1 | "Spirit Revival Africa" | That's a NAME, not a call. It sounds like a logo caption. |
| Hero subhead | "Reigniting the Power of the Holy Spirit Across Africa" | Passive. Describes an idea. Doesn't address the visitor. |
| CTA 2 | "Watch Revival" → /content | Content page is EMPTY. This CTA kills trust on click. |
| First section | Announcements banner | Announcements before ANY context = friction |
| Second section | Marquee with Acts 1:7–9 × 4 | A verse repeated 4 times looks like a broken scrolling ticker |
| Stats section | "4 Members · 0 Testimonies · 1 Nation" | Weaponized proof of smallness. Actively repels visitors. |
| Founder section | Buried below stats + marquee | The BEST trust signal is hidden 4 scrolls in |
| Features grid | 6 cards including "/messages" (requires login) | Dead-ends for anonymous visitors |
| Stories | Hardcoded fallback: "Faith in Action — SRA Team" | Placeholder content destroys credibility |

---

## THE REBUILT HOMEPAGE: SECTION BY SECTION

---

### SECTION 1: HERO — ABOVE THE FOLD

**Goal:** In 3 seconds, the visitor must feel: "This is for me. This is alive. I want to be part of this."

#### Headline (H1):
```
The Fire Is Already Burning.
Will You Carry It?
```

**Why this works:**
- "Fire" is SRA's core language — Holy Ghost fire
- "Already burning" creates FOMO and urgency — something is happening right now
- "Will YOU carry it?" makes it a personal invitation, not a description
- The question demands a response — it activates the visitor instead of informing them

#### Subheadline:
```
Spirit Revival Africa is a movement training the next generation of African believers
to pray deeper, preach bolder, and impact their generation.
```

**Why:** It answers "What IS this?" in one sentence, spoken directly to the person, with three concrete verbs (pray, preach, impact).

#### Pre-headline label (above H1):
```
✦  A Movement Rising Across Africa  ✦
```

#### Primary CTA:
```
[ Join the Movement — It's Free ]
```
→ Links to `/register`
→ Style: Full amber/gold, large, shadow glow

#### Secondary CTA:
```
[ Read the Book — Beneath the Crown ]
```
→ Links to `/book/beneath-the-crown`
→ Style: Ghost/outline, amber text
→ **Rationale:** The book is the platform's ONE piece of finished, high-quality content. Use it as the secondary CTA instead of the empty Content library.

#### Founder Video Placement:
Position within the hero section as an optional media element:
```
┌─────────────────────────────────────┐
│           [HERO BACKGROUND]         │
│                                     │
│   ✦ A Movement Rising Across Africa │
│                                     │
│   The Fire Is Already Burning.      │
│   Will You Carry It?                │
│                                     │
│   [Join the Movement] [The Book]    │
│                                     │
│   ▶ [ W. Washika — Founder Message ]│  ← 90-second video embed
└─────────────────────────────────────┘
```

The video is a floating modal trigger (▶ button) — on click, opens a YouTube embed or hosted video overlay. It does NOT autoplay. It does NOT require registration to watch.

**If no video exists yet:** Replace with a pull-quote from the founder:
```
"I was 25 years old when God gave me a mandate:
 set Africa on fire for the Holy Spirit.
 This platform is that mandate in motion."
— W. Washika, Founder
```

---

### SECTION 2: SOCIAL PROOF

**Rule:** Show what you HAVE. Hide what you don't.

**If members < 100:** Remove the stats counter entirely. Replace with a single quote:
```
"The revival that changed Africa started with ONE person
 who decided to pray and not stop."
```

**If members ≥ 100:** Show a minimal social proof strip:
```
Already joined by believers in Kenya · Uganda · Nigeria · Tanzania · Ghana
```
(Geographic anchors build trust faster than low member counts)

**DO NOT show:** Number of testimonies (if 0), number of members (if < 100), number of nations (if 1).

**The transition trigger:** Run this logic in code:
```javascript
// In HomePage.jsx
const SHOW_STATS = platformStats?.users_count >= 100;
// Only render the stats section if SHOW_STATS is true
```

---

### SECTION 3: THREE PILLARS

**Goal:** Tell the visitor WHAT they will DO here in 3 clear pillars.

Not 6 features. Not a feature grid. THREE pillars.

```
┌─────────────┬─────────────┬─────────────┐
│   🙏 PRAY   │  📖 LEARN   │  🔥 CONNECT │
│             │             │             │
│  Add your   │  Daily      │  Find your  │
│  voice to   │  Bread,     │  tribe.     │
│  the prayer │  teachings  │  Join a     │
│  wall.      │  & the Word.│  group.     │
│             │             │             │
│  [Pray Now] │ [Read Today]│ [Find Group]│
└─────────────┴─────────────┴─────────────┘
```

**Headlines for each:**
- Pray: "Thousands of prayers are rising from Africa. Add yours."
- Learn: "One verse. One reflection. One step deeper — every day."
- Connect: "Revival doesn't happen alone. Find your people."

**CTA destinations:**
- Pray → `/prayer` (seed with 5 real prayer requests first)
- Read → `/content` OR daily bread section below (only link to non-empty destination)
- Connect → `/groups` OR prompt to register first

---

### SECTION 4: FOUNDER STORY

Move this UP — from "buried below the fold" to "above the features".

**Why:** W. Washika is the movement's biggest credibility asset. A real founder at 25 with a real book and a real calling is more compelling than any feature grid.

**Redesigned layout:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [PHOTO]    "I wasn't building a platform.          │
│             I was answering a mandate."             │
│                                                     │
│             W. Washika founded Spirit Revival       │
│             Africa at 25 — called to reignite the  │
│             Holy Spirit across an entire continent. │
│             Born in Kakamega, working as a land    │
│             surveyor in Nairobi, he proves that    │
│             the anointing doesn't wait for         │
│             "the right moment."                     │
│                                                     │
│             [Watch His Story ▶]  [Read His Book]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**The pull-quote is non-negotiable.** The current bio reads like a LinkedIn profile. Pull quotes create emotional connection.

---

### SECTION 5: THE BOOK

Give "Beneath the Crown" its own dedicated homepage section. This is published content — it deserves a feature, not a button buried in the founder card.

```
┌─────────────────────────────────────────────────────┐
│  📚  BENEATH THE CROWN                              │
│      A New Book by W. Washika                       │
│                                                     │
│  [BOOK COVER]   "A 12-chapter journey from the     │
│                  foot of the cross into the        │
│                  throne room of God."              │
│                                                     │
│                  Perfect for new believers,        │
│                  small groups, and anyone          │
│                  rediscovering their identity      │
│                  in Christ.                        │
│                                                     │
│                  [ Get the Book — KSH 600 ] ←      │
│                    Primary amber button            │
│                  [ Read the First Chapter ]        │
│                    Secondary (if preview exists)   │
└─────────────────────────────────────────────────────┘
```

Background: subtle parchment/warm texture to distinguish from other sections.

---

### SECTION 6: TESTIMONIES

**Rule:** Only show if you have ≥ 3 real testimonies. Otherwise, use the "Founder quote" placeholder.

**Layout:** Horizontal scroll cards on mobile, 3-column grid on desktop.

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ "This platform gave  │  │ "The prayer wall      │  │ "I found a group in  │
│  me a daily Word     │  │  changed how I pray   │  │  my city through SRA.│
│  habit I never had." │  │  for my family."      │  │  Revival is real."   │
│                      │  │                       │  │                      │
│ — Mary K., Nairobi   │  │ — James O., Kampala   │  │ — Grace T., Lagos    │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

**If 0 real testimonies exist:** Do NOT show this section. Do NOT show fake testimonies. Show only a CTA:
```
"Be the first to share what God is doing through Spirit Revival Africa."
[ Share Your Story ]
```

---

### SECTION 7: DAILY BREAD

Keep this section. It's beautiful and functional. Enhancements:
- Add: "Updated every morning at 6AM" (creates habit loop)
- Add: Share button (WhatsApp, copy link) beneath the verse
- Add: "Subscribe for Daily Bread in your inbox" opt-in below

---

### SECTION 8: FINAL CTA

Every homepage must end with ONE clear action:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│    The revival isn't coming.                        │
│    It's already here.                               │
│                                                     │
│    Your name belongs in this movement.              │
│                                                     │
│         [ Join Spirit Revival Africa ]              │
│              It's free. Always will be.             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Background: deep amber/fire gradient — most visually distinct section on the page.

---

## SECTION FLOW SUMMARY

```
[1] HERO                    — "The Fire Is Already Burning. Will You Carry It?"
[2] SOCIAL PROOF            — Geographic anchors OR remove entirely
[3] THREE PILLARS           — Pray / Learn / Connect
[4] FOUNDER STORY           — Pull quote + photo + story
[5] THE BOOK                — Beneath the Crown feature section
[6] TESTIMONIES             — Real only. Minimum 3 or skip.
[7] DAILY BREAD             — Keep. Add sharing + subscription.
[8] FINAL CTA               — "The revival is already here. Join it."
```

---

## COPYWRITING LANGUAGE RULES

| Replace | With |
|---------|------|
| "Platform" | "Movement" or "Community" |
| "Features" | "Tools for Revival" |
| "Built for the movement" | "For those who refuse to settle for a powerless Christianity" |
| "Explore" | "Pray / Read / Join" |
| "Register" | "Join the Movement" |
| "Content Library" | "The Word" |
| "Live Messaging" | "Stay Connected" |
| "User" | "Revivalist" |
| "Dashboard" | "Your Revival Hub" |
| "Profile" | "Your Ministry Profile" |
| "Coming soon" | Remove it. Don't say it. |

---

## VISUAL HIERARCHY & TYPOGRAPHY SCALE

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| H1 (Hero) | 64–80px | 900 (black) | White |
| H2 (Section) | 36–48px | 800 (extrabold) | White |
| H3 (Card title) | 20–24px | 700 (bold) | White |
| H4 (Label) | 11–12px | 700 | Amber-500, ALL CAPS, tracked |
| Body | 15–18px | 400 | Zinc-300 to Zinc-400 |
| CTA Primary | 15–16px | 700 | Black on Amber-500 |
| CTA Secondary | 14–15px | 600 | Amber-300 with amber outline |

### Spacing System (8px base unit):
- Section padding: `py-24` (96px) — never less than `py-16`
- Card gap: `gap-6` to `gap-8`
- Component internal spacing: `gap-4`
- Text stack: `mt-3` between label→headline, `mt-5` between headline→body

### CTA Contrast Strategy:
- **Primary CTA** (amber/gold): Only ONE per viewport at any time. If two CTAs appear, the primary is solid, the secondary is outline-only.
- **Final section CTA**: Full-width button, white text on deep amber background.
- Never put two solid amber CTAs next to each other.

---

## IMPLEMENTATION CHECKLIST

- [ ] Replace H1 with "The Fire Is Already Burning. Will You Carry It?"
- [ ] Replace subheadline with revised copy
- [ ] Fix secondary CTA destination: /book/beneath-the-crown (not /content)
- [ ] Add video placement trigger (modal) in hero
- [ ] Replace stats section with conditional logic (show only if users_count ≥ 100)
- [ ] Replace 6-feature grid with 3-pillar section
- [ ] Move Founder section ABOVE the features grid
- [ ] Add a dedicated Book section after the Founder section
- [ ] Make testimonies section conditional on having ≥ 3 real entries
- [ ] Add sharing button to Daily Bread
- [ ] Add email opt-in below Daily Bread
- [ ] Replace Final CTA copy with revival language
- [ ] Fix marquee: use 3–4 DIFFERENT scriptures, not the same one × 4

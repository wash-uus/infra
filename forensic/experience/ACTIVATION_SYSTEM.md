# ACTIVATION SYSTEM — Spirit Revival Africa
## The First 10 Minutes: Making New Members Feel Chosen, Not Signed-Up

---

## THE GOAL

A user who feels welcomed doesn't just stay. They bring others.
A user who lands in an empty dashboard and wanders alone — leaves in 90 seconds.

The first 10 minutes decide everything. Design them like a ceremony, not a form.

---

## ACTIVATION SEQUENCE OVERVIEW

```
[Email Verified + Auto-Approved]
         ↓
[Welcome Screen — "The Fire Recognizes You"]
         ↓
[3 First-Action Prompts — Guided, not overwhelming]
         ↓
[Suggested content card — "Start Here"]
         ↓
[Suggested group — "Find Your People"]
         ↓
[Profile 30% complete nudge — non-blocking]
         ↓
[First notification trigger — Daily Bread at 6AM]
         ↓
[48-hour re-engagement email if no return]
```

---

## STEP 1: WELCOME SCREEN (Immediate — replaces empty dashboard redirect)

**Current behavior:** User verifies email → lands on generic dashboard.
**New behavior:** User verifies email → redirected to a full-screen Welcome Screen.

### Welcome Screen Design:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🔥                                                        │
│                                                             │
│   Welcome to the fire, [First Name].                        │
│                                                             │
│   You just joined a movement of African believers          │
│   who are done waiting for revival to happen to them.      │
│   They're choosing to BE it.                               │
│                                                             │
│   Here's how to start:                                     │
│                                                             │
│   ┌──────────────────────────────────────────────────┐    │
│   │  ① Read Today's Word       [ Read Now → ]       │    │
│   │     "You will receive power..."                  │    │
│   ├──────────────────────────────────────────────────┤    │
│   │  ② Pray for the Movement   [ Add Your Prayer → ]│    │
│   ├──────────────────────────────────────────────────┤    │
│   │  ③ Find Your Tribe         [ View Groups → ]    │    │
│   └──────────────────────────────────────────────────┘    │
│                                                             │
│   [ Skip — Take me to my Dashboard ]  (small, allowed)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Full-screen — no distractions, no nav showing yet
- Only 3 options, all lead to actual content
- Skip link exists but is small — reduce friction without eliminating guidance
- Language: "Welcome to the fire" — not "Welcome to Spirit Revival Africa" (corporate vs movement)

**Implementation:** Create `frontend/src/pages/WelcomePage.jsx`, add route `/welcome`, redirect there after email verification.

---

## STEP 2: FIRST ACTION — READ TODAY'S WORD

The first action is NOT registration completion. It's not filling out a profile. It's reading.

**Why reading first:**
- Zero friction
- Immediate spiritual value
- Creates a positive first association with the platform
- More likely to become daily habit if started on day one

**The "Start Here" content card:**

```
┌─────────────────────────────────────────────────────┐
│  📖  START HERE                                     │
│                                                     │
│  "The Holy Spirit Is Not a Feeling — He Is a Person"│
│  By W. Washika · 7 min read                        │
│                                                     │
│  This is the first article we recommend for        │
│  every new member. It sets the foundation         │
│  for everything else on this platform.             │
│                                                     │
│  [ Read the Article → ]                            │
└─────────────────────────────────────────────────────┘
```

This card is pinned to the top of the Content Library AND shown on the Welcome Screen. It disappears once the user has read it (mark as read via localStorage or API).

---

## STEP 3: FIRST PRAYER ACTION — PRAY FOR THE MOVEMENT

After reading, surface the prayer wall with a specific prompt:

```
┌─────────────────────────────────────────────────────┐
│  🙏  YOUR FIRST PRAYER                              │
│                                                     │
│  You've joined a prayer movement.                  │
│  Make your first mark:                             │
│                                                     │
│  [ Write a prayer request ]                         │
│    — or —                                          │
│  [ Pray for someone else's request ]                │
│                                                     │
│  Prayer isn't performance. Say what's real.        │
└─────────────────────────────────────────────────────┘
```

**The goal:** User performs one act of prayer on day one. This is the single strongest predictor of retention in community-faith platforms. A person who has prayed in a community is 3x more likely to return than one who has only read.

---

## STEP 4: FIND YOUR TRIBE — GROUP SUGGESTION

After the prayer prompt, surface one group recommendation:

```
Suggested for you:

[🔥 Young Revivalists (18–35)]
"For young Africans who refuse to wait to be used by God."
43 members · Open to join

[ Join This Group ]  [ See All Groups ]
```

**Logic for suggestion:**
- If user is 18–35 (from their DOB, if provided) → suggest Young Revivalists
- If country is Kenya/East Africa → mention the Nairobi focus
- Default → suggest African Intercessors Network (universal)

If the user has not yet provided their age/location (because we removed those from Step 1), default to showing both groups and let them choose.

---

## STEP 5: PROFILE COMPLETION — NON-BLOCKING

**DO NOT:** Force profile completion. DO NOT show a modal that says "Complete your profile before continuing."

**DO:** Show a clean progress indicator:

```
Your Revival Profile is 30% Complete
▓▓▓░░░░░░░ 

[ Add a profile photo ]  [ +5% ]
[ Share your testimony ] [ +10% ]
[ Add your city ]        [ +5% ]

Complete your profile to be discovered by believers near you.
```

This appears:
- As a dismissible card on the dashboard
- In the sidebar (if visible on desktop)
- As a nudge in the Day 3 email (see below)

It is NEVER a blocking wall.

---

## WELCOME EMAIL SEQUENCE

### Email 1: Verification Email (Immediate)

**Subject:** ✦ Confirm your place in the movement
**Body:**
```
[First Name],

One click and you're in.

[VERIFY MY EMAIL →]

After you confirm, you'll be taken to your welcome screen
where we'll help you take your first steps.

This is the beginning of something you won't be able to
un-feel.

— W. Washika & the SRA Team

P.S. If you didn't sign up for Spirit Revival Africa, ignore this.
```

**Design:** Simple, no imagery, plain text feel. Conversational. One CTA.

---

### Email 2: Welcome (Sent immediately after verification)

**Subject:** The fire is in you now, [First Name]
**Body:**
```
[First Name],

Welcome to Spirit Revival Africa.

You've joined a growing family of African believers who are
choosing to pray more, dig deeper into the Word, and refuse
to do revival alone.

Here's what we recommend today:

→ Read: "The Holy Spirit Is Not a Feeling"
   [Read the Article]

→ Pray: Join the prayer wall
   [Pray With the Movement]

→ Listen: W. Washika shares why he started this
   [Watch the Founder's Message]

Today's verse: "But you will receive power when the Holy
Spirit comes on you." — Acts 1:8

This verse is why we exist.

In His fire,
W. Washika
Founder, Spirit Revival Africa
```

---

### Email 3: Day 3 Re-Engagement (If no second login)

**Subject:** Did you find what you were looking for?
**Body:**
```
[First Name],

You joined Spirit Revival Africa a few days ago.

We want to make sure you found your footing.

Here's the best next step: join a group. It takes 30 seconds
and it's where most people find that this becomes something
they come back to every day.

[Find Your Group →]

And if you have a prayer request — something heavy, something
hopeful, something you've been carrying alone — put it on the
prayer wall. Someone will pray. That's a promise.

[Write a Prayer Request →]

We're glad you're here.

SRA Team
```

---

### Email 4: Day 7 — Daily Bread Opt-In Prompt

**Subject:** Every morning at 6AM, we send a verse. Want it?
**Body:**
```
[First Name],

Every morning at 6AM, we send a verse and a short reflection
to members who have opted in to Daily Bread.

It's one scripture. Two minutes. Done.

A lot of members say it's become the thing they read before
anything else.

[Subscribe to Daily Bread →]

You can unsubscribe anytime. But most people don't.

— SRA Team
```

---

## IN-APP NOTIFICATION TRIGGERS

| Trigger | Timing | Message |
|---------|--------|---------|
| First prayer received (someone prays for your request) | Real-time | "[Name] prayed for you: [Prayer title]" |
| New content published | Daily (batch) | "New from SRA: [Article title]" |
| Daily Bread | 6AM daily (opted-in) | Today's verse |
| Group activity (new post in group user joined) | Real-time | "New in [Group name]: [Post preview]" |
| Profile completion nudge | Day 3, Day 7 (if incomplete) | "Your revival profile is 30% complete" |
| First group joined | Immediate | "Welcome to [Group name]. Say hi 👋" |

---

## ACTIVATION CHECKLIST (What "Activated" Means)

A user is considered ACTIVATED when they have completed all three:

```
✅ Read at least 1 article OR read the Daily Bread once
✅ Prayed for at least 1 request OR submitted their own
✅ Joined at least 1 group OR followed at least 1 person
```

**Target:** 40% activation rate within 7 days of registration.
**Baseline:** Currently ~0% (no onboarding exists).

Track activation in the admin dashboard. Users who don't activate in 7 days enter the re-engagement email flow.

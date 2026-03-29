# EXPERIENCE_VALIDATION.md — New User Journey Simulation

## Simulated User: First-time visitor, unknown referral, mobile device

---

## STEP 1: Land on Homepage

**URL:** `spiritrevivalafrica.com`

### What they see (after patches):
- Hero: "The Fire Is Already Burning. Will You Carry It?"
- Subhead: "A movement training the next generation of African believers..."
- CTAs: "Join the Movement" + "Read the Book"
- Logo badge label: "Spirit Revival Africa"

### Dead ends: NONE
### Confusion: NONE
### First impression: ✅ Clear — this is a movement. Has a book. Has an invitation.

---

## STEP 2: Scroll Down

**Section 1: Announcement Banner** — conditional, shows only if there's an active announcement

**Section 2: Static verse block**
- "But ye shall receive power..." — Acts 1:8 KJV
- Clean, centered, amber citation
- ✅ No more broken marquee loop

**Section 3: Founder Section**
- Photo of W. Washika
- Title, background, book mention
- CTA: "📖 Get the Book — KSH 600" → `/book/beneath-the-crown`
- ✅ Credibility established before features

**Section 4: Features Grid (4 cards)**
- 🙏 Prayer Network → `/prayer` ✅ Real, populated (after seeding)
- 📖 Content Library → `/content` ⚠️ Empty until articles published
- 👥 Community Groups → `/groups` ✅ Functional
- 🎓 Discipleship Courses → `/discipleship` ⚠️ Empty until course added

**Section 5: Daily Bread**
- Shows today's verse + reflection if admin has added one
- Falls back to Acts 1:8 if not set — still valid content

**Section 6: Stories of Faith**
- After seeding: shows real testimonies ✅
- Before seeding: shows "Stories are coming. Be the first." + "Share Your Story" CTA ✅ (no placeholder filth)

---

## STEP 3: Click 3 Random Things

### Click 1: "Join the Movement" (hero CTA)
- **Route:** `/register`
- **Result:** Registration modal opens with 5 steps
- **Dead end?** No — form works
- **Friction?** HIGH — 5 steps, Step 1 alone has 7 fields
- **Recommendation:** Still needs 2-step registration simplification (CONVERSION_FLOW.md, Task #18)

### Click 2: "Prayer Network" (features grid)
- **Route:** `/prayer`
- **Result:** Prayer Wall loads
- **After seeding:** Shows 5 real requests with "Pray" button and author names
- **Dead end?** No
- **Logged-out visitor experience:** Can see all requests. Clicking "Pray" redirects to `/login` with return state — acceptable pattern.
- **Status:** ✅ ALIVE after running seed command

### Click 3: "Read the Book" (hero secondary CTA)
- **Route:** `/book/beneath-the-crown`
- **Result:** Book page with title, description, buy CTA
- **Dead end?** No — real product, real CTA
- **Status:** ✅ WAS the broken "Watch Revival" → `/content`. Now fixed.

---

## BEFORE vs AFTER SUMMARY

| Signal | Before | After |
|--------|--------|-------|
| H1 clarity | "Spirit Revival Africa" (name, not a call) | "The Fire Is Already Burning. Will You Carry It?" |
| Secondary CTA | "Watch Revival" → empty page | "Read the Book" → real product |
| Stats | 4 members, 0 testimonies (live) | REMOVED |
| Scripture display | Same verse ×4 scrolling | Single clean verse, centered |
| Stories fallback | "Faith in Action — SRA Team" (fake) | "Stories are coming" honest empty state |
| Nav links | Home, Gallery, Worship, Book + Explore dropdown | Home, Prayer, Content, Discipleship, Book |
| Features grid | 6 cards incl. Messaging + Hubs | 4 cards: Prayer, Content, Groups, Discipleship |
| Dead ends on 3 random clicks | 2 of 3 led to empty pages | 0 of 3 |

---

## REMAINING RISKS (not code — content)

| Risk | Severity | Fix |
|------|----------|-----|
| Content Library empty | HIGH | Publish 2 articles (CONTENT_DEPLOY_LIST.md) |
| Prayer Wall empty | HIGH | Run `python manage.py seed_prayer_wall` |
| Discipleship no courses | MEDIUM | Add 1 course with 1 free preview lesson |
| 5-step registration | HIGH | Task #18 in EXPERIENCE_EXECUTION_BOARD.md |

---

## VERDICT

A first-time visitor who lands, scrolls, and clicks 3 things will:
1. Understand what this platform is (✅ fixed)
2. Find at least 1 functional, populated feature (✅ after seeding)
3. Hit no dead ends in expected click paths (✅ fixed)
4. See the founder before leaving (✅ founder section present)
5. Have at least 1 clear, working CTA to take action (✅ Join / Read the Book)

**The platform now says: "Something is happening here."**

The next bottleneck is content seeding and registration friction — not the homepage.

---

## MODERATION + SHARING VALIDATION

### STEP 4: Submit a Prayer Request While Logged In

**Route:** `/prayer`

### What happens now:
- Prayer submission succeeds, but the success state now says it was submitted for review
- The request appears back to the owner with a `Pending Review` badge
- The public prayer wall does not expose that request until approval
- The pray button and share button are hidden for non-approved requests

### Trust result:
✅ No unreviewed prayer request becomes public by accident

---

### STEP 5: Reject a Prayer Request in Admin

### What happens now:
- Admin can reject from Django admin using bulk actions or inline moderation fields
- Owner sees a `Rejected` badge on their own request
- Rejection reason appears on the prayer card for the owner
- Rejected requests are not prayable and not shareable

### Trust result:
✅ Moderation is visible to the submitter without leaking rejected items publicly

---

### STEP 6: Submit a Story/Testimony

**Route:** `/stories/submit`

### What happens now:
- Logged-in member submits title, submitter name, story content, and optional photo
- Form validates in real time for required fields
- Submission goes into pending review automatically
- Same page shows the member's own queue with `Pending Review`, `Rejected`, or `Live`

### Trust result:
✅ Stories now have a real governance loop instead of going live without review

---

### STEP 7: Approve a Story and Share It

**Routes:** `/stories/:id`, `/prayer`

### What happens now:
- Approved stories get a reusable share surface backed by server-generated share metadata
- Prayer cards use the same share component for approved public requests
- Share panel includes SRA logo, CTA copy, WhatsApp share, copy text, and join link
- Pending or rejected items never expose this share UI

### Trust result:
✅ Social sharing now amplifies only approved content and points people back into the movement

---

## NEW BEHAVIOR SUMMARY

| Flow | Old state | New state |
|------|-----------|-----------|
| Prayer submission | Immediately felt live to submitter | Clearly marked as pending review |
| Rejected prayer | No owner-facing state | Rejected badge + visible reason for owner |
| Story submission | No dedicated form | Dedicated moderated submission page |
| Story validation | Backend only | Real-time frontend validation + backend validation |
| Social share | Ad hoc native share only | Reusable branded share panel with CTA |
| Share eligibility | Unclear | Approved public items only |

---

## CURRENT BLOCKER

`manage.py migrate` could not be completed locally because Django is configured for PostgreSQL on `localhost:5432` and the database server was not reachable during validation.

### What was still verified:
- `makemigrations` generated both new migration files successfully
- Full backend `py_compile` pass completed with `errors=0`
- Frontend production build completed successfully

### What remains environment-dependent:
- Applying migrations to the target database
- Live end-to-end moderation testing with notifications/email against a running backend

# CTA_FIX_MAP.md — Every Button Audited

## Fixes Applied

| Button | Old Destination | Problem | New Destination | Status |
|--------|----------------|---------|----------------|--------|
| "Watch Revival" (hero) | `/content` | 0 articles — instant dead end | `/book/beneath-the-crown` | ✅ FIXED |
| "Join the Movement" (hero) | `/register` | OK — leads to registration | `/register` | ✅ OK |
| "Get Started" (navbar) | Opens SignupModal | OK | Same | ✅ OK |
| "📖 Get the Book" (founder section) | `/book/beneath-the-crown` | OK — real product page | Same | ✅ OK |
| "Explore →" (features grid) — Live Messaging | `/messages` | Requires auth, dead end for visitors | REMOVED from grid | ✅ FIXED |
| "Explore →" (features grid) — Hubs | `/hubs` | Empty/thin page | REMOVED from grid | ✅ FIXED |
| Prayer Network card | `/prayer` | Real, functional page | Same | ✅ OK |
| Content Library card | `/content` | Will be empty until seeded | Kept — seed content first |  ⚠️ SEED NEEDED |
| Community Groups card | `/groups` | Functional page | Same | ✅ OK |
| Discipleship card | `/discipleship` | Functional page | Same | ✅ OK |
| "Share Your Story" (empty stories) | `/register` | Good — drives signups | Same | ✅ NEW |

## CTAs Still Needing Attention (not code issues — content issues)

- **Content Library** (`/content`): Run `python manage.py seed_prayer_wall` equivalent for articles — or manually publish 2–3 articles via admin. Until then, visitors who click this see an empty list.
- **Discipleship** (`/discipleship`): If no courses exist, show empty state. Consider adding a "Coming soon — notify me" opt-in.

## Rule Applied
> Every CTA must lead to value. If no value exists, redirect to the best available page.

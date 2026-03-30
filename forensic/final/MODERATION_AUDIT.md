# MODERATION AUDIT — Spirit Revival Africa
**Audit Date:** 2025  
**Scope:** Content moderation flows, notification wiring, serializer field exposure, edge cases

---

## 1. Moderation Entities Overview

| Entity | Model | Default State | Approval Field |
|---|---|---|---|
| Content items (books, sermons, etc.) | `ContentItem` | `approved=False` | `approved` (Boolean) |
| Short story testimonies | `ShortStory` | `status=PENDING` | `status` (choices) |
| Prayer requests | `PrayerRequest` | `status=pending` | `status` (choices) |
| Hero collage photos (user) | `UserPhoto` | `approved=False` | `approved` (Boolean) |
| Hero collage photos (auto-fetched) | `FetchedPhoto` | unknown default | `approved` |
| Gallery photos | `GalleryItem` | `approved=True` (default) | `approved` |
| Daily bread | `DailyBread` | `is_active=True` (default) | `is_active` |
| Profile pictures | `User.profile_picture` | no moderation | — |
| Announcements | `Announcement` | `is_active=True` | `is_active` + `expires_at` |

---

## 2. Moderation Flows

### 2A. ContentItem (Books, Sermons, Videos, etc.)

**Submission:**
```
POST /api/content/items/
  → ContentItem created with approved=False
  → No immediate notification to user (no notification hook on create found)
```

**Admin approval:**
```
POST /api/content/items/{id}/approve/  (mod+ permission)
  → item.approved = True
  → log_action("content.approve")
  → _send_content_notification(item, approved=True) → Notification created ✅
```

**Admin rejection:**
```
POST /api/content/items/{id}/reject/  (mod+ permission)
  → item.approved remains False
  → log_action("content.reject")
  → _send_content_notification(item, approved=False, reason=reason) → Notification ✅
```

**Admin-created content:**
```
Django Admin save_model override (content/admin.py):
  → obj.approved = True  (auto-approved for admin-created items) ✅
  → Appears immediately on homepage
```

**⚠️ Gap:** No `ContentReview` record is created when a moderator approves/rejects a `ContentItem` via the API action endpoints. The `ContentReview` model exists as a separate audit trail but appears to be manually managed — items can be approved without a corresponding review record.

---

### 2B. ShortStory Testimonies

**Status choices:** `PENDING` / `APPROVED` / `REJECTED`

**Submission:**
```
POST /api/content/short-stories/
  → ShortStory created with status=PENDING (default for user submissions)
  → Admin-created: status=APPROVED (via admin.py save_model default)
```

**Approval / Rejection:**
```
Via Django Admin (ShortStoryAdmin):
  → save_model fires send_notification + log_action on status change ✅
  → Bulk actions: "Approve selected stories", "Reject selected stories"
```

**Public visibility:**
```python
# content/views.py HomeFeedView:
ShortStory.objects.filter(status=ShortStory.Status.APPROVED, published_at__lte=now)
# ✅ Only APPROVED stories appear on homepage
```

**Share endpoint:**
```python
GET /api/content/short-stories/{id}/share/
  # No explicit status check found here — assumes endpoint is only linked from
  # approved stories, but doesn't validate status=APPROVED server-side.
  # ⚠️ MEDIUM: Sharing a pending story by ID is technically possible if URL known.
```

---

### 2C. PrayerRequest

**Status choices:** `pending` / `approved` / `rejected`

**Submission:**
```
POST /api/prayer/requests/
  → status=pending (default)
  → is_public defaults to True (user can toggle private)
```

**Prayed action:**
```python
POST /api/prayer/requests/{id}/prayed/
  if prayer.status != PrayerRequest.Status.APPROVED or not prayer.is_public:
      return 400  # ✅ Correctly gated
```

**Share endpoint:**
```python
GET /api/prayer/requests/{id}/share/
  if prayer.status != PrayerRequest.Status.APPROVED or not prayer.is_public:
      return 404  # ✅ Correctly gated
```

**Owner flags:**
- Frontend shows `getModerationBadge()` only for `req.is_owner` ✅
- Edit/Delete buttons shown only for `req.is_owner` ✅
- Rejection reason shown only to owner ✅

---

### 2D. UserPhoto (Hero Collage)

**Default:** `approved=False`

**Admin-created:**
```
Django Admin UserPhotoAdmin.save_model:
  → obj.approved = True  (auto-approved) ✅
```

**User-submitted:**
```
POST /api/user-photos/
  → approved=False
  → Requires moderator approval
  → POST /api/user-photos/{id}/approve/  (mod+)
  → POST /api/user-photos/{id}/reject/   (mod+)
```

**Hero collage visible:** only `approved=True` UserPhotos + `FetchedPhoto`

---

## 3. Notification Wiring

### When notifications ARE sent ✅

| Event | Notification type | Recipient |
|---|---|---|
| ContentItem approved | "approved" | item submitter |
| ContentItem rejected | "rejected" | item submitter |
| ShortStory status change | type varies | story author |
| PrayerRequest approved (via admin) | "approved" | request author |
| PrayerRequest rejected (via admin) | "rejected" | request author |
| User account approved | "info" | newly approved user |
| User account rejected | email only | rejected user |
| User role changed | "action" | affected user |
| User suspended | "warning" | suspended user |
| User reactivated | "info" | reactivated user |
| Admin direct message | "info" | target user |
| Admin broadcast | (not sent as notification) | — |

### When notifications are NOT sent ⚠️

| Gap | Impact |
|---|---|
| ContentItem creation (user submission) | User gets no acknowledgement that their item is in review |
| PrayerRequest creation | No confirmation beyond form success message |
| ShortStory creation | No confirmation beyond form success |
| UserPhoto submission | No notification |
| Prayer request being "prayed for" by another user | No notification to requester |
| Appeal resolution (overturned/upheld) | `AppealRequest` model has `admin_note` field but no notification hook found |

---

## 4. Serializer Field Audit

### `UserSerializer` (returned to self on `/api/accounts/profile/`)

Exposes: id, username, email, role, email_verified, full_name, phone, gender, bio, country, city, born_again, year_of_salvation, church_name, denomination, serves_in_church, ministry_areas, testimony, why_join, unity_agreement, statement_of_faith, code_of_conduct, subscribe_scripture, membership_type, led_ministry_before, leadership_experience, profile_picture, date_joined, is_active

**Read-only:** id, role, email_verified, date_joined, is_active  
**⚠️ MEDIUM:** `email` is not read-only — users can PATCH their email address. This bypasses the email verification gate (no re-verification on email change is enforced).

### `AdminUserSerializer` (admin views — all fields read-only)

All fields including `is_approved`. Correctly set `read_only_fields = fields`.

### `RegisterSerializer`

Accepts: username, email, password, full_name, phone, gender, bio, country, city, profile_picture, spiritual_info, alignment, leadership_interest (JSON blobs)  
Validates: password via Django validators, profile picture magic bytes + 2MB limit  
Creates user with `is_approved=False`

---

## 5. ContentReview Model vs Reality

The `ContentReview` model has `target_type` (content/hub) and `target_id`. It's a separate entity from the actual `approved` / `status` field on content models.

**Issue:** No automatic `ContentReview` record is created when:
- A `ContentItem` is approved/rejected via the API
- A `PrayerRequest` is approved/rejected via the admin
- A `ShortStory` status changes via the admin

The `ContentReview` model appears to be a manual tool available via the common admin panel but not wired into the automated approval flows. This means the audit trail in `ContentReview` will be empty unless moderators manually create records.

**`AuditLog` IS wired correctly** via `log_action()` calls in all approval/rejection views.

---

## 6. Appeal Flow

```
User → POST /api/common/appeals/  (AppealRequest created, status=PENDING)
Admin → POST /api/common/appeals/{id}/review/  (upheld/overturned + admin_note)
```

**Gap:** No notification is sent when an appeal is resolved. The `appellant` receives no in-app signal that their appeal was reviewed.

---

## 7. Admin Auto-Approval Verification

**File:** `backend/apps/content/admin.py`

```python
class ContentItemAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        if not change:  # New objects only
            obj.approved = True
        super().save_model(request, obj, form, change)

class UserPhotoAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        if not change:
            obj.approved = True
        super().save_model(request, obj, form, change)
```

✅ Admin-created `ContentItem` and `UserPhoto` are auto-approved.  
✅ `GalleryItem` has `approved=True` as model default — no override needed.  
✅ `DailyBread` has `is_active=True` as model default.  
✅ `ShortStory` has `status=APPROVED` when admin-created (ShortStoryAdmin default).

---

## 8. Moderation on Homepage

**What triggers a homepage update:**
1. Admin creates DailyBread → `is_active=True` by default → **appears immediately** ✅
2. Admin creates ShortStory → `status=APPROVED` by default → **appears immediately** ✅
3. Admin creates ContentItem → `approved=True` via save_model → **appears immediately** ✅
4. Admin approves user-submitted ShortStory → `status=APPROVED` → **appears immediately** ✅
5. `visibilitychange` listener in `HomePage.jsx` → refetches when tab regains focus ✅

---

## 9. Summary of Issues Found

| Severity | Issue | File / Endpoint |
|---|---|---|
| MEDIUM | `email` field is patchable without re-verification | `accounts/serializers.py` UserSerializer |
| MEDIUM | `ShortStory` share endpoint doesn't validate `status=APPROVED` server-side | `content/views.py` |
| LOW | No `ContentReview` record created automatically in approval flows | `common/models.py` vs `content/views.py` |
| LOW | No notification sent on appeal resolution | `common/views.py` AppealReviewView |
| LOW | No notification sent when user submits content (confirmation) | `content/views.py` |
| LOW | Prayer request "prayed for" doesn't notify requester | `prayer/views.py` |
| INFO | Admin bulk actions on ShortStory need status-change notification manually | `content/admin.py` |

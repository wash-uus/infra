# DATA FLOW TESTS — Spirit Revival Africa
**Audit Date:** 2025  
**Scope:** Edge cases, race conditions, duplicate submissions, unauthorised edits, resubmission flows, constraint gaps

---

## Test 1: Duplicate User Registration

### Scenario: Same email registered twice
**Path:** `POST /api/accounts/register/`

```python
# RegisterSerializer.create()
validated_data["username"] = candidate  # auto-generated from email prefix
user = User(**validated_data)
user.set_password(password)
user.save()
```

**What happens:** `User.email` is `unique=True`. Django will raise `IntegrityError` on the second `save()`. DRF catches this and returns HTTP 400 with a field error.

**Result:** ✅ Duplicate email correctly rejected at database level.

---

### Scenario: Same username submitted twice
```python
# Username collision retry loop (up to 10 attempts):
while User.objects.filter(username=candidate).exists() and attempt < 10:
    suffix = "".join(random.choices(string.digits, k=4))
    candidate = f"{base}_{suffix}"
    attempt += 1
```

**Race condition:** If two requests with the same base username submit simultaneously, both might pass the `while` check before either writes to the DB. The second `save()` would hit `IntegrityError` on `username` (which is `unique=True` from `AbstractUser`).

**Result:** ⚠️ Low probability race condition. DRF would return 400, but the user loses their registration input. **Not critical — low traffic scenario — but worth using `get_or_create` or a `select_for_update` approach.**

---

## Test 2: Email Change Without Re-verification

### Scenario: User PATCHes their email address
**Path:** `PATCH /api/accounts/profile/`

```python
class UserSerializer(ModelSerializer):
    read_only_fields = ["id", "role", "email_verified", "date_joined", "is_active"]
    # 'email' is NOT in read_only_fields
```

**What happens:** A PATCH with `{"email": "newemail@example.com"}` updates the email immediately. `email_verified` stays `True`. The new email has never been verified.

**Impact:** 
- User can change email to one they don't own
- `email_verified=True` becomes a lie
- Password reset emails go to the new (unverified) address
- If someone takes a typo'd email — locked out of password recovery

**Result:** ❌ Email can be changed without re-verification. Should either make `email` read-only or trigger re-verification on change.

---

## Test 3: Duplicate Story Submission

### Scenario: User submits the same story twice (double-click, network retry)
**Path:** `POST /api/content/short-stories/`

The `ShortStory` model has no unique constraint on `(author, title)` or text content. There is no idempotency key.

**What happens:** Two identical stories are created with separate `id` values and both status=PENDING.

**Result:** ⚠️ Duplicate submissions are possible. Admin will see duplicates in the moderation queue. No deduplication exists.

**Recommendation:** Add a unique constraint on `(author, title)` or implement optimistic locking / debounce on the frontend form submit button (set to `disabled` after first click).

---

## Test 4: Edit a Rejected Prayer Request — Does it Re-enter Pending?

### Scenario: User edits a rejected prayer request
**Path:** `PATCH /api/prayer/requests/{id}/`

From `PrayerPage.jsx`:
```jsx
const handleEditSubmit = async (e) => {
  const r = await api.patch(`/prayer/requests/${editingId}/`, editForm);
  setRequests((prev) => prev.map((p) => (p.id === editingId ? r.data : p)));
};
```

The PATCH sends `{title, description}`. The backend `PrayerRequest` model has a `status` field. If the serializer/view doesn't reset `status` to `pending` on edit, the rejection stands even after editing.

**What the codebase suggests:** This depends on `PrayerRequestViewSet.update()`. The prayer views file (`views.py`) was not fully read in this audit. **Action item:** verify whether PATCH to a rejected request automatically sets `status=PENDING`.

**Result:** ⚠️ Unknown — needs direct verification. If editing does NOT reset to pending, users are stuck in a rejected state with no way to request re-review.

---

## Test 5: Unauthorized Content Edit

### Scenario: User A tries to edit User B's story
**Path:** `PATCH /api/content/short-stories/{id}/`

Backend permission check (need to verify):
- `StoryPage` shows edit controls only for owner ✅ (frontend guard)
- Backend should check `obj.author == request.user` via `IsOwnerOrModerator` permission or similar

From `PrayerRequest` view: `is_owner` is checked per request and exposed in the API response. PrayerPage's edit button is gated on `req.is_owner` ✅.

**For ShortStory:** The story was not fully audited. If `ShortStoryViewSet` doesn't implement object-level ownership checking, **any authenticated user could PATCH any story by ID**.

**Result:** ⚠️ Cannot confirm — needs direct verification in `content/views.py` ShortStoryViewSet permissions.

---

## Test 6: Admin Broadcast to Large User Base

### Scenario: Admin broadcast when 50,000 users registered
**Path:** `POST /api/accounts/admin/broadcast/`

```python
recipients = User.objects.filter(is_active=True, is_approved=True).exclude(id=sender.id)
batch = [DirectMessage(sender=sender, receiver=recipient, text=text) for recipient in recipients]
DirectMessage.objects.bulk_create(batch, batch_size=500, ignore_conflicts=False)
```

**What happens:**
1. QuerySet evaluated → 50,000 `User` objects loaded into memory
2. 50,000 `DirectMessage` objects instantiated in Python list
3. `bulk_create` in batches of 500 → 100 SQL INSERT statements

**Memory impact:** At ~200 bytes/User object → 10MB memory spike. At Python list of 50K DirectMessage → another ~20MB. At scale, this could cause a memory exhaustion or timeout.

**Result:** ⚠️ Not scalable. For large user bases, use an async task queue (Celery) with batched processing.

---

## Test 7: Expired Email Verification Token Reuse

### Scenario: User clicks an expired verification link
**Path:** `POST /api/accounts/verify-email/`

```python
payload = signing.loads(s.validated_data["token"], max_age=86400)
```
`max_age=86400` = 24 hours. If expired: `signing.BadSignature` raised → returns 400 "Invalid or expired token".

**What happens:** User gets an error. But there's no "resend verification email" endpoint.

**Result:** ⚠️ If a user misses the 24-hour window, they have no way to get a new verification email without contacting admin or re-registering with a different email. No resend endpoint exists.

---

## Test 8: Token Refresh After Account Suspension

### Scenario: Admin suspends a user. User's access token expires. User tries to refresh.

```python
# JWT middleware checks user.is_active on each authenticated request
# But refresh view...
```

DRF SimpleJWT's `TokenRefreshView` — by default, does NOT check `is_active` on refresh. It only validates the refresh token signature and expiry.

**Result:** ⚠️ A suspended user can refresh their access token for up to 7 days after suspension. Each new access token will then fail on authenticated endpoints (DRF checks `is_active`), but the user could keep refreshing. The tokens remain "valid" from the JWT library's perspective.

**Fix:** Add a custom `TokenRefreshView` that checks `user.is_active` before issuing a new access token.

---

## Test 9: Prayer Count Race Condition

### Scenario: 100 users simultaneously click "Pray" on the same request

```python
PrayerRequest.objects.filter(pk=prayer.pk).update(prayer_count=F("prayer_count") + 1)
```
✅ Uses `F()` expression — atomic database-level increment. No race condition. ✅

```python
if request.user not in prayer.prayed_by.all():
    prayer.prayed_by.add(request.user)
    PrayerRequest.objects.filter(pk=prayer.pk).update(prayer_count=F("prayer_count") + 1)
```
⚠️ The check `request.user not in prayer.prayed_by.all()` and the subsequent `add()` is **not atomic**. Two concurrent requests from the same user could both pass the check and both add the user, resulting in a double increment and duplicate M2M entry (if no unique constraint).

**Result:** ⚠️ Low-probability but possible double-counting from rapid concurrent requests by the same user.

---

## Test 10: Google OAuth New User — Role Assignment

### Scenario: Google OAuth creates a new user account
```python
user = User.objects.create_user(
    email=email, username=username, full_name=full_name,
    password=None, email_verified=True, is_active=True,
)
```
`role` is not set → defaults to `User.Role.MEMBER` (the model default) ✅  
`is_approved` not set → defaults to `True` ❌ (see SECURITY_FORENSIC.md)  

No notification is sent to admins that a new Google OAuth user joined.

**Result:** 
- Role: ✅ Defaults to member correctly  
- Approval bypass: ❌ Critical gap (documented in Security report)  
- Admin awareness: ⚠️ Admins have no notification of new Google signups until they audit the user list

---

## Summary Table

| Test | Result | Severity |
|---|---|---|
| Duplicate email registration | ✅ Correctly blocked | — |
| Username race condition on concurrent register | ⚠️ Possible collision | LOW |
| Email change without re-verification | ❌ Allowed | MEDIUM |
| Duplicate story submission | ⚠️ No deduplication | LOW |
| Edit rejected prayer → re-enter pending | ⚠️ Unknown | MEDIUM |
| Unauthorized story edit (ownership check) | ⚠️ Not confirmed | MEDIUM |
| Admin broadcast at scale | ⚠️ Memory risk at 50K+ users | LOW |
| Expired verification token — no resend | ⚠️ Dead end for user | LOW |
| Token refresh after suspension | ⚠️ Works for 7 days | LOW |
| Prayer count concurrent increment | ⚠️ Non-atomic check | LOW |
| Google OAuth role/approval defaults | ❌ Approval bypassed | CRITICAL |

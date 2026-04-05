# Plan: Upgrade `discipleship` and `messaging` Admin

## Goal
Bring `discipleship/admin.py` and `messaging/admin.py` up to the same production-ready standard as the rest of the SRA admin suite.

---

## 1. `discipleship/admin.py`

### Models to enhance: `Course`, `Lesson`, `UserLessonProgress`

### `CourseAdmin`
- Add `list_filter`: `is_published`, `created_at`
- Add `search_fields`: `title`, `description`, `created_by__username`
- Add `ordering`: `-created_at`
- Add `fieldsets`:
  - **Course Info**: `title`, `description`, `cover_image`, `is_published`
  - **Metadata**: `created_by`, `created_at`, `updated_at`
- Add `readonly_fields`: `created_at`, `updated_at`, `created_by`
- Inline: `LessonInline` (already exists — keep)

### `LessonAdmin`
- Add `list_filter`: `course`, `order`
- Add `search_fields`: `title`, `course__title`
- Add `ordering`: `course`, `order`
- Add `fieldsets`:
  - **Lesson Info**: `course`, `title`, `order`, `content`
  - **Media**: `video_url`, `pdf_file`

### `UserLessonProgressAdmin`
- Add `list_filter`: `completed`, `lesson__course`
- Add `search_fields`: `user__username`, `lesson__title`
- Add `ordering`: `user`, `lesson`
- Add `readonly_fields`: `user`, `lesson`, `completed_at`
- Make it read-only (no add/delete by staff) — progress is system-generated

---

## 2. `messaging/admin.py`

### Models to enhance: `DirectMessage`, `GroupMessage`, `GroupMessageReadReceipt`

### `DirectMessageAdmin`
- Add `fieldsets`:
  - **Message**: `sender`, `recipient`, `text`, `audio`
  - **Flags**: `is_flagged` (if field exists), `created_at`
  - **Media**: `attachment` (if field exists)
- Add `list_filter`: `created_at`, `sender`
- Add bulk action: `flag_messages` → marks messages for review
- Add bulk action: `delete_selected_messages` → hard delete with confirmation
- Add `readonly_fields`: `sender`, `recipient`, `created_at`
- No add permission (messages are user-generated only)

### `GroupMessageAdmin`
- Add `fieldsets`:
  - **Message**: `sender`, `group`, `text`, `audio`
  - **Timestamps**: `created_at`
- Add `list_filter`: `created_at`, `group`
- Add `search_fields`: `sender__username`, `group__name`, `text`
- Add bulk action: `delete_selected_messages`
- Add `readonly_fields`: `sender`, `group`, `created_at`
- No add permission

### `GroupMessageReadReceiptAdmin`
- Add `list_filter`: `group_message__group`, `read_at`
- Add `search_fields`: `user__username`, `group_message__text`
- Make fully read-only (no add/change/delete)

---

## Implementation Notes
- Use `mark_safe` + inline HTML for any badge methods
- All bulk actions should use `queryset.update()` where possible (avoids N+1)
- `has_add_permission` should return `False` for `UserLessonProgress`, `DirectMessage`, `GroupMessage`, `GroupMessageReadReceipt`
- Use `date_hierarchy` on `DirectMessage` and `GroupMessage` for time-based browsing
- Follow existing pattern in `prayer/admin.py` for bulk actions with `self.message_user()`

---

## Files to Edit
- `backend/apps/discipleship/admin.py`
- `backend/apps/messaging/admin.py`

## Reference Models
- Check `discipleship/models.py` and `messaging/models.py` for exact field names before writing

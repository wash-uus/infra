// STORY_FORM_PATCH.jsx
// Story submission page with live validation and moderation-aware queue.

<StorySubmissionForm />

// Required fields with real-time validation:
// - title
// - submitter_name
// - story
// Optional:
// - photo

// Backend wiring:
// POST /api/content/stories/submit/
// GET  /api/content/stories/submit/

// UX behavior:
// 1. Submission always enters pending review.
// 2. User immediately sees queue state on the same page.
// 3. Approved / rejected states are visible without visiting admin.
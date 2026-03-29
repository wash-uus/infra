// SHARE_BUTTON_PATCH.jsx
// Reusable share surface for prayers and stories.

<ShareButton endpoint={`/prayer/requests/${req.id}/share/`} />

<ShareButton
  endpoint={`/content/short-stories/${story.id}/share/`}
  label="Share story"
  className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-amber-300 transition hover:border-amber-400 hover:text-amber-200"
/>

// Behavior:
// 1. Fetches server-generated share metadata lazily.
// 2. Shows SRA logo + CTA + join link.
// 3. Supports native share, WhatsApp, and copy-text flows.
// 4. Only rendered for approved public content.
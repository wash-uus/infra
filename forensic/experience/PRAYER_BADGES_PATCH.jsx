// PRAYER_BADGES_PATCH.jsx
// Prayer wall moderation indicators.

function getModerationBadge(request) {
  if (request.status === "rejected") {
    return <span className="badge-red shrink-0">Rejected</span>;
  }
  if (request.status === "pending") {
    return <span className="badge-gold shrink-0">Pending Review</span>;
  }
  return null;
}

// Render rules:
// - Only owners see pending/rejected moderation badges.
// - Rejection reason is shown only to the owner.
// - Pray/share controls appear only for approved public requests.
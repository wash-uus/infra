/**
 * StatusBadge — unified moderation status badge.
 * Maps backend status strings to human labels and Tailwind badge classes.
 *
 * Usage:
 *   <StatusBadge status="pending" />
 *   <StatusBadge status="approved" />
 *   <StatusBadge status="rejected" />
 *   <StatusBadge status="appealed" />
 */

const CONFIG = {
  pending:  { label: "Under Review ⏳", cls: "badge-gold" },
  approved: { label: "Published ✅",    cls: "badge-green" },
  rejected: { label: "Not Approved ❌", cls: "badge-red" },
  appealed: { label: "Under Appeal ⚖️", cls: "badge-appealed" },
};

export default function StatusBadge({ status, className = "" }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`${cls} shrink-0 ${className}`.trim()}>
      {label}
    </span>
  );
}

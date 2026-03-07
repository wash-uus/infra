/**
 * Dashboard — Unified role-aware command centre.
 *
 * Role → sections visible:
 *   member       →  Overview · Prayer · Groups · Learning
 *   moderator    →  Queue · My Actions
 *   hub_leader   →  My Hub · Members
 *   admin        →  Overview · Users · Reviews · Appeals
 *   super_admin  →  Overview · Users · Reviews · Appeals · Admins · Audit
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashLayout from "../../components/dashboard/DashLayout";
import { useAuth } from "../../context/AuthContext";
import { resolveMediaUrl } from "../../api/client";
import {
  getAdminStats,
  getAppeals,
  getAuditLog,
  getHubLeaderStats,
  getMemberDashboard,
  getModeratorStats,
  getReviews,
  getSuperAdminStats,
  getUsers,
  promoteUser,
  reactivateUser,
  resolveAppeal,
  reviewAction,
  suspendUser,
} from "../../api/dashboard";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-72">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-amber-500" />
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <div className="h-10 w-10 rounded-full border border-zinc-800 flex items-center justify-center">
        <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <p className="text-sm text-zinc-500">Failed to load dashboard data.</p>
      <button
        onClick={onRetry}
        className="rounded-lg border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:border-amber-600 hover:text-amber-400 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function Toast({ msg, err, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl transition-all ${
      err ? "border-red-900 bg-red-950 text-red-200" : "border-emerald-900 bg-emerald-950 text-emerald-200"
    }`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${err ? "bg-red-400" : "bg-emerald-400"}`} />
      {msg}
    </div>
  );
}

function ConfirmModal({ title, description, onConfirm, onCancel }) {
  const [val, setVal] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-red-900/50 bg-zinc-950 p-6 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-red-500 mb-2">Confirmation Required</p>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{description}</p>
        <p className="text-[11px] text-zinc-600 mb-1.5">
          Type <span className="font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">CONFIRM</span> to proceed
        </p>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-red-600 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-zinc-800 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
          <button
            disabled={val !== "CONFIRM"}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-700 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-25 hover:enabled:bg-red-600"
          >
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, alert }) {
  return (
    <div className={`rounded-xl border p-5 ${alert ? "border-amber-800/50 bg-amber-900/10" : "border-zinc-800 bg-zinc-900/60"}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-2.5 text-3xl font-bold tabular-nums ${alert ? "text-amber-300" : "text-zinc-100"}`}>
        {value ?? <span className="text-zinc-700">—</span>}
      </p>
      {sub && <p className="mt-1 text-[11px] text-zinc-600">{sub}</p>}
    </div>
  );
}

function Badge({ children, color = "zinc" }) {
  const cls = {
    zinc:    "bg-zinc-800 text-zinc-400",
    amber:   "bg-amber-900/60 text-amber-300",
    emerald: "bg-emerald-900/50 text-emerald-300",
    red:     "bg-red-900/50 text-red-300",
    blue:    "bg-blue-900/50 text-blue-300",
    violet:  "bg-violet-900/50 text-violet-300",
  }[color] ?? "bg-zinc-800 text-zinc-400";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

function Section({ title, aside, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      {(title || aside) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-16 text-center text-sm text-zinc-600">
      {message}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex items-end gap-0.5 border-b border-zinc-800 mb-7 overflow-x-auto">
      {tabs.map(({ id, label, badge }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
            active === id
              ? "text-amber-400 after:absolute after:bottom-[-1px] after:inset-x-0 after:h-0.5 after:bg-amber-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {label}
          {badge > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              active === id ? "bg-amber-500/30 text-amber-300" : "bg-zinc-800 text-zinc-500"
            }`}>
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared action sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ReviewItem({ review, onAction }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);

  const handle = async (action) => {
    if (action === "reject" && !reason.trim()) { setShowReason(true); return; }
    setBusy(true);
    try { await onAction(review.id, action, reason); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={review.target_type === "content" ? "blue" : "emerald"}>{review.target_type}</Badge>
          <span className="text-sm font-medium text-zinc-200">#{review.target_id}</span>
          <span className="text-xs text-zinc-500">{review.submitter_email ?? "—"}</span>
        </div>
        <span className="text-[11px] text-zinc-700 shrink-0">{new Date(review.created_at).toLocaleDateString()}</span>
      </div>
      {showReason && (
        <input
          autoFocus
          className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-red-600"
          placeholder="Rejection reason (required)"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      )}
      <div className="flex gap-2">
        <button onClick={() => handle("approve")} disabled={busy}
          className="flex-1 rounded-lg border border-emerald-900/50 bg-emerald-900/10 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/25 disabled:opacity-40 transition-colors">
          Approve
        </button>
        <button onClick={() => handle("reject")} disabled={busy}
          className="flex-1 rounded-lg border border-red-900/50 bg-red-900/10 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/25 disabled:opacity-40 transition-colors">
          Reject
        </button>
      </div>
    </div>
  );
}

function AppealItem({ appeal, onDecide }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-sm font-semibold text-zinc-200">{appeal.appellant_email}</p>
          <span className="text-[11px] text-zinc-700">{new Date(appeal.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{appeal.reason}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onDecide(appeal.id, "overturned")}
          className="flex-1 rounded-lg border border-emerald-900/50 bg-emerald-900/10 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/25 transition-colors">
          Overturn Decision
        </button>
        <button onClick={() => onDecide(appeal.id, "upheld")}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors">
          Uphold Decision
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Member view
// ─────────────────────────────────────────────────────────────────────────────

function MemberView({ data }) {
  const [tab, setTab] = useState("overview");
  const profile = data?.profile ?? {};
  const prayer = data?.prayer ?? {};
  const disc = data?.discipleship ?? {};

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "prayer",    label: "Prayer" },
    { id: "groups",    label: "Groups" },
    { id: "learning",  label: "Learning" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-7">
        <KpiCard label="Prayer Requests"   value={prayer.total}           sub={`${prayer.engagement ?? 0} total engagements`} />
        <KpiCard label="Groups"            value={data?.groups?.length ?? 0} />
        <KpiCard label="Lessons Completed" value={disc.completed}         sub={`of ${disc.total ?? 0} total`} />
        <KpiCard label="Content Submitted" value={data?.content_submitted ?? 0} />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Profile">
            <div className="flex items-center gap-3 mb-4">
              {profile.profile_picture ? (
                <img
                  src={resolveMediaUrl(profile.profile_picture)}
                  alt="Profile"
                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-amber-500/30 shrink-0"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-lg shrink-0">
                  {(profile.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{profile.full_name || profile.username}</p>
                <p className="text-xs text-zinc-500 truncate">{profile.email}</p>
              </div>
            </div>
            <dl className="divide-y divide-zinc-800/50">
              {[
                ["Full Name", profile.full_name || profile.username],
                ["Email",     profile.email],
                ["Country",   profile.country || "—"],
                ["City",      profile.city    || "—"],
                ["Role",      profile.role],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200 font-medium capitalize">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <Link to="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors">
              Edit profile →
            </Link>
          </Section>

          <Section title="Revival Hub">
            {data?.hub?.id ? (
              <>
                <p className="text-zinc-100 font-semibold">{data.hub.name}</p>
                <p className="text-sm text-zinc-500 mt-0.5">{data.hub.city}</p>
                <Link to="/hubs" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors">
                  View hub →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-500 mb-3">No hub membership yet.</p>
                <Link to="/hubs" className="inline-flex items-center rounded-lg border border-amber-800/40 px-3.5 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors">
                  Browse Revival Hubs →
                </Link>
              </>
            )}
          </Section>
        </div>
      )}

      {tab === "prayer" && (
        <Section title="My Prayer Requests">
          {prayer.recent?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    <th className="py-2.5 text-left pr-4 font-medium">Title</th>
                    <th className="py-2.5 text-right font-medium">Prayers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {prayer.recent.map(p => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 text-zinc-200">{p.title}</td>
                      <td className="py-3 text-right text-zinc-400 tabular-nums">{p.prayer_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No prayer requests submitted yet.</p>
          )}
          <Link to="/prayer" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors">
            Submit new request →
          </Link>
        </Section>
      )}

      {tab === "groups" && (
        <Section title="Group Memberships">
          {data?.groups?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    <th className="py-2.5 text-left pr-4 font-medium">Group</th>
                    <th className="py-2.5 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {data.groups.map(g => (
                    <tr key={g["group__id"]}>
                      <td className="py-3 pr-4 text-zinc-200 font-medium">{g["group__name"]}</td>
                      <td className="py-3 text-right text-xs text-zinc-600">{new Date(g.joined_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">You haven't joined any groups yet.</p>
          )}
          <Link to="/groups" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors">
            Browse groups →
          </Link>
        </Section>
      )}

      {tab === "learning" && (
        <Section title="Discipleship Progress">
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>{disc.completed ?? 0} completed</span>
            <span>{disc.total ?? 0} total</span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{ width: disc.total ? `${Math.min(100, (disc.completed / disc.total) * 100)}%` : "0%" }}
            />
          </div>
          <p className="text-xs text-zinc-600 mb-4">
            {disc.total && disc.completed < disc.total
              ? `${disc.total - disc.completed} lessons remaining`
              : disc.total ? "All lessons completed." : "No lessons enrolled yet."}
          </p>
          <Link to="/discipleship" className="inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors">
            Continue learning →
          </Link>
        </Section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Moderator view
// ─────────────────────────────────────────────────────────────────────────────

function ModeratorView({ stats, reviews, onReviewAction }) {
  const [tab, setTab] = useState("queue");

  const tabs = [
    { id: "queue",   label: "Review Queue", badge: reviews.length },
    { id: "actions", label: "My Actions" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 mb-7">
        <KpiCard label="Pending Reviews" value={stats?.pending_reviews} alert={stats?.pending_reviews > 0} />
        <KpiCard label="Pending Appeals" value={stats?.pending_appeals} alert={stats?.pending_appeals > 0} />
        <KpiCard label="Actions (session)" value={stats?.my_recent_actions?.length} />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "queue" && (
        reviews.length === 0
          ? <EmptyState message="Review queue is empty — all submissions are processed." />
          : <div className="space-y-3">{reviews.map(r => <ReviewItem key={r.id} review={r} onAction={onReviewAction} />)}</div>
      )}

      {tab === "actions" && (
        <Section title="My Action Log">
          {stats?.my_recent_actions?.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">No actions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    <th className="py-2.5 text-left pr-4 font-medium">Action</th>
                    <th className="py-2.5 text-left pr-4 font-medium">Target</th>
                    <th className="py-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {stats.my_recent_actions.map((e, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-zinc-300">{e.action}</td>
                      <td className="py-2.5 pr-4 text-xs text-zinc-500">
                        {e.target_model}{e.target_id ? ` #${e.target_id}` : ""}
                      </td>
                      <td className="py-2.5 text-right text-xs text-zinc-600">{new Date(e.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hub Leader view
// ─────────────────────────────────────────────────────────────────────────────

function HubLeaderView({ data }) {
  const [tab, setTab] = useState("hub");
  const hub = data?.hub;

  if (!hub?.id) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-12 text-center">
        <p className="text-zinc-500 text-sm mb-1">No hub assigned to your account.</p>
        <p className="text-xs text-zinc-700">Contact an admin to be assigned as a hub leader.</p>
      </div>
    );
  }

  const tabs = [
    { id: "hub",     label: "Hub Details" },
    { id: "members", label: `Members (${data?.members_total ?? 0})` },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 mb-7">
        <KpiCard label="Total Members" value={data.members_total} />
        <KpiCard label="Status" value={hub.status} alert={hub.status !== "approved"} />
        <KpiCard label="Year Founded" value={new Date(hub.created_at).getFullYear()} />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "hub" && (
        <Section title="Hub Information">
          <dl className="divide-y divide-zinc-800/50">
            {[
              ["Name",    hub.name],
              ["City",    hub.city],
              ["Country", hub.country],
              ["Status",  hub.status],
              ["Founded", new Date(hub.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-zinc-200 font-medium capitalize">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {tab === "members" && (
        <Section title="Hub Members">
          {data.members?.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    <th className="py-2.5 text-left pr-4 font-medium">Username</th>
                    <th className="py-2.5 text-left pr-4 font-medium">Email</th>
                    <th className="py-2.5 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {data.members.map(m => (
                    <tr key={m["user__id"]}>
                      <td className="py-3 pr-4 text-zinc-200 font-medium">{m["user__username"]}</td>
                      <td className="py-3 pr-4 text-zinc-500 text-xs">{m["user__email"]}</td>
                      <td className="py-3 text-right text-xs text-zinc-600">{new Date(m.joined_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Super-Admin view
// ─────────────────────────────────────────────────────────────────────────────

const ROLES_ALL   = ["member", "moderator", "hub_leader", "admin", "super_admin"];
const ROLES_ADMIN = ["member", "moderator", "hub_leader", "admin"];

function UserRow({ user, onPromote, onSuspend, onReactivate, allowSuperAdmin }) {
  const roleOpts = allowSuperAdmin ? ROLES_ALL : ROLES_ADMIN;
  return (
    <tr className="hover:bg-zinc-800/30 transition-colors">
      <td className="py-3 pr-4 text-zinc-200 text-sm max-w-[200px] truncate">{user.email}</td>
      <td className="py-3 pr-4">
        <select
          value={user.role}
          onChange={e => onPromote(user.id, e.target.value)}
          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-amber-500 cursor-pointer"
        >
          {roleOpts.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <Badge color={user.is_active ? "emerald" : "red"}>
          {user.is_active ? "Active" : "Suspended"}
        </Badge>
      </td>
      <td className="py-3">
        {user.is_active
          ? <button onClick={() => onSuspend(user.id)} className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors">Suspend</button>
          : <button onClick={() => onReactivate(user.id)} className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors">Reactivate</button>
        }
      </td>
    </tr>
  );
}

function AdminView({ stats, isSuperAdmin, reviews, appeals, onReviewAction, onAppeal, showToast, showConfirm }) {
  const [tab, setTab] = useState("overview");

  // Users tab
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");

  // Admins tab (super_admin only)
  const [admins, setAdmins] = useState([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);

  // Audit log tab (super_admin only)
  const [auditLog, setAuditLog] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(true);
  const [auditLoaded, setAuditLoaded] = useState(false);

  // ── User search ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      getUsers({ q: userQuery })
        .then(r => setUsers(r.data.results ?? r.data))
        .catch(() => showToast("Failed to load users", true));
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery, showToast]);

  // ── Admins tab ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "admins" || adminsLoaded) return;
    getUsers({ role: "admin" })
      .then(r => { setAdmins(r.data.results ?? r.data); setAdminsLoaded(true); })
      .catch(() => showToast("Failed to load admins", true));
  }, [tab, adminsLoaded, showToast]);

  // ── Audit log ──────────────────────────────────────────────────────────────
  const fetchAudit = useCallback((page) => {
    getAuditLog({ page, page_size: 25 })
      .then(r => {
        const rows = r.data.results ?? r.data;
        setAuditLog(prev => page === 1 ? rows : [...prev, ...rows]);
        if (!r.data.next) setAuditHasMore(false);
        setAuditLoaded(true);
      })
      .catch(() => showToast("Failed to load audit log", true));
  }, [showToast]);

  useEffect(() => {
    if (tab !== "audit" || auditLoaded) return;
    fetchAudit(1);
  }, [tab, auditLoaded, fetchAudit]);

  // ── User / admin action helpers ────────────────────────────────────────────
  const handlePromoteUser = (userId, role) => {
    if (isSuperAdmin) {
      const target = users.find(u => u.id === userId);
      showConfirm({
        title: `Change role — ${target?.email ?? `#${userId}`}`,
        description: `You are about to set this account's role to "${role.replace(/_/g, " ")}". This takes effect immediately and is fully audited.`,
        fn: async () => {
          try {
            await promoteUser(userId, role);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
            showToast(`Role updated to ${role}`);
          } catch (e) { showToast(e?.response?.data?.detail ?? "Failed", true); }
        },
      });
    } else {
      promoteUser(userId, role)
        .then(() => { setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u)); showToast(`Role updated to ${role}`); })
        .catch(e => showToast(e?.response?.data?.detail ?? "Failed", true));
    }
  };

  const handleSuspendUser = (userId) => {
    const reason = prompt("Reason for suspension (will be logged):");
    if (!reason) return;
    suspendUser(userId, reason)
      .then(() => { setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u)); showToast("User suspended"); })
      .catch(e => showToast(e?.response?.data?.detail ?? "Failed", true));
  };

  const handleReactivateUser = (userId) => {
    reactivateUser(userId)
      .then(() => { setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: true } : u)); showToast("User reactivated"); })
      .catch(e => showToast(e?.response?.data?.detail ?? "Failed", true));
  };

  const handlePromoteAdmin = (adminId, newRole) => {
    const target = admins.find(a => a.id === adminId);
    showConfirm({
      title: `Change role — ${target?.email ?? `#${adminId}`}`,
      description: `Setting this admin's role to "${newRole.replace(/_/g, " ")}". This immediately changes their system access. All actions are irreversible without another super_admin action.`,
      fn: async () => {
        try {
          await promoteUser(adminId, newRole);
          setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, role: newRole } : a));
          showToast(`Role changed to ${newRole}`);
        } catch (e) { showToast(e?.response?.data?.detail ?? "Failed", true); }
      },
    });
  };

  const handleSuspendAdmin = (adminId) => {
    const target = admins.find(a => a.id === adminId);
    showConfirm({
      title: `Suspend admin — ${target?.email ?? `#${adminId}`}`,
      description: "This suspends the admin account and revokes all access immediately. Their data is preserved. Only a super_admin can reactivate them.",
      fn: async () => {
        try {
          await suspendUser(adminId, "Suspended by super_admin");
          setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, is_active: false } : a));
          showToast("Admin suspended");
        } catch (e) { showToast(e?.response?.data?.detail ?? "Failed", true); }
      },
    });
  };

  const handleReactivateAdmin = (adminId) => {
    const target = admins.find(a => a.id === adminId);
    showConfirm({
      title: `Reactivate — ${target?.email ?? `#${adminId}`}`,
      description: "This restores full admin access for this account immediately.",
      fn: async () => {
        try {
          await reactivateUser(adminId);
          setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, is_active: true } : a));
          showToast("Admin reactivated");
        } catch (e) { showToast(e?.response?.data?.detail ?? "Failed", true); }
      },
    });
  };

  // ── Stats shorthand ────────────────────────────────────────────────────────
  const isSuper = isSuperAdmin;
  const totalUsers    = isSuper ? stats?.platform?.users        : stats?.users?.total;
  const activeOrVer   = isSuper ? stats?.platform?.active_users : stats?.users?.verified;
  const activeOrLabel = isSuper ? "active"                      : "verified";
  const totalContent  = isSuper ? stats?.platform?.content      : stats?.content?.total;
  const pendingReview = isSuper ? stats?.reviews?.pending       : stats?.content?.pending;
  const totalHubs     = isSuper ? stats?.platform?.hubs         : stats?.hubs?.total;
  const pendingHubs   = isSuper ? 0                             : stats?.hubs?.pending ?? 0;
  const totalPrayer   = isSuper ? stats?.platform?.prayer       : stats?.prayer?.total;
  const roleBreakdown = isSuper ? stats?.users_by_role          : stats?.users?.by_role;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users",    label: "Users" },
    { id: "reviews",  label: "Reviews",  badge: reviews.length },
    { id: "appeals",  label: "Appeals",  badge: appeals.length },
    ...(isSuper ? [
      { id: "admins", label: "Admins" },
      { id: "audit",  label: "Audit Log" },
    ] : []),
  ];

  return (
    <>
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-7">
        <KpiCard label="Total Users"     value={totalUsers}   sub={`${activeOrVer ?? 0} ${activeOrLabel}`} />
        <KpiCard label="Content Items"   value={totalContent} sub={`${pendingReview ?? 0} pending review`} alert={pendingReview > 0} />
        <KpiCard label="Revival Hubs"    value={totalHubs}    sub={pendingHubs > 0 ? `${pendingHubs} pending approval` : undefined} alert={pendingHubs > 0} />
        <KpiCard label="Prayer Requests" value={totalPrayer} />
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Role breakdown */}
          <Section title="Role Distribution">
            <div className="space-y-3">
              {roleBreakdown?.map(r => {
                const pct = totalUsers > 0 ? Math.round((r.count / totalUsers) * 100) : 0;
                return (
                  <div key={r.role}>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span className="capitalize font-medium">{r.role.replace(/_/g, " ")}</span>
                      <span className="tabular-nums text-zinc-500">{r.count} <span className="text-zinc-700">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Recent registrations (admin) */}
          {!isSuper && stats?.users?.recent?.length > 0 && (
            <Section title="Recent Registrations">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      <th className="py-2.5 text-left pr-4 font-medium">Email</th>
                      <th className="py-2.5 text-left pr-4 font-medium">Role</th>
                      <th className="py-2.5 text-left pr-4 font-medium">Status</th>
                      <th className="py-2.5 text-right font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {stats.users.recent.map(u => (
                      <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 pr-4 text-zinc-200">{u.email}</td>
                        <td className="py-3 pr-4"><Badge color={u.role === "admin" ? "amber" : u.role === "moderator" ? "blue" : "zinc"}>{u.role.replace(/_/g, " ")}</Badge></td>
                        <td className="py-3 pr-4"><Badge color={u.is_active ? "emerald" : "red"}>{u.is_active ? "Active" : "Suspended"}</Badge></td>
                        <td className="py-3 text-right text-xs text-zinc-600">{new Date(u.date_joined).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Review health (super_admin) */}
          {isSuper && (
            <Section title="Review Health (7 days)">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Pending Reviews", value: stats?.reviews?.pending,       color: "text-amber-300" },
                  { label: "Open Appeals",    value: stats?.reviews?.appeals,       color: "text-red-300" },
                  { label: "Approved",         value: stats?.reviews?.approved_week, color: "text-emerald-300" },
                  { label: "Rejected",         value: stats?.reviews?.rejected_week, color: "text-zinc-300" },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3.5 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.value ?? 0}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recent audit (super_admin) */}
          {isSuper && stats?.recent_audit?.length > 0 && (
            <Section
              title="Recent Activity"
              aside={
                <button onClick={() => setTab("audit")} className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors">
                  View full log →
                </button>
              }
            >
              <div className="divide-y divide-zinc-800/40">
                {stats.recent_audit.slice(0, 8).map(e => (
                  <div key={e.id} className="flex justify-between items-start gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-zinc-300">{e.action}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        {e.actor_email} · {e.target_model}{e.target_id ? ` #${e.target_id}` : ""}
                        {e.detail ? ` — ${e.detail}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-zinc-600">{new Date(e.created_at).toLocaleString()}</p>
                      <p className="font-mono text-[10px] text-zinc-700 mt-0.5">{e.ip_address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── USERS ────────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-4">
          <input
            className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500 transition-colors"
            placeholder="Search by email or username…"
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
          />
          <Section title="All Users">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    <th className="py-2.5 text-left pr-4 font-medium">Email</th>
                    <th className="py-2.5 text-left pr-4 font-medium">Role</th>
                    <th className="py-2.5 text-left pr-4 font-medium">Status</th>
                    <th className="py-2.5 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {users.map(u => (
                    <UserRow key={u.id} user={u} allowSuperAdmin={isSuper}
                      onPromote={handlePromoteUser}
                      onSuspend={handleSuspendUser}
                      onReactivate={handleReactivateUser}
                    />
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="py-10 text-center text-sm text-zinc-600">No users found.</p>}
            </div>
          </Section>
        </div>
      )}

      {/* ── REVIEWS ──────────────────────────────────────────────────────── */}
      {tab === "reviews" && (
        reviews.length === 0
          ? <EmptyState message="Review queue is empty. All submissions are processed." />
          : <div className="space-y-3">{reviews.map(r => <ReviewItem key={r.id} review={r} onAction={onReviewAction} />)}</div>
      )}

      {/* ── APPEALS ──────────────────────────────────────────────────────── */}
      {tab === "appeals" && (
        appeals.length === 0
          ? <EmptyState message="No pending appeals." />
          : <div className="space-y-3">{appeals.map(a => <AppealItem key={a.id} appeal={a} onDecide={onAppeal} />)}</div>
      )}

      {/* ── ADMINS (super_admin only) ─────────────────────────────────────── */}
      {tab === "admins" && isSuper && (
        <Section title="Admin Accounts">
          <p className="text-xs text-zinc-600 mb-4">
            All role changes and suspensions below require two-step confirmation and are permanently audited.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  <th className="py-2.5 text-left pr-4 font-medium">Email</th>
                  <th className="py-2.5 text-left pr-4 font-medium">Role</th>
                  <th className="py-2.5 text-left pr-4 font-medium">Status</th>
                  <th className="py-2.5 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {admins.map(a => (
                  <UserRow key={a.id} user={a} allowSuperAdmin={true}
                    onPromote={handlePromoteAdmin}
                    onSuspend={handleSuspendAdmin}
                    onReactivate={handleReactivateAdmin}
                  />
                ))}
              </tbody>
            </table>
            {admins.length === 0 && <p className="py-10 text-center text-sm text-zinc-600">No admin accounts found.</p>}
          </div>
        </Section>
      )}

      {/* ── AUDIT LOG (super_admin only) ──────────────────────────────────── */}
      {tab === "audit" && isSuper && (
        <Section title="Platform Audit Log">
          <div className="divide-y divide-zinc-800/40">
            {auditLog.map(e => (
              <div key={e.id} className="grid grid-cols-[1fr_auto] gap-x-6 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-zinc-300 truncate">{e.action}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {e.actor_email || e.actor} · {e.target_model}{e.target_id ? ` #${e.target_id}` : ""}
                    {e.detail ? ` — ${e.detail}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-zinc-700">{e.ip_address}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{new Date(e.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {auditLog.length === 0 && <p className="py-8 text-center text-sm text-zinc-600">No audit entries yet.</p>}
          </div>
          {auditHasMore && (
            <button
              onClick={() => { const next = auditPage + 1; setAuditPage(next); fetchAudit(next); }}
              className="mt-4 w-full rounded-lg border border-zinc-800 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              Load more entries
            </button>
          )}
        </Section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_TITLES = {
  member:      "Dashboard",
  moderator:   "Moderation Centre",
  hub_leader:  "Hub Command",
  admin:       "Administration",
  super_admin: "System Control",
};

export default function Dashboard() {
  const { role } = useAuth();

  const [data,     setData]     = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [appeals,  setAppeals]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [confirm,  setConfirm]  = useState(null);  // { title, description, fn }

  const showToast = useCallback((msg, err = false) => setToast({ msg, err }), []);
  const showConfirm = useCallback((opts) => setConfirm(opts), []);

  const isAdmin      = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";
  const isModerator  = role === "moderator";
  const isHubLeader  = role === "hub_leader";
  const isMember     = role === "member";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(false);
    try {
      if (isMember) {
        const r = await getMemberDashboard();
        setData(r.data);
      } else if (isModerator) {
        const [s, r] = await Promise.all([getModeratorStats(), getReviews({ status: "pending" })]);
        setData(s.data);
        setReviews(r.data.results ?? r.data);
      } else if (isHubLeader) {
        const r = await getHubLeaderStats();
        setData(r.data);
      } else if (isSuperAdmin) {
        const [s, r, a] = await Promise.all([getSuperAdminStats(), getReviews({ status: "pending" }), getAppeals({ status: "pending" })]);
        setData(s.data);
        setReviews(r.data.results ?? r.data);
        setAppeals(a.data.results ?? a.data);
      } else if (isAdmin) {
        const [s, r, a] = await Promise.all([getAdminStats(), getReviews({ status: "pending" }), getAppeals({ status: "pending" })]);
        setData(s.data);
        setReviews(r.data.results ?? r.data);
        setAppeals(a.data.results ?? a.data);
      }
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, [role, isAdmin, isSuperAdmin, isModerator, isHubLeader, isMember]);

  useEffect(() => { load(); }, [load]);

  const handleReviewAction = async (id, action, reason) => {
    try {
      await reviewAction(id, action, reason);
      setReviews(prev => prev.filter(r => r.id !== id));
      showToast(`${action === "approve" ? "Approved" : "Rejected"} successfully`);
    } catch (e) { showToast(e?.response?.data?.detail ?? "Action failed", true); }
  };

  const handleAppeal = async (id, decision) => {
    const note = prompt(`Note for appellant (${decision}):`);
    try {
      await resolveAppeal(id, decision, note ?? "");
      setAppeals(prev => prev.filter(a => a.id !== id));
      showToast(`Appeal ${decision}`);
    } catch (e) { showToast(e?.response?.data?.detail ?? "Failed", true); }
  };

  const title = ROLE_TITLES[role] ?? "Dashboard";

  if (loading) return <DashLayout title={title}><Spinner /></DashLayout>;
  if (loadErr)  return <DashLayout title={title}><ErrorState onRetry={load} /></DashLayout>;

  return (
    <DashLayout title={title}>
      {toast && <Toast msg={toast.msg} err={toast.err} onDismiss={() => setToast(null)} />}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          description={confirm.description}
          onConfirm={() => { confirm.fn(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {isMember    && <MemberView data={data} />}
      {isModerator && <ModeratorView stats={data} reviews={reviews} onReviewAction={handleReviewAction} />}
      {isHubLeader && <HubLeaderView data={data} />}
      {isAdmin     && (
        <AdminView
          stats={data}
          isSuperAdmin={isSuperAdmin}
          reviews={reviews}
          appeals={appeals}
          onReviewAction={handleReviewAction}
          onAppeal={handleAppeal}
          showToast={showToast}
          showConfirm={showConfirm}
        />
      )}
    </DashLayout>
  );
}

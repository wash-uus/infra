/**
 * ModeratorDashboard — For moderators.
 * Features: Review Queue, Action Log, Flagged content.
 */
import { useEffect, useState } from "react";
import DashLayout from "../../components/dashboard/DashLayout";
import {
  getModeratorStats,
  getReviews,
  reviewAction,
  getAuditLog,
} from "../../api/dashboard";

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ?? "border-zinc-800 bg-zinc-900"}`}>
      <span className="text-2xl">{icon}</span>
      <p className="mt-3 text-3xl font-bold text-zinc-100">{value ?? 0}</p>
      <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ReviewCard({ review, onAction }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const handle = async (action) => {
    if (action === "reject" && !reason.trim()) { setShowReject(true); return; }
    setBusy(true);
    try {
      await onAction(review.id, action, reason);
    } finally { setBusy(false); setShowReject(false); }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
            review.target_type === "content" ? "bg-blue-900/50 text-blue-300" : "bg-emerald-900/50 text-emerald-300"
          }`}>{review.target_type}</span>
          <p className="mt-1 text-sm text-zinc-200">ID: {review.target_id}</p>
          <p className="text-xs text-zinc-500">Submitted by: {review.submitter_email ?? "—"}</p>
        </div>
        <span className="text-xs text-zinc-600">{new Date(review.created_at).toLocaleDateString()}</span>
      </div>

      {showReject && (
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500"
          placeholder="Reason for rejection (required)"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handle("approve")}
          disabled={busy}
          className="flex-1 rounded-lg bg-emerald-500/15 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          ✓ Approve
        </button>
        <button
          onClick={() => handle("reject")}
          disabled={busy}
          className="flex-1 rounded-lg bg-red-500/15 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

export default function ModeratorDashboard() {
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [s, r, a] = await Promise.all([
        getModeratorStats(),
        getReviews({ status: "pending" }),
        getAuditLog(),
      ]);
      setStats(s.data);
      setReviews(r.data.results ?? r.data);
      setAuditLog(a.data.results ?? a.data);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (id, action, reason) => {
    try {
      await reviewAction(id, action, reason);
      setReviews(prev => prev.filter(r => r.id !== id));
      showToast(`${action === "approve" ? "Approved" : "Rejected"} successfully`);
    } catch (e) {
      showToast(e.response?.data?.detail ?? "Action failed", true);
    }
  };

  if (loading) {
    return (
      <DashLayout title="Moderator Dashboard">
        <div className="flex items-center justify-center h-48 text-zinc-600">Loading…</div>
      </DashLayout>
    );
  }

  if (loadError) {
    return (
      <DashLayout title="Moderator Dashboard">
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
          <p className="text-zinc-400">Failed to load moderator data. Check your connection.</p>
          <button
            onClick={load}
            className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            Try again
          </button>
        </div>
      </DashLayout>
    );
  }

  return (
    <DashLayout title="Moderator Dashboard">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ${
          toast.err ? "bg-red-900 text-red-200" : "bg-emerald-900 text-emerald-200"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon="🔍" label="Pending Reviews" value={stats?.pending_reviews} accent="border-amber-800/40 bg-amber-900/10" />
          <StatCard icon="⚖️" label="Pending Appeals" value={stats?.pending_appeals} />
          <StatCard icon="📋" label="My Recent Actions" value={stats?.my_recent_actions?.length} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Review Queue */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Review Queue {reviews.length > 0 && <span className="ml-2 rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[10px]">{reviews.length}</span>}
            </h2>
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-600">
                ✅ Review queue is clear
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {reviews.map(r => (
                  <ReviewCard key={r.id} review={r} onAction={handleAction} />
                ))}
              </div>
            )}
          </div>

          {/* My Action Log */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">My Action Log</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
              {auditLog.length === 0 ? (
                <p className="px-4 py-6 text-sm text-center text-zinc-600">No actions recorded yet</p>
              ) : auditLog.slice(0, 20).map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-lg shrink-0">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{entry.action}</p>
                    <p className="text-[11px] text-zinc-600">
                      {entry.target_model}{entry.target_id ? ` #${entry.target_id}` : ""} · {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

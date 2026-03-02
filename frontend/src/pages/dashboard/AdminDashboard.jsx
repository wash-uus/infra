/**
 * AdminDashboard — For admin role.
 * Features: Platform stats, user management, content review, hub approval, appeals.
 */
import { useEffect, useState } from "react";
import DashLayout from "../../components/dashboard/DashLayout";
import {
  getAdminStats,
  getUsers,
  promoteUser,
  suspendUser,
  reactivateUser,
  getReviews,
  reviewAction,
  getAppeals,
  resolveAppeal,
} from "../../api/dashboard";

// ── Reusable ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, note, accent }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ?? "border-zinc-800 bg-zinc-900"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-100">{value ?? 0}</p>
      {note && <p className="mt-1 text-xs text-zinc-600">{note}</p>}
    </div>
  );
}

function Toast({ msg, err }) {
  return (
    <div className={`fixed top-5 right-5 z-[99] rounded-xl px-5 py-3 text-sm font-medium shadow-2xl animate-fade-in ${
      err ? "bg-red-900 text-red-200 border border-red-700" : "bg-emerald-900 text-emerald-200 border border-emerald-700"
    }`}>
      {msg}
    </div>
  );
}

// ── Tab nav ───────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Users", "Reviews", "Appeals"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [reviews, setReviews] = useState([]);
  const [rejectReason, setRejectReason] = useState({});
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [s, r, a] = await Promise.all([
        getAdminStats(),
        getReviews({ status: "pending" }),
        getAppeals({ status: "pending" }),
      ]);
      setStats(s.data);
      setReviews(r.data.results ?? r.data);
      setAppeals(a.data.results ?? a.data);
    } catch {
      setLoadError(true);
      showToast("Failed to load dashboard data", true);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab !== "Users") return;
    const t = setTimeout(async () => {
      try {
        const r = await getUsers({ q: userQuery });
        setUsers(r.data.results ?? r.data);
      } catch {
        showToast("Failed to load users", true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [tab, userQuery]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleReview = async (id, action) => {
    const reason = rejectReason[id] ?? "";
    if (action === "reject" && !reason.trim()) {
      showToast("Please enter a reason for rejection", true); return;
    }
    try {
      await reviewAction(id, action, reason);
      setReviews(prev => prev.filter(r => r.id !== id));
      showToast(`${action === "approve" ? "Approved" : "Rejected"} successfully`);
    } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
  };

  const handlePromote = async (userId, role) => {
    try {
      await promoteUser(userId, role);
      showToast(`Role updated to ${role}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
  };

  const handleSuspend = async (userId) => {
    const reason = prompt("Reason for suspension:");
    if (!reason) return;
    try {
      await suspendUser(userId, reason);
      showToast("User suspended");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
    } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
  };

  const handleReactivate = async (userId) => {
    try {
      await reactivateUser(userId);
      showToast("User reactivated");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: true } : u));
    } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
  };

  const handleAppeal = async (id, decision) => {
    const note = prompt(`Note for appellant (${decision}):`);
    try {
      await resolveAppeal(id, decision, note ?? "");
      setAppeals(prev => prev.filter(a => a.id !== id));
      showToast(`Appeal ${decision}`);
    } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
  };

  if (loading) {
    return (
      <DashLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-48 text-zinc-600">Loading…</div>
      </DashLayout>
    );
  }

  if (loadError) {
    return (
      <DashLayout title="Admin Dashboard">
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
          <p className="text-zinc-400">Failed to load admin data. Check your connection.</p>
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
    <DashLayout title="Admin Dashboard">
      {toast && <Toast {...toast} />}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-zinc-800 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t ? "text-amber-400 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
            {t === "Reviews" && reviews.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/25 text-amber-400 px-1.5 py-0.5 text-[10px]">{reviews.length}</span>
            )}
            {t === "Appeals" && appeals.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500/25 text-red-400 px-1.5 py-0.5 text-[10px]">{appeals.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="👥" label="Total Users" value={stats.users?.total}
              note={`${stats.users?.verified ?? 0} verified`} accent="border-blue-800/30 bg-blue-900/10" />
            <StatCard icon="📄" label="Content" value={stats.content?.total}
              note={`${stats.content?.pending ?? 0} pending review`} />
            <StatCard icon="🏛" label="Hubs" value={stats.hubs?.total}
              note={`${stats.hubs?.pending ?? 0} pending approval`} />
            <StatCard icon="🙏" label="Prayer Requests" value={stats.prayer?.total} />
          </div>

          {/* Role breakdown */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Users by Role</h3>
            <div className="flex flex-wrap gap-3">
              {stats.users?.by_role?.map(r => (
                <div key={r.role} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-center min-w-[90px]">
                  <p className="text-xl font-bold text-zinc-100">{r.count}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 capitalize">{r.role.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent users */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent Sign-ups</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-600 uppercase">
                    <th className="py-2 text-left pr-4">Email</th>
                    <th className="py-2 text-left pr-4">Role</th>
                    <th className="py-2 text-left pr-4">Active</th>
                    <th className="py-2 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {stats.users?.recent?.map(u => (
                    <tr key={u.id}>
                      <td className="py-2.5 pr-4 text-zinc-200">{u.email}</td>
                      <td className="py-2.5 pr-4 text-xs capitalize text-zinc-400">{u.role.replace("_", " ")}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${u.is_active ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                          {u.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-zinc-600">{new Date(u.date_joined).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "Users" && (
        <div className="space-y-4">
          <input
            className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500"
            placeholder="Search by email or username…"
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
          />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-600 uppercase">
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-900/60">
                    <td className="py-3 px-4 text-zinc-200">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={e => handlePromote(u.id, e.target.value)}
                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-amber-500"
                      >
                        {["member", "moderator", "hub_leader", "admin"].map(r => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <button
                          onClick={() => handleSuspend(u.id)}
                          className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(u.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-600">No users found</p>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab === "Reviews" && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center text-sm text-zinc-600">
              ✅ No pending reviews
            </div>
          ) : reviews.map(r => (
            <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded mr-2 ${
                    r.target_type === "content" ? "bg-blue-900/50 text-blue-300" : "bg-emerald-900/50 text-emerald-300"
                  }`}>{r.target_type}</span>
                  <span className="text-sm text-zinc-200">ID: {r.target_id}</span>
                  <p className="text-xs text-zinc-500 mt-1">By: {r.submitter_email ?? "—"}</p>
                </div>
                <span className="text-xs text-zinc-600">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <input
                className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-amber-500"
                placeholder="Rejection reason (required only if rejecting)…"
                value={rejectReason[r.id] ?? ""}
                onChange={e => setRejectReason(prev => ({ ...prev, [r.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <button onClick={() => handleReview(r.id, "approve")}
                  className="flex-1 rounded-lg bg-emerald-500/15 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                  ✓ Approve
                </button>
                <button onClick={() => handleReview(r.id, "reject")}
                  className="flex-1 rounded-lg bg-red-500/15 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors">
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── APPEALS ── */}
      {tab === "Appeals" && (
        <div className="space-y-3">
          {appeals.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center text-sm text-zinc-600">
              ⚖️ No pending appeals
            </div>
          ) : appeals.map(a => (
            <div key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Appeal by {a.appellant_email}</p>
                <p className="mt-1 text-xs text-zinc-400">{a.reason}</p>
                <p className="mt-1 text-xs text-zinc-600">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAppeal(a.id, "overturned")}
                  className="flex-1 rounded-lg bg-emerald-500/15 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                  Overturn Decision
                </button>
                <button onClick={() => handleAppeal(a.id, "upheld")}
                  className="flex-1 rounded-lg bg-zinc-700/60 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
                  Uphold Decision
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashLayout>
  );
}

/**
 * SuperAdminDashboard — For super_admin role.
 * Features: Full system stats, admin management, live audit feed, dangerous actions
 * with two-step confirmation.
 */
import { useEffect, useState, useCallback } from "react";
import DashLayout from "../../components/dashboard/DashLayout";
import {
  getSuperAdminStats,
  getUsers,
  promoteUser,
  suspendUser,
  reactivateUser,
  getAuditLog,
} from "../../api/dashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`rounded-xl border p-5 ${color ?? "border-zinc-800 bg-zinc-900"}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-100">{value ?? 0}</p>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function Toast({ msg, err }) {
  return (
    <div className={`fixed top-5 right-5 z-[99] rounded-xl px-5 py-3 text-sm font-medium shadow-2xl ${
      err ? "bg-red-900 text-red-200 border border-red-700" : "bg-emerald-900 text-emerald-200 border border-emerald-700"
    }`}>
      {msg}
    </div>
  );
}

/**
 * Two-step confirmation modal for destructive actions.
 */
function ConfirmModal({ title, description, confirmLabel, onConfirm, onCancel }) {
  const [typed, setTyped] = useState("");
  const required = "CONFIRM";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="rounded-2xl border border-red-800/40 bg-zinc-900 p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-base font-semibold text-red-400 mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-4">{description}</p>
        <p className="text-xs text-zinc-600 mb-2">
          Type <span className="font-mono text-zinc-300">{required}</span> to proceed
        </p>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500 mb-4"
          value={typed}
          placeholder={required}
          onChange={e => setTyped(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            Cancel
          </button>
          <button
            disabled={typed !== required}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600/80 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-30 hover:enabled:bg-red-600"
          >
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = ["Overview", "Admins", "Audit Log"];

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditHasMore, setAuditHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { title, desc, label, fn }

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load overview data ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const r = await getSuperAdminStats();
        setStats(r.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  // ── Load admins tab ────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "Admins") return;
    const load = async () => {
      try {
        const r = await getUsers({ role: "admin" });
        setAdmins(r.data.results ?? r.data);
      } catch {}
    };
    load();
  }, [tab]);

  // ── Load audit log ─────────────────────────────────────────────────────────
  const loadAudit = useCallback(async (page = 1) => {
    try {
      const r = await getAuditLog({ page, page_size: 25 });
      const rows = r.data.results ?? r.data;
      setAudit(prev => page === 1 ? rows : [...prev, ...rows]);
      if (!r.data.next) setAuditHasMore(false);
    } catch {}
  }, []);

  useEffect(() => {
    if (tab !== "Audit Log") return;
    setAuditPage(1);
    setAuditHasMore(true);
    loadAudit(1);
  }, [tab, loadAudit]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handlePromote = (userId, role) => {
    const admin = admins.find(a => a.id === userId);
    setConfirmAction({
      title: `Change role for ${admin?.email}`,
      description: `You are about to change this admin's role to "${role}". This affects their system access immediately.`,
      label: "Change Role",
      fn: async () => {
        try {
          await promoteUser(userId, role);
          setAdmins(prev => prev.map(a => a.id === userId ? { ...a, role } : a));
          showToast(`Role changed to ${role}`);
        } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
        setConfirmAction(null);
      },
    });
  };

  const handleSuspend = (userId) => {
    const admin = admins.find(a => a.id === userId);
    setConfirmAction({
      title: `Suspend ${admin?.email}`,
      description: `This will suspend the admin account and prevent login. Their content and data will remain intact.`,
      label: "Suspend Admin",
      fn: async () => {
        const reason = "Suspended by super_admin";
        try {
          await suspendUser(userId, reason);
          setAdmins(prev => prev.map(a => a.id === userId ? { ...a, is_active: false } : a));
          showToast("Admin suspended");
        } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
        setConfirmAction(null);
      },
    });
  };

  const handleReactivate = (userId) => {
    const admin = admins.find(a => a.id === userId);
    setConfirmAction({
      title: `Reactivate ${admin?.email}`,
      description: `This will restore full admin access for this account.`,
      label: "Reactivate",
      fn: async () => {
        try {
          await reactivateUser(userId);
          setAdmins(prev => prev.map(a => a.id === userId ? { ...a, is_active: true } : a));
          showToast("Admin reactivated");
        } catch (e) { showToast(e.response?.data?.detail ?? "Failed", true); }
        setConfirmAction(null);
      },
    });
  };

  if (loading) {
    return (
      <DashLayout title="Super Admin Dashboard">
        <div className="flex items-center justify-center h-48 text-zinc-600">Loading…</div>
      </DashLayout>
    );
  }

  return (
    <DashLayout title="Super Admin Dashboard">
      {toast && <Toast {...toast} />}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel={confirmAction.label}
          onConfirm={confirmAction.fn}
          onCancel={() => setConfirmAction(null)}
        />
      )}

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
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && stats && (
        <div className="space-y-6">
          {/* Platform stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="👥" label="Total Users" value={stats.platform?.users}
              sub={`${stats.platform?.active_users ?? 0} active`} color="border-blue-800/30 bg-blue-900/10" />
            <StatCard icon="🏛" label="Hubs" value={stats.platform?.hubs}
              color="border-violet-800/30 bg-violet-900/10" />
            <StatCard icon="📖" label="Content Posts" value={stats.platform?.content}
              color="border-amber-800/30 bg-amber-900/10" />
            <StatCard icon="🙏" label="Prayer Requests" value={stats.platform?.prayer} />
          </div>

          {/* Role + review breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Role Distribution</h3>
              <div className="space-y-2">
                {stats.users_by_role?.map(r => {
                  const pct = stats.platform?.users > 0 ? Math.round((r.count / stats.platform.users) * 100) : 0;
                  return (
                    <div key={r.role}>
                      <div className="flex justify-between mb-1 text-xs text-zinc-400">
                        <span className="capitalize">{r.role.replace("_", " ")}</span>
                        <span>{r.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Review Backlog</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Pending Reviews", val: stats.reviews?.pending, color: "text-amber-400" },
                  { label: "Open Appeals", val: stats.reviews?.appeals, color: "text-red-400" },
                  { label: "Approved (7d)", val: stats.reviews?.approved_week, color: "text-emerald-400" },
                  { label: "Rejected (7d)", val: stats.reviews?.rejected_week, color: "text-zinc-300" },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-zinc-800 p-3 text-center">
                    <p className={`text-2xl font-bold ${item.color}`}>{item.val ?? 0}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent audit snapshot */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Recent Actions</h3>
              <button onClick={() => setTab("Audit Log")} className="text-xs text-amber-500 hover:text-amber-400">
                View full log →
              </button>
            </div>
            <div className="space-y-2">
              {stats.recent_audit?.map(entry => (
                <div key={entry.id} className="flex justify-between items-start text-xs py-1.5 border-b border-zinc-800/50 last:border-0">
                  <div>
                    <span className="text-zinc-200 font-medium">{entry.actor_email}</span>
                    <span className="text-zinc-600 mx-2">·</span>
                    <span className="text-zinc-400">{entry.action}</span>
                    {entry.detail && <span className="text-zinc-600 ml-2">— {entry.detail}</span>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-zinc-600">{new Date(entry.created_at).toLocaleString()}</p>
                    <p className="text-zinc-700 font-mono mt-0.5">{entry.ip_address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ADMINS ── */}
      {tab === "Admins" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-600">
            As super_admin you can promote/demote admins and change their roles. All actions are audited.
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-600 uppercase">
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Current Role</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Change Role</th>
                  <th className="py-3 px-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-zinc-800/40">
                    <td className="py-3 px-4 text-zinc-200">{a.email}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {a.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                        {a.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        defaultValue={a.role}
                        onChange={e => handlePromote(a.id, e.target.value)}
                        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-amber-500"
                      >
                        {["member", "moderator", "hub_leader", "admin", "super_admin"].map(r => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {a.is_active ? (
                        <button onClick={() => handleSuspend(a.id)}
                          className="text-xs text-red-400 hover:text-red-300 underline">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(a.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline">
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {admins.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-600">No admins found</p>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {tab === "Audit Log" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] text-zinc-600 uppercase">
                  <th className="py-3 px-4 text-left">Actor</th>
                  <th className="py-3 px-4 text-left">Action</th>
                  <th className="py-3 px-4 text-left">Target</th>
                  <th className="py-3 px-4 text-left">IP</th>
                  <th className="py-3 px-4 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {audit.map(e => (
                  <tr key={e.id} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 px-4 text-zinc-300">{e.actor_email}</td>
                    <td className="py-2.5 px-4 text-zinc-400">{e.action}</td>
                    <td className="py-2.5 px-4 text-zinc-600">
                      {e.target_model ? `${e.target_model} #${e.target_id}` : "—"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-700">{e.ip_address}</td>
                    <td className="py-2.5 px-4 text-zinc-600">{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-600">No audit entries</p>
            )}
          </div>

          {auditHasMore && (
            <button
              onClick={() => {
                const next = auditPage + 1;
                setAuditPage(next);
                loadAudit(next);
              }}
              className="w-full py-2.5 rounded-xl border border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </DashLayout>
  );
}

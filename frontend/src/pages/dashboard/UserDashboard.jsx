/**
 * UserDashboard — Personal dashboard for members.
 * Sections: Overview cards, Prayer, Groups, Hub, Discipleship, Profile quick-edit.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashLayout from "../../components/dashboard/DashLayout";
import { getMemberDashboard } from "../../api/dashboard";

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-100">{value ?? "—"}</p>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

export default function UserDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setError(false);
    getMemberDashboard()
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) {
    return (
      <DashLayout title="My Dashboard">
        <div className="flex items-center justify-center h-48 text-zinc-600">Loading…</div>
      </DashLayout>
    );
  }

  if (error) {
    return (
      <DashLayout title="My Dashboard">
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
          <p className="text-zinc-400">Failed to load dashboard data.</p>
          <button
            onClick={loadDashboard}
            className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            Try again
          </button>
        </div>
      </DashLayout>
    );
  }

  const profile = data?.profile ?? {};
  const prayer = data?.prayer ?? {};
  const discipleship = data?.discipleship ?? {};

  return (
    <DashLayout title="My Dashboard">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="🙏" label="Prayer Requests" value={prayer.total} sub={`${prayer.engagement ?? 0} total engagements`} />
          <StatCard icon="👥" label="Groups Joined" value={data?.groups?.length ?? 0} />
          <StatCard icon="📖" label="Lessons Done" value={discipleship.completed} sub={`of ${discipleship.total ?? 0} total`} />
          <StatCard icon="📄" label="Content Submitted" value={data?.content_submitted ?? 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile */}
          <Section title="My Profile">
            <dl className="space-y-2 text-sm">
              {[
                ["Username", profile.username],
                ["Email", profile.email],
                ["Country", profile.country || "—"],
                ["City", profile.city || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-zinc-500 shrink-0">{k}</dt>
                  <dd className="text-zinc-200 text-right truncate">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              to="/profile"
              className="mt-4 inline-block rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              Edit Profile →
            </Link>
          </Section>

          {/* Hub */}
          <Section title="My Hub">
            {data?.hub?.id ? (
              <div>
                <p className="text-zinc-100 font-medium">{data.hub.name}</p>
                <p className="text-sm text-zinc-500 mt-1">{data.hub.city}</p>
                <Link
                  to="/hubs"
                  className="mt-4 inline-block text-xs text-amber-500 hover:text-amber-400"
                >
                  View hub →
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-500">You haven't joined a hub yet.</p>
                <Link
                  to="/hubs"
                  className="mt-3 inline-block rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-500 hover:bg-amber-500/10 transition-colors"
                >
                  Browse Revival Hubs →
                </Link>
              </div>
            )}
          </Section>

          {/* Prayer requests */}
          <Section title="My Prayer Requests">
            {prayer.recent?.length > 0 ? (
              <ul className="space-y-2">
                {prayer.recent.map(p => (
                  <li key={p.id} className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-200 truncate">{p.title}</span>
                    <span className="shrink-0 text-xs text-zinc-600">🙏 {p.prayer_count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No prayer requests yet.</p>
            )}
            <Link
              to="/prayer"
              className="mt-3 inline-block text-xs text-amber-500 hover:text-amber-400"
            >
              Submit prayer request →
            </Link>
          </Section>

          {/* Groups */}
          <Section title="My Groups">
            {data?.groups?.length > 0 ? (
              <ul className="space-y-2">
                {data.groups.slice(0, 5).map(g => (
                  <li key={g["group__id"]} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-200">{g["group__name"]}</span>
                    <Link to="/groups" className="text-xs text-amber-500">View →</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">You haven't joined any groups.</p>
            )}
            <Link to="/groups" className="mt-3 inline-block text-xs text-amber-500 hover:text-amber-400">
              Browse Groups →
            </Link>
          </Section>
        </div>

        {/* Discipleship progress bar */}
        <Section title="Discipleship Progress">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>{discipleship.completed ?? 0} lessons completed</span>
            <span>{discipleship.total ?? 0} total</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{
                width: discipleship.total
                  ? `${Math.min(100, ((discipleship.completed / discipleship.total) * 100).toFixed(1))}%`
                  : "0%",
              }}
            />
          </div>
          <Link to="/discipleship" className="mt-3 inline-block text-xs text-amber-500 hover:text-amber-400">
            Continue learning →
          </Link>
        </Section>
      </div>
    </DashLayout>
  );
}

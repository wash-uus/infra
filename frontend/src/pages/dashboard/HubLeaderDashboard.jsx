/**
 * HubLeaderDashboard — For hub_leader role.
 * Features: Hub overview, members table, statistics.
 */
import { useEffect, useState } from "react";
import DashLayout from "../../components/dashboard/DashLayout";
import { getHubLeaderStats } from "../../api/dashboard";

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {children}
    </div>
  );
}

export default function HubLeaderDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHubLeaderStats()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashLayout title="Hub Leader Dashboard">
        <div className="flex items-center justify-center h-48 text-zinc-600">Loading…</div>
      </DashLayout>
    );
  }

  if (!data?.hub?.id) {
    return (
      <DashLayout title="Hub Leader Dashboard">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
          <p className="text-4xl mb-4">🏛</p>
          <p className="text-zinc-400">You don't have an assigned hub yet.</p>
          <p className="text-xs text-zinc-600 mt-2">Contact admin to be assigned as a hub leader.</p>
        </div>
      </DashLayout>
    );
  }

  const hub = data.hub;

  return (
    <DashLayout title="Hub Leader Dashboard">
      <div className="space-y-6">
        {/* Hub header */}
        <div className="rounded-xl border border-amber-800/30 bg-amber-900/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">{hub.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">{hub.city}, {hub.country}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              hub.status === "approved" ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-900/50 text-amber-300"
            }`}>
              {hub.status}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-black/30 p-3 text-center">
              <p className="text-2xl font-bold text-zinc-100">{data.members_total}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Members</p>
            </div>
            <div className="rounded-lg bg-black/30 p-3 text-center">
              <p className="text-2xl font-bold text-zinc-100">
                {new Date(hub.created_at).getFullYear()}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Year Founded</p>
            </div>
          </div>
        </div>

        {/* Members table */}
        <Section title={`Members (${data.members_total})`}>
          {data.members?.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-6">No members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
                    <th className="py-2 text-left pr-4">Username</th>
                    <th className="py-2 text-left pr-4">Email</th>
                    <th className="py-2 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.members.map(m => (
                    <tr key={m["user__id"]}>
                      <td className="py-2.5 pr-4 text-zinc-200 font-medium">{m["user__username"]}</td>
                      <td className="py-2.5 pr-4 text-zinc-400 text-xs">{m["user__email"]}</td>
                      <td className="py-2.5 text-zinc-600 text-xs">
                        {new Date(m.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Monthly report CTA */}
        <Section title="Monthly Report">
          <p className="text-sm text-zinc-500 mb-4">Submit your monthly hub activity report to the admin.</p>
          <button className="rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/25 transition-colors">
            📋 Submit Monthly Report
          </button>
        </Section>
      </div>
    </DashLayout>
  );
}

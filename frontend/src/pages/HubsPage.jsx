import { useEffect, useState } from "react";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const statusInfo = {
  approved: { label: "Approved", cls: "badge-green" },
  pending: { label: "Pending", cls: "badge-gold" },
};

export default function HubsPage() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", city: "", description: "", meeting_schedule: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    api.get("/hubs/")
      .then((r) => setHubs(r.data.results || []))
      .catch(() => setHubs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (id) => {
    if (!isAuthenticated) return;
    try {
      await api.post(`/hubs/${id}/join/`);
    } catch { /* noop */ }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await api.post("/hubs/", form);
      setHubs((prev) => [r.data, ...prev]);
      setForm({ name: "", country: "", city: "", description: "", meeting_schedule: "" });
      setShowForm(false);
      setSuccess("Hub application submitted! Awaiting admin approval.");
      setTimeout(() => setSuccess(""), 4000);
    } catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Network</p>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Revival Hubs</h1>
            <p className="mt-2 text-zinc-500">Physical and digital revival centres forming across Africa.</p>
          </div>
          {isAuthenticated && (
            <button onClick={() => setShowForm((v) => !v)} className="btn-gold py-2.5 px-6 text-sm">
              {showForm ? "Cancel" : "Apply to Start a Hub"}
            </button>
          )}
        </div>

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 text-center">
            {success}
          </div>
        )}

        {/* Apply form */}
        {showForm && (
          <form onSubmit={handleApply} className="card mb-10 grid gap-4 sm:grid-cols-2">
            <h2 className="col-span-full font-bold text-white text-lg">Apply for a Revival Hub</h2>
            {[
              { key: "name", placeholder: "Hub name" },
              { key: "country", placeholder: "Country" },
              { key: "city", placeholder: "City" },
              { key: "meeting_schedule", placeholder: "Meeting schedule (e.g. Sundays 6pm)" },
            ].map(({ key, placeholder }) => (
              <input key={key} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="input-dark" />
            ))}
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe your hub vision…" rows={3} className="input-dark col-span-full resize-none" />
            <div className="col-span-full flex justify-end">
              <button type="submit" disabled={submitting} className="btn-gold py-2.5 px-7 text-sm disabled:opacity-60">
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </form>
        )}

        {/* Hub list */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-zinc-900" />)}
          </div>
        ) : hubs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-20 text-center">
            <p className="text-5xl mb-4">🔥</p>
            <p className="font-bold text-zinc-300 text-lg">No Hubs Yet</p>
            <p className="mt-2 text-sm text-zinc-600">Be the first to apply and start a revival hub in your city.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map((hub) => (
              <div key={hub.id} className="card-hover flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-xl ring-1 ring-zinc-800">
                    🔥
                  </div>
                  <span className={(statusInfo[hub.status] || statusInfo.pending).cls + " mt-1"}>
                    {(statusInfo[hub.status] || statusInfo.pending).label}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white">{hub.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{hub.city}, {hub.country}</p>
                </div>

                {hub.description && (
                  <p className="text-sm text-zinc-500 line-clamp-2">{hub.description}</p>
                )}

                {hub.meeting_schedule && (
                  <p className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <span>🗓</span> {hub.meeting_schedule}
                  </p>
                )}

                <div className="mt-auto border-t border-zinc-800 pt-3">
                  {isAuthenticated && hub.status === "approved" && (
                    <button onClick={() => handleJoin(hub.id)} className="w-full btn-outline py-2 text-xs justify-center">
                      Join Hub
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

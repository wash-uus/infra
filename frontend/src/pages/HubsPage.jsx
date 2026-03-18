import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const statusInfo = {
  approved: { label: "Approved", cls: "badge-green" },
  pending: { label: "Pending", cls: "badge-gold" },
};

function Toast({ msg, err }) {
  return (
    <div className={`fixed top-5 right-5 z-[99] rounded-xl px-5 py-3 text-sm font-medium shadow-2xl ${
      err ? "bg-red-900 text-red-200 border border-red-700" : "bg-emerald-900 text-emerald-200 border border-emerald-700"
    }`}>
      {msg}
    </div>
  );
}

export default function HubsPage() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", city: "", description: "", meeting_schedule: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [applyError, setApplyError] = useState("");
  const [toast, setToast] = useState(null);
  const { isAuthenticated } = useAuth();

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get("/hubs/")
      .then((r) => {
        setHubs(r.data.results || []);
        setNextUrl(r.data.next || null);
      })
      .catch(() => setHubs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.get(nextUrl);
      setHubs((prev) => [...prev, ...(r.data.results || [])]);
      setNextUrl(r.data.next || null);
    } catch { /* noop */ }
    finally { setLoadingMore(false); }
  };

  const handleJoin = async (id) => {
    if (!isAuthenticated) return;
    try {
      await api.post(`/hubs/${id}/join/`);
      setHubs((prev) => prev.map((h) => h.id === id ? { ...h, is_member: true, member_count: (h.member_count || 0) + 1 } : h));
      showToast("You have joined this hub! Welcome to the network.");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to join hub. Please try again.";
      showToast(msg, true);
    }
  };

  const handleLeave = async (id) => {
    if (!isAuthenticated) return;
    try {
      await api.post(`/hubs/${id}/leave/`);
      setHubs((prev) => prev.map((h) => h.id === id ? { ...h, is_member: false, member_count: Math.max(0, (h.member_count || 1) - 1) } : h));
      showToast("You have left the hub.");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to leave hub. Please try again.";
      showToast(msg, true);
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Hub name is required.";
    if (!form.country.trim()) errs.country = "Country is required.";
    if (!form.city.trim()) errs.city = "City is required.";
    if (!form.description.trim()) errs.description = "Please describe your hub vision.";
    return errs;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitting(true);
    setApplyError("");
    try {
      const r = await api.post("/hubs/", form);
      setHubs((prev) => [r.data, ...prev]);
      setForm({ name: "", country: "", city: "", description: "", meeting_schedule: "" });
      setShowForm(false);
      setSuccess("Hub application submitted! Awaiting admin approval.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      const msg = err?.response?.data?.name?.[0]
        || err?.response?.data?.detail
        || "Failed to submit application. Please try again.";
      setApplyError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-bg min-h-screen">
      {toast && <Toast {...toast} />}
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
              <div key={key} className="flex flex-col gap-1">
                <input value={form[key]} onChange={(e) => { setForm((p) => ({ ...p, [key]: e.target.value })); setFormErrors((p) => ({ ...p, [key]: "" })); }} placeholder={placeholder} className={`input-dark ${formErrors[key] ? "border-red-500" : ""}`} />
                {formErrors[key] && <p className="text-xs text-red-400">{formErrors[key]}</p>}
              </div>
            ))}
            <div className="col-span-full flex flex-col gap-1">
              <textarea value={form.description} onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setFormErrors((p) => ({ ...p, description: "" })); }} placeholder="Describe your hub vision…" rows={3} className={`input-dark resize-none ${formErrors.description ? "border-red-500" : ""}`} />
              {formErrors.description && <p className="text-xs text-red-400">{formErrors.description}</p>}
            </div>
            {applyError && (
              <p className="col-span-full text-sm text-red-400">{applyError}</p>
            )}
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

                <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-3">
                  {hub.member_count !== undefined && hub.member_count !== null && (
                    <span className="text-xs text-zinc-600">{hub.member_count} member{hub.member_count !== 1 ? "s" : ""}</span>
                  )}
                  <div className="ml-auto">
                    {isAuthenticated && hub.status === "approved" && (
                      hub.is_member ? (
                        <button onClick={() => handleLeave(hub.id)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400">
                          Leave Hub
                        </button>
                      ) : (
                        <button onClick={() => handleJoin(hub.id)} className="btn-outline py-1.5 px-3 text-xs justify-center">
                          Join Hub
                        </button>
                      )
                    )}
                    {!isAuthenticated && hub.status === "approved" && (
                      <Link to="/login" state={{ from: { pathname: "/hubs" } }} className="block text-center py-1.5 px-3 text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                        Sign in to join
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {nextUrl && !loading && (
          <div className="mt-10 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="btn-outline px-8 py-2.5 text-sm rounded-xl disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

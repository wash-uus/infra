import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PrayerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", is_public: true });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/prayer/requests/")
      .then((r) => {
        setRequests(r.data.results || []);
        setNextUrl(r.data.next || null);
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.get(nextUrl);
      setRequests((prev) => [...prev, ...(r.data.results || [])]);
      setNextUrl(r.data.next || null);
    } catch { /* noop */ }
    finally { setLoadingMore(false); }
  };

  const handlePray = async (id) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/prayer" } } });
      return;
    }
    try {
      const r = await api.post(`/prayer/requests/${id}/prayed/`);
      setRequests((prev) =>
        prev.map((p) => (p.id === id ? { ...p, prayer_count: r.data.prayer_count } : p))
      );
    } catch { /* noop */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this prayer request?")) return;
    try {
      await api.delete(`/prayer/requests/${id}/`);
      setRequests((prev) => prev.filter((p) => p.id !== id));
    } catch { /* noop */ }
  };

  const startEdit = (req) => {
    setEditingId(req.id);
    setEditForm({ title: req.title, description: req.description });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.patch(`/prayer/requests/${editingId}/`, editForm);
      setRequests((prev) => prev.map((p) => (p.id === editingId ? r.data : p)));
      setEditingId(null);
    } catch { /* noop */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await api.post("/prayer/requests/", form);
      setRequests((prev) => [r.data, ...prev]);
      setForm({ title: "", description: "", is_public: true });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.non_field_errors?.[0]
        || "Failed to submit request. Please try again.";
      setSubmitError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Intercession</p>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Prayer Wall</h1>
          <p className="mt-2 text-zinc-500">Stand together in faith. Every prayer matters.</p>
        </div>

        {/* Submit form */}
        {isAuthenticated && (
          <div className="card mb-10">
            <h2 className="mb-4 font-bold text-white">Share a Prayer Request</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title of your request…"
                required
                className="input-dark"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Share your prayer need in detail…"
                rows={3}
                required
                minLength={10}
                className="input-dark resize-none"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-amber-500"
                  />
                  Make public
                </label>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto btn-gold py-2 px-5 text-sm disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
              {submitted && (
                <p className="text-sm text-emerald-400">Your prayer request has been shared. 🙏</p>
              )}
              {submitError && (
                <p className="text-sm text-red-400">{submitError}</p>
              )}
            </form>
          </div>
        )}

        {/* Requests */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
            <p className="text-4xl mb-3">🙏</p>
            <p className="text-zinc-400 font-semibold">No prayer requests yet</p>
            <p className="mt-1 text-sm text-zinc-600">Be the first to share a prayer need.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="card group flex flex-col gap-3">
                {editingId === req.id ? (
                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      required
                      className="input-dark"
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      required
                      minLength={10}
                      className="input-dark resize-none"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="btn-gold py-1.5 px-4 text-xs">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-white">{req.title}</h3>
                        <p className="mt-1 text-sm text-zinc-500 line-clamp-3">{req.description}</p>
                      </div>
                      {!req.is_public && <span className="badge-zinc shrink-0">Private</span>}
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-500 font-medium">
                          {req.author_name || "Anonymous"}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.is_owner && (
                          <>
                            <button
                              onClick={() => startEdit(req)}
                              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(req.id)}
                              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handlePray(req.id)}
                          title={!isAuthenticated ? "Sign in to pray" : undefined}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-400"
                        >
                          🙏 {req.prayer_count ?? 0}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {nextUrl && !loading && (
          <div className="mt-8 text-center">
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

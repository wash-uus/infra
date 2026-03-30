import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import StatusBadge from "../StatusBadge";

const INITIAL_FORM = {
  title: "",
  submitter_name: "",
  story: "",
  photo: null,
};

function validateField(name, value) {
  if (name === "title") {
    return value.trim().length >= 5 ? "" : "Title must be at least 5 characters.";
  }
  if (name === "submitter_name") {
    return value.trim().length >= 2 ? "" : "Submitter name is required.";
  }
  if (name === "story") {
    return value.trim().length >= 50 ? "" : "Story content must be at least 50 characters.";
  }
  return "";
}

export default function StorySubmissionForm() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [myStories, setMyStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [editingStoryId, setEditingStoryId] = useState(null);
  const [editStoryForm, setEditStoryForm] = useState({ title: "", story: "", author_name: "", photo: null });
  const [editStoryError, setEditStoryError] = useState("");
  const [editStorySaving, setEditStorySaving] = useState(false);

  const canSubmit = useMemo(() => {
    return ["title", "submitter_name", "story"].every((field) => !validateField(field, form[field]));
  }, [form]);

  const loadMyStories = async () => {
    if (!isAuthenticated) {
      setMyStories([]);
      setLoadingStories(false);
      return;
    }
    setLoadingStories(true);
    try {
      const { data } = await api.get("/content/stories/submit/");
      setMyStories(data.results || []);
    } catch {
      setMyStories([]);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    loadMyStories();
  }, [isAuthenticated]);

  const startEditStory = (storyItem) => {
    setEditingStoryId(storyItem.id);
    setEditStoryForm({ title: storyItem.title, story: storyItem.story, author_name: storyItem.author_name || "", photo: null });
    setEditStoryError("");
  };

  const cancelEditStory = () => {
    setEditingStoryId(null);
    setEditStoryError("");
  };

  const handleEditStorySubmit = async (e) => {
    e.preventDefault();
    setEditStorySaving(true);
    setEditStoryError("");
    const payload = new FormData();
    if (editStoryForm.title.trim()) payload.append("title", editStoryForm.title.trim());
    if (editStoryForm.story.trim()) payload.append("story", editStoryForm.story.trim());
    if (editStoryForm.author_name.trim()) payload.append("author_name", editStoryForm.author_name.trim());
    if (editStoryForm.photo) payload.append("photo", editStoryForm.photo);
    try {
      await api.patch(`/content/stories/${editingStoryId}/edit/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditingStoryId(null);
      await loadMyStories();
    } catch (err) {
      setEditStoryError(err?.response?.data?.detail || "Could not save changes.");
    } finally {
      setEditStorySaving(false);
    }
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      title: validateField("title", form.title),
      submitter_name: validateField("submitter_name", form.submitter_name),
      story: validateField("story", form.story),
    };
    setErrors(nextErrors);
    setSubmitError("");
    setSubmitMessage("");

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const payload = new FormData();
    payload.append("title", form.title.trim());
    payload.append("story", form.story.trim());
    payload.append("submitter_name", form.submitter_name.trim());
    if (form.photo) {
      payload.append("photo", form.photo);
    }

    setSubmitting(true);
    try {
      await api.post("/content/stories/submit/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(INITIAL_FORM);
      setErrors({});
      setSubmitMessage("Your story has been submitted for moderation.");
      await loadMyStories();
    } catch (error) {
      setSubmitError(error?.response?.data?.detail || "Could not submit story right now.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-8 shadow-xl shadow-black/30">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Share Your Testimony</p>
        <h2 className="text-2xl font-black text-white">Your story goes through moderation before it goes live.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Sign in first to submit your story, track its review status, and receive approval or rejection updates.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/login" className="btn-gold px-6 py-3 text-sm">Sign In to Submit</Link>
          <Link to="/register" className="btn-outline px-6 py-3 text-sm">Join the Movement</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-amber-500/20 bg-zinc-950/80 p-8 shadow-xl shadow-black/30">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Share Your Testimony</p>
        <h2 className="text-2xl font-black text-white">Encourage the movement with a real story of what God has done.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Every submission enters a pending review state first. Approved stories become public and shareable across the platform.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Story title</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className={`input-dark ${errors.title ? "border-red-500" : ""}`}
              placeholder="What breakthrough or moment happened?"
            />
            {errors.title ? <p className="mt-2 text-xs text-red-400">{errors.title}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Submitter name</label>
            <input
              type="text"
              value={form.submitter_name}
              onChange={(event) => updateField("submitter_name", event.target.value)}
              className={`input-dark ${errors.submitter_name ? "border-red-500" : ""}`}
              placeholder="How should your name appear publicly?"
            />
            {errors.submitter_name ? <p className="mt-2 text-xs text-red-400">{errors.submitter_name}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Story content</label>
            <textarea
              value={form.story}
              onChange={(event) => updateField("story", event.target.value)}
              rows={8}
              className={`input-dark resize-none ${errors.story ? "border-red-500" : ""}`}
              placeholder="Share what happened, what changed, and how God moved..."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{errors.story || "Minimum 50 characters."}</span>
              <span>{form.story.trim().length} chars</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Optional photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setForm((prev) => ({ ...prev, photo: event.target.files?.[0] || null }))}
              className="input-dark file:mr-4 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-300"
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400">
            Moderation note: editing or resubmitting after rejection sends the story back into review before it appears publicly.
          </div>

          {submitMessage ? <p className="text-sm text-emerald-400">{submitMessage}</p> : null}
          {submitError ? <p className="text-sm text-red-400">{submitError}</p> : null}

          <button type="submit" disabled={submitting || !canSubmit} className="btn-gold px-7 py-3 text-sm disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit Story for Review"}
          </button>
        </form>
      </section>

      <aside className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">My submissions</p>
        <h3 className="text-xl font-black text-white">Track review progress</h3>
        <p className="mt-3 text-sm text-zinc-400">You can see whether your story is pending, rejected, or already live.</p>

        <div className="mt-6 space-y-3">
          {loadingStories ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}
            </div>
          ) : myStories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-6 text-sm text-zinc-500">
              No submissions yet. Your first story will appear here once you send it for review.
            </div>
          ) : myStories.map((storyItem) => (
            <div key={storyItem.id} className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
              {editingStoryId === storyItem.id ? (
                <form onSubmit={handleEditStorySubmit} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Edit story</p>
                  <input
                    type="text"
                    value={editStoryForm.title}
                    onChange={(e) => setEditStoryForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Title"
                    className="input-dark text-sm"
                    required
                  />
                  <textarea
                    value={editStoryForm.story}
                    onChange={(e) => setEditStoryForm((p) => ({ ...p, story: e.target.value }))}
                    placeholder="Your story…"
                    rows={5}
                    className="input-dark resize-none text-sm"
                    required
                    minLength={50}
                  />
                  <input
                    type="text"
                    value={editStoryForm.author_name}
                    onChange={(e) => setEditStoryForm((p) => ({ ...p, author_name: e.target.value }))}
                    placeholder="Author name (optional)"
                    className="input-dark text-sm"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditStoryForm((p) => ({ ...p, photo: e.target.files?.[0] || null }))}
                    className="input-dark text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-amber-300"
                  />
                  {editStoryError && <p className="text-xs text-red-400">{editStoryError}</p>}
                  <p className="text-xs text-zinc-500">Saving will reset this story to &ldquo;Under Review&rdquo; status.</p>
                  <div className="flex gap-2">
                    <button type="submit" disabled={editStorySaving} className="btn-gold py-1.5 px-4 text-xs disabled:opacity-60">
                      {editStorySaving ? "Saving…" : "Save & Resubmit"}
                    </button>
                    <button type="button" onClick={cancelEditStory} className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{storyItem.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(storyItem.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={storyItem.status} />
                  </div>
                  {storyItem.rejection_reason && (
                    <p className="mt-2 text-xs leading-relaxed text-red-300">Reason: {storyItem.rejection_reason}</p>
                  )}
                  {(storyItem.status === "pending" || storyItem.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => startEditStory(storyItem)}
                      className="mt-3 rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-400"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
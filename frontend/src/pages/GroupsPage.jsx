import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import AnnouncementBanner from "../components/AnnouncementBanner";

const groupIcons = {
  youths: "⚡",
  women: "🌸",
  worshippers: "🎵",
  preachers: "📣",
  instrumentalists: "🎸",
  "church-workers": "⛪",
  intercessors: "🙏",
  discipleship: "🎓",
};

function getGroupIcon(slug) {
  return groupIcons[slug] || "👥";
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

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [toast, setToast] = useState(null);
  const { isAuthenticated } = useAuth();

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get("/groups/")
      .then((r) => {
        setGroups(r.data.results || r.data || []);
        setNextUrl(r.data.next || null);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.get(nextUrl);
      setGroups((prev) => [...prev, ...(r.data.results || [])]);
      setNextUrl(r.data.next || null);
    } catch { /* noop */ }
    finally { setLoadingMore(false); }
  };

  const handleJoin = async (id) => {
    if (!isAuthenticated) return;
    // Optimistically update UI
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, is_member: true, member_count: (g.member_count || 0) + 1 }
          : g
      )
    );
    try {
      await api.post(`/groups/${id}/join/`);
      showToast("You joined the group!");
    } catch {
      // Roll back optimistic update
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, is_member: false, member_count: Math.max(0, (g.member_count || 1) - 1) }
            : g
        )
      );
      showToast("Failed to join group. Please try again.", true);
    }
  };

  const handleLeave = async (id) => {
    if (!isAuthenticated) return;
    // Optimistically update UI
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, is_member: false, member_count: Math.max(0, (g.member_count || 1) - 1) }
          : g
      )
    );
    try {
      await api.post(`/groups/${id}/leave/`);
      showToast("You left the group.");
    } catch {
      // Roll back optimistic update
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, is_member: true, member_count: (g.member_count || 0) + 1 }
            : g
        )
      );
      showToast("Failed to leave group. Please try again.", true);
    }
  };

  return (
    <div className="page-bg min-h-screen">
      {toast && <Toast {...toast} />}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <AnnouncementBanner />
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Community</p>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Ministry Groups</h1>
          <p className="mt-2 text-zinc-500">Find your tribe. Join a group built for your role in the Kingdom.</p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-zinc-900" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold text-zinc-400">Groups coming soon</p>
            <p className="mt-1 text-sm text-zinc-600">Run python manage.py seed_groups to populate default groups.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.id} className="card-hover flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-2xl ring-1 ring-zinc-800">
                    {getGroupIcon(group.slug)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{group.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={group.privacy === "public" ? "badge-green" : "badge-zinc"}>
                        {group.privacy}
                      </span>
                    </div>
                  </div>
                </div>

                {group.description && (
                  <p className="text-sm text-zinc-500 line-clamp-2">{group.description}</p>
                )}

                <div className="mt-auto space-y-3 border-t border-zinc-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">
                      {group.member_count ?? 0} member{group.member_count !== 1 ? "s" : ""}
                    </span>
                    {isAuthenticated && (
                      group.is_member ? (
                        <button
                          onClick={() => handleLeave(group.id)}
                          className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-amber-400 transition hover:border-red-500/50 hover:text-red-400"
                        >
                          ✓ Joined
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(group.id)}
                          className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-400"
                        >
                          Join
                        </button>
                      )
                    )}
                  </div>
                  <Link
                    to="/messages"
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-zinc-800 hover:border-amber-500/40 transition"
                  >
                    <span>💬</span> Open Group Chat
                  </Link>
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

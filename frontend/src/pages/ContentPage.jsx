import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../api/client";

/* -- Constants ----------------------------------------------------------- */
const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "book", label: "Books" },
  { value: "mp3_sermon", label: "Sermons" },
  { value: "video", label: "Videos" },
  { value: "journal", label: "Journals" },
  { value: "wisdom", label: "Wisdom" },
  { value: "daily_scripture", label: "Scripture" },
  { value: "image", label: "Images" },
];

const TYPE_META = {
  book:            { icon: "📖", color: "from-blue-600/30 to-blue-900/20",    badge: "bg-blue-900/40 text-blue-300 border-blue-800" },
  mp3_sermon:      { icon: "🎙️", color: "from-purple-600/30 to-purple-900/20", badge: "bg-purple-900/40 text-purple-300 border-purple-800" },
  video:           { icon: "🎬", color: "from-red-600/30 to-red-900/20",      badge: "bg-red-900/40 text-red-300 border-red-800" },
  journal:         { icon: "📓", color: "from-green-600/30 to-green-900/20",   badge: "bg-green-900/40 text-green-300 border-green-800" },
  wisdom:          { icon: "✨", color: "from-amber-600/30 to-amber-900/20",   badge: "bg-amber-900/40 text-amber-300 border-amber-800" },
  daily_scripture: { icon: "📜", color: "from-teal-600/30 to-teal-900/20",    badge: "bg-teal-900/40 text-teal-300 border-teal-800" },
  image:           { icon: "🖼️", color: "from-pink-600/30 to-pink-900/20",    badge: "bg-pink-900/40 text-pink-300 border-pink-800" },
};

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* -- Per-type media renderers -------------------------------------------- */
function AudioCard({ item }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  if (!item.media_url) return null;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-zinc-900/80 px-4 py-3 border border-zinc-800">
      <button onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black hover:bg-amber-400 transition-colors">
        {playing
          ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
          : <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-400 truncate">{item.title}</p>
        <audio ref={audioRef} src={item.media_url} onEnded={() => setPlaying(false)} className="hidden" preload="none" />
      </div>
      <a href={item.media_url} download target="_blank" rel="noopener noreferrer"
        className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors" title="Download">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  );
}

function VideoCard({ item }) {
  const [open, setOpen] = useState(false);
  const youtubeId = (() => {
    const src = item.media_url || item.description || "";
    const m = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  })();

  if (youtubeId) {
    return (
      <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
        <iframe src={`https://www.youtube.com/embed/${youtubeId}`} title={item.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className="h-full w-full border-0" />
      </div>
    );
  }

  if (item.media_url) {
    return (
      <div className="mt-3">
        {open
          ? <video controls src={item.media_url} className="w-full rounded-xl bg-black max-h-52" autoPlay />
          : (
            <button onClick={() => setOpen(true)}
              className="relative w-full rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden aspect-video flex items-center justify-center group hover:border-zinc-700 transition-all">
              {item.photo_url && (
                <img src={item.photo_url} alt={item.title} className="absolute inset-0 h-full w-full object-cover opacity-60" />
              )}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 group-hover:bg-amber-400 transition-colors shadow-lg">
                <svg className="w-5 h-5 ml-0.5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </button>
          )
        }
      </div>
    );
  }
  return null;
}

function ImageCard({ item }) {
  const [enlarged, setEnlarged] = useState(false);
  const src = item.photo_url || item.media_url;
  if (!src) return null;
  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl cursor-pointer" onClick={() => setEnlarged(true)}>
        <img src={src} alt={item.title}
          className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      {enlarged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setEnlarged(false)}>
          <img src={src} alt={item.title}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </>
  );
}

/* -- Content card -------------------------------------------------------- */
function ContentCard({ item }) {
  const meta = TYPE_META[item.type] || { icon: "📄", color: "from-zinc-700/30 to-zinc-900/20", badge: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  const label = item.type.replace(/_/g, " ");

  return (
    <div className={`flex flex-col rounded-2xl border border-zinc-800 bg-gradient-to-br ${meta.color}
                     p-5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/30 transition-all duration-200`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900/70 text-xl ring-1 ring-zinc-700">
          {meta.icon}
        </span>
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badge}`}>
          {label}
        </span>
      </div>

      {/* Featured photo (shown for book/sermon/journal/wisdom/scripture â€” not for image/video) */}
      {item.photo_url && !["image", "video"].includes(item.type) && (
        <div className="mb-3 overflow-hidden rounded-xl">
          <img src={item.photo_url} alt={item.title} className="w-full h-32 object-cover" />
        </div>
      )}

      {/* Title & description */}
      <h3 className="mb-1 font-bold text-white leading-snug line-clamp-2">{item.title}</h3>

      {/* Scripture / Wisdom quote */}
      {(item.type === "daily_scripture" || item.type === "wisdom") ? (
        <blockquote className="mt-2 border-l-2 border-amber-500/60 pl-3 italic text-sm text-zinc-300 line-clamp-4 flex-1">
          {item.description}
        </blockquote>
      ) : (
        <p className="text-xs text-zinc-500 line-clamp-3 flex-1">{item.description}</p>
      )}

      {/* Type-specific media */}
      {item.type === "mp3_sermon" && <AudioCard item={item} />}
      {item.type === "video"      && <VideoCard item={item} />}
      {item.type === "image"      && <ImageCard item={item} />}

      {/* Tags */}
      {item.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 5).map((t) => (
            <span key={t} className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-zinc-300 truncate">
            {item.author_name || item.author_email?.split("@")[0] || "SRA"}
          </p>
          <p className="text-[10px] text-zinc-600">
            {item.category ? `${item.category} · ` : ""}{fmtDate(item.created_at)}
          </p>
        </div>
        {(item.type === "book" || item.type === "journal") && item.media_url && (
          <a href={item.media_url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30
                       px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors">
            Open
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

/* -- Page ---------------------------------------------------------------- */
export default function ContentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [activeType, setActiveType] = useState(searchParams.get("type") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [counts, setCounts] = useState({});
  const debounceRef = useRef(null);

  // Sync state changes back to URL
  useEffect(() => {
    const p = {};
    if (activeType) p.type = activeType;
    if (search.trim()) p.search = search.trim();
    setSearchParams(p, { replace: true });
  }, [activeType, search, setSearchParams]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setNextUrl(null);
      const params = {};
      if (activeType) params.type = activeType;
      if (search.trim()) params.search = search.trim();
      api
        .get("/content/items/", { params })
        .then((r) => {
          const data = r.data.results || [];
          setItems(data);
          setNextUrl(r.data.next || null);
          if (!activeType) {
            const c = {};
            data.forEach((d) => { c[d.type] = (c[d.type] || 0) + 1; });
            setCounts(c);
          }
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, search ? 350 : 0);
  }, [activeType, search]);

  const handleLoadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.get(nextUrl);
      setItems((prev) => [...prev, ...(r.data.results || [])]);
      setNextUrl(r.data.next || null);
    } catch { /* noop */ }
    finally { setLoadingMore(false); }
  };

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-16">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Library</p>
          <h1 className="text-3xl font-black text-white sm:text-4xl md:text-5xl">Content Library</h1>
          <p className="mt-2 text-zinc-500">Books, sermons, videos, wisdom and daily scripture from the movement.</p>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-lg mx-auto relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, descriptions…" className="input-dark w-full pl-10" />
        </div>

        {/* Type filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {TYPE_FILTERS.map(({ value, label }) => {
            const count = value ? (counts[value] || 0) : items.length;
            return (
              <button key={value} onClick={() => setActiveType(value)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  activeType === value
                    ? "bg-amber-500 text-black shadow-md shadow-amber-900/30"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}>
                {label}
                {!activeType && count > 0 && (
                  <span className="ml-1.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
            <p className="text-4xl mb-3">🔭</p>
            <p className="font-semibold text-zinc-400">
              {search ? `No results for "${search}"` : "No content yet"}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {search ? "Try a different search term." : "Content will appear here once approved by moderators."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <ContentCard key={item.id} item={item} />)}
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

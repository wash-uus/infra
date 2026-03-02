import { useEffect, useState } from "react";
import { getGallery, getGalleryPage } from "../api/gallery";

const TABS = [
  { label: "All", value: null },
  { label: "Photos", value: "photo" },
  { label: "Videos", value: "video" },
];

// Simple YouTube / Vimeo / direct embed detector
function VideoEmbed({ item }) {
  const src = item.video_file_url || item.video_url;

  if (!src) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-zinc-800 text-zinc-400 text-sm">
        No video source
      </div>
    );
  }

  // YouTube
  const ytMatch = src.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (ytMatch) {
    return (
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        title={item.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Vimeo
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <iframe
        className="w-full h-full"
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        title={item.title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Uploaded file — HTML5 video
  return (
    <video
      className="w-full h-full object-contain bg-black"
      src={src}
      controls
      preload="metadata"
    />
  );
}

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { item, index }
  const [videoModal, setVideoModal] = useState(null); // item

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNextUrl(null);
    getGallery(activeTab)
      .then((res) => {
        setItems(res.data.results || []);
        setNextUrl(res.data.next || null);
      })
      .catch(() => setError("Failed to load gallery. Please try again."))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const handleLoadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const path = nextUrl.replace(/^https?:\/\/[^/]+/, "");
      const res = await getGalleryPage(path);
      setItems((prev) => [...prev, ...(res.data.results || [])]);
      setNextUrl(res.data.next || null);
    } catch { /* noop */ }
    finally { setLoadingMore(false); }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const photos = items.filter((i) => i.media_type === "photo");
    const handler = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        const next = (lightbox.index + 1) % photos.length;
        setLightbox({ item: photos[next], index: next });
      }
      if (e.key === "ArrowLeft") {
        const prev = (lightbox.index - 1 + photos.length) % photos.length;
        setLightbox({ item: photos[prev], index: prev });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, items]);

  const photos = items.filter((i) => i.media_type === "photo");

  return (
    <div className="min-h-screen page-bg text-white py-12 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          <span className="text-amber-400">Gallery</span>
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Photos and videos from Spirit Revival Africa — capturing moments of
          faith, community and worship.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-6xl mx-auto flex justify-center gap-3 mb-10">
        {TABS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setActiveTab(value)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeTab === value
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20 text-amber-400 text-lg animate-pulse">
          Loading gallery…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center text-red-400 py-16">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="text-center text-zinc-500 py-20 text-lg">
          No gallery items yet. Check back soon!
        </div>
      )}

      {/* Grid */}
      {!loading && !error && items.length > 0 && (
        <div className="max-w-6xl mx-auto columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {items.map((item, idx) => {
            const isPhoto = item.media_type === "photo";
            const photoIdx = isPhoto
              ? photos.findIndex((p) => p.id === item.id)
              : -1;
            const thumb = item.image_url || item.thumbnail_url;

            return (
              <div
                key={item.id}
                className="break-inside-avoid rounded-xl overflow-hidden relative group cursor-pointer
                           shadow-md hover:shadow-amber-500/20 hover:shadow-xl transition-all duration-300"
                onClick={() =>
                  isPhoto
                    ? setLightbox({ item, index: photoIdx })
                    : setVideoModal(item)
                }
              >
                {/* Thumbnail / Image */}
                {thumb ? (
                  <img
                    src={thumb}
                    alt={item.title}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-52 bg-zinc-800 flex items-center justify-center text-zinc-500 text-5xl">
                    {isPhoto ? "🖼" : "▶"}
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col
                                justify-end p-4">
                  <p className="text-white font-semibold text-sm leading-tight">{item.title}</p>
                  {item.caption && (
                    <p className="text-zinc-300 text-xs mt-1 line-clamp-2">{item.caption}</p>
                  )}
                </div>

                {/* Video play icon */}
                {!isPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-amber-500/80 flex items-center justify-center
                                    group-hover:scale-110 transition-transform duration-200 shadow-lg">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5
                                 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Type badge */}
                <span
                  className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full
                    ${isPhoto ? "bg-amber-500 text-black" : "bg-blue-600 text-white"}`}
                >
                  {isPhoto ? "Photo" : "Video"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {nextUrl && !loading && (
        <div className="max-w-6xl mx-auto mt-10 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-full border border-zinc-700 px-8 py-2.5 text-sm font-semibold text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load More"}
          </button>
        </div>
      )}

      {/* PHOTO LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white bg-zinc-800 hover:bg-amber-500 rounded-full
                       w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              className="absolute left-4 text-white bg-zinc-800 hover:bg-amber-500 rounded-full
                         w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const prev = (lightbox.index - 1 + photos.length) % photos.length;
                setLightbox({ item: photos[prev], index: prev });
              }}
            >
              ‹
            </button>
          )}

          {/* Image */}
          <img
            src={lightbox.item.image_url}
            alt={lightbox.item.title}
            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {photos.length > 1 && (
            <button
              className="absolute right-4 text-white bg-zinc-800 hover:bg-amber-500 rounded-full
                         w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const next = (lightbox.index + 1) % photos.length;
                setLightbox({ item: photos[next], index: next });
              }}
            >
              ›
            </button>
          )}

          {/* Caption */}
          {(lightbox.item.title || lightbox.item.caption) && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-xl px-5 py-2
                         text-center max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white font-semibold text-sm">{lightbox.item.title}</p>
              {lightbox.item.caption && (
                <p className="text-zinc-400 text-xs mt-0.5">{lightbox.item.caption}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIDEO MODAL */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-zinc-800 hover:bg-amber-500 rounded-full
                       w-10 h-10 flex items-center justify-center text-xl z-10 transition-colors"
            onClick={() => setVideoModal(null)}
          >
            ✕
          </button>

          <div
            className="w-full max-w-3xl rounded-xl overflow-hidden bg-black shadow-2xl"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <VideoEmbed item={videoModal} />
          </div>

          {(videoModal.title || videoModal.caption) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center max-w-xl">
              <p className="text-white font-semibold">{videoModal.title}</p>
              {videoModal.caption && (
                <p className="text-zinc-400 text-sm mt-1">{videoModal.caption}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

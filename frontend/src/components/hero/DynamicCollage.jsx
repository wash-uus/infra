/**
 * DynamicCollage
 * ──────────────
 * Fetches live approved hero photos from /api/hero-collage/ and renders them
 * as an animated full-viewport background collage.
 *
 * Desktop  : 3-column (md) / 4-column (lg) masonry-style grid.
 *            Each tile cycles through slow opacity + y-parallax + scale
 *            using Framer Motion keyframe loops.
 *
 * Mobile   : Single image, crossfade slideshow every 6.5 s.
 *
 * Performance:
 *   • saveData / low deviceMemory / low CPU cores → reduced/no animation.
 *   • prefers-reduced-motion → all motion disabled.
 *   • All <img> have loading="lazy" + decoding="async".
 *   • Images are served at ≤1920px (enforced by the backend compression util).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { getHeroCollage } from "../../api/heroCollage";

const DEFAULT_ALT = "Worship moment from the Spirit Revival Africa community";

// Gradient fallbacks when no images are available
const FALLBACK_GRADIENTS = [
  "from-zinc-900 via-zinc-800 to-black",
  "from-stone-900 via-neutral-900 to-black",
  "from-zinc-800 via-stone-900 to-zinc-950",
  "from-neutral-900 via-zinc-900 to-neutral-950",
  "from-zinc-950 via-zinc-800 to-stone-950",
  "from-stone-800 via-zinc-900 to-black",
  "from-neutral-800 via-stone-900 to-zinc-950",
  "from-zinc-900 via-neutral-800 to-stone-950",
];

// ── Static Unsplash worship photos (free licence, no API key needed) ──────────
// Direct images.unsplash.com CDN URLs — no registration, no rate limits.
// Each entry: { id, photoId, alt, photographer, photographerUrl }
const STATIC_WORSHIP_PHOTOS = [
  {
    id: "u-9Zh7l2A7Woo",
    photoId: "photo-1629143949694-606987575b07",
    alt: "People raising their hands in worship",
    photographer: "Terren Hurst",
    photographerUrl: "https://unsplash.com/@terrenhurst",
  },
  {
    id: "u-jebCcyX6hfs",
    photoId: "photo-1629143935265-73c99997212e",
    alt: "Church congregation hands raised in praise",
    photographer: "Terren Hurst",
    photographerUrl: "https://unsplash.com/@terrenhurst",
  },
  {
    id: "u-FkVaaDKKCUc",
    photoId: "photo-1610414302552-c002f989c663",
    alt: "People gathering in a praise concert",
    photographer: "Memento Media",
    photographerUrl: "https://unsplash.com/@heymemento",
  },
  {
    id: "u-52k2RN6D5Z0",
    photoId: "photo-1605748314687-f399a5a49c2d",
    alt: "Man raising his hands in church worship",
    photographer: "Jesus Loves Austin",
    photographerUrl: "https://unsplash.com/@jesuslovesaustin",
  },
  {
    id: "u-MtrIJYiyae4",
    photoId: "photo-1675099074138-92b303c1868c",
    alt: "Woman raising her hand in a church service",
    photographer: "Carley & Matt",
    photographerUrl: "https://unsplash.com/@carleyandmatt",
  },
];

function buildUnsplashSourceTiles() {
  return STATIC_WORSHIP_PHOTOS.map((photo, idx) => ({
    id: photo.id,
    src: `https://images.unsplash.com/${photo.photoId}?w=1920&auto=format&fit=crop&q=80`,
    thumb: `https://images.unsplash.com/${photo.photoId}?w=400&auto=format&fit=crop&q=70`,
    alt: photo.alt,
    source: "unsplash",
    photographer: photo.photographer,
    photographerUrl: photo.photographerUrl,
    rotation: ((idx % 5) - 2) * 0.7,
    gradient: null,
  }));
}

// ── Low-performance detector ─────────────────────────────────────────────────

function useLowPerformanceMode() {
  const [lowPerf, setLowPerf] = useState(false);

  useEffect(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    const saveData = !!connection?.saveData;
    const deviceMemory = navigator.deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (saveData || deviceMemory <= 4 || cores <= 4) {
      setLowPerf(true);
    }
  }, []);

  return lowPerf;
}

// ── Data normalization ────────────────────────────────────────────────────────

function normaliseTiles(data) {
  const rows = data?.results ?? data ?? [];
  return rows
    .filter((item) => !!item.image_url)
    .map((item, idx) => ({
      id: item.id ?? `tile-${idx}`,
      src: item.image_url,
      thumb: item.thumb_url || item.image_url,
      alt: item.alt_text?.trim() || item.caption?.trim() || DEFAULT_ALT,
      source: item.source || "user",
      photographer: item.photographer || "",
      photographerUrl: item.photographer_url || "",
      rotation: ((idx % 5) - 2) * 0.7,
    }));
}

function buildFallbackTiles() {
  return FALLBACK_GRADIENTS.map((gradient, idx) => ({
    id: `fallback-${idx}`,
    src: "",
    thumb: "",
    alt: DEFAULT_ALT,
    source: "fallback",
    photographer: "",
    photographerUrl: "",
    rotation: ((idx % 5) - 2) * 0.7,
    gradient,
  }));
}

// ── Lazy-loaded image ─────────────────────────────────────────────────────────

function LazyImage({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`${className} transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DynamicCollage() {
  const reduceMotion = useReducedMotion();
  const lowPerf = useLowPerformanceMode();
  const disableHeavy = !!reduceMotion || lowPerf;

  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileIndex, setMobileIndex] = useState(0);

  // ── Fetch approved hero photos ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    getHeroCollage({ limit: 24 })
      .then((res) => {
        if (!mounted) return;
        const normalised = normaliseTiles(res.data);
        // If DB has approved photos use them; otherwise fall back to
        // source.unsplash.com keyword URLs (no API key / registration needed).
        setTiles(normalised.length > 0 ? normalised : buildUnsplashSourceTiles());
      })
      .catch(() => {
        if (mounted) setTiles(buildUnsplashSourceTiles());
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  // ── Mobile slideshow interval ────────────────────────────────────────────
  useEffect(() => {
    if (disableHeavy || tiles.length <= 1) return undefined;
    const t = setInterval(
      () => setMobileIndex((prev) => (prev + 1) % tiles.length),
      6500
    );
    return () => clearInterval(t);
  }, [tiles.length, disableHeavy]);

  // Trim to 12 for desktop grid (performance)
  const desktopTiles = useMemo(() => tiles.slice(0, 12), [tiles]);

  if (loading) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" aria-hidden="true" />
    );
  }

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* ── Desktop Grid ─────────────────────────────────────────────────── */}
      <div className="hidden h-full w-full grid-cols-3 gap-2 p-2 md:grid lg:grid-cols-4">
        {desktopTiles.map((tile, idx) => {
          // Stagger: different speeds and delays for organic feel
          const duration = 20 + (idx % 4) * 5;   // 20-35s cycle
          const delay = idx * 0.15;

          const animateProps = disableHeavy
            ? { opacity: 0.88 }
            : {
                opacity: [0.82, 0.96, 0.84],
                y: [0, -12, 0],
                scale: [1, 1.022, 1],
              };

          return (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={animateProps}
              transition={
                disableHeavy
                  ? { duration: 0.6, ease: "easeOut", delay }
                  : {
                      duration,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay,
                    }
              }
              className="relative overflow-hidden rounded-xl bg-zinc-900"
              style={{ rotate: `${tile.rotation}deg` }}
            >
              {tile.src ? (
                <LazyImage
                  src={tile.src}
                  alt={tile.alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className={`h-full w-full bg-gradient-to-br ${tile.gradient ?? "from-zinc-900 to-black"}`}
                />
              )}

              {/* Attribution overlay (Pexels / Unsplash requirement) */}
              {tile.photographer && (
                <a
                  href={tile.photographerUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-zinc-400 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
                  tabIndex={-1}
                >
                  © {tile.photographer}
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Mobile Slideshow ──────────────────────────────────────────────── */}
      <div className="relative block h-full w-full md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tiles[mobileIndex]?.id ?? "slide-0"}
            initial={disableHeavy ? {} : { opacity: 0 }}
            animate={disableHeavy ? { opacity: 0.92 } : { opacity: 0.92 }}
            exit={disableHeavy ? {} : { opacity: 0 }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {tiles[mobileIndex]?.src ? (
              <img
                src={tiles[mobileIndex].thumb || tiles[mobileIndex].src}
                alt={tiles[mobileIndex].alt}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`h-full w-full bg-gradient-to-br ${
                  tiles[mobileIndex]?.gradient ?? "from-zinc-900 to-black"
                }`}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

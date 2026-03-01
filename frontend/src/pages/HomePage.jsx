import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import HeroSection from "../components/hero/HeroSection";
import { getHomeFeed } from "../api/homeContent";
import AnnouncementBanner from "../components/AnnouncementBanner";

const features = [
  { icon: "📖", title: "Content Library", description: "Books, sermons, MP3s, videos, journals and daily scripture from revivalists across the continent.", link: "/content" },
  { icon: "🔥", title: "Revival Hubs", description: "Physical and digital revival centres forming across Africa. Find or start a hub in your city.", link: "/hubs" },
  { icon: "🙏", title: "Prayer Network", description: "Submit requests, stand in agreement, and track answered prayers across the movement.", link: "/prayer" },
  { icon: "👥", title: "Community Groups", description: "Youths, women, worshippers, preachers, intercessors — your tribe is here.", link: "/groups" },
  { icon: "🎓", title: "Discipleship", description: "Structured courses and lessons with video, PDF materials and progress tracking.", link: "/discipleship" },
  { icon: "💬", title: "Live Messaging", description: "Real-time direct and group messaging powered by WebSockets across the network.", link: "/messages" },
];

const stats = [
  { value: "54", label: "African Nations Targeted" },
  { value: "7", label: "Ministry Groups" },
  { value: "∞", label: "Lives For Christ" },
  { value: "1", label: "Spirit — Holy" },
];

export default function HomePage() {
  const [dailyBread, setDailyBread] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [verseExpanded, setVerseExpanded] = useState(false);
  const VERSE_LIMIT = 280;

  useEffect(() => {
    let mounted = true;
    getHomeFeed({ stories_limit: 3 })
      .then(({ data }) => {
        if (!mounted) return;
        setDailyBread(data?.daily_bread ?? null);
        setStories(data?.stories ?? []);
        setVerseExpanded(false);
      })
      .catch(() => {
        if (!mounted) return;
        setDailyBread(null);
        setStories([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveStory(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const visibleStories = stories.length
    ? stories
    : [
      {
        id: "fallback-story",
        title: "Faith in Action",
        story:
          "A small prayer circle in one city became a weekly outreach movement in three neighborhoods. Keep showing up in prayer and obedience.",
        author_name: "SRA Team",
      },
    ];

  const storyExcerpt = (text, max = 180) => {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };

  return (
    <div className="hero-gradient">
      <HeroSection />

      {/* ANNOUNCEMENTS */}
      <section className="mx-auto max-w-5xl px-6 pt-8">
        <AnnouncementBanner />
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-800/30 md:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-zinc-950 px-6 py-8 text-center">
              <p className="mb-1 bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-4xl font-black text-transparent">{value}</p>
              <p className="text-sm text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-14 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Platform</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Everything the Movement Needs</h2>
          <p className="mt-3 text-zinc-500">One platform. Every tool for continental revival.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon, title, description, link }) => (
            <Link key={title} to={link} className="group card-hover flex flex-col gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-2xl ring-1 ring-zinc-800 transition-all duration-200 group-hover:ring-amber-500/30">{icon}</span>
              <div>
                <h3 className="mb-1 font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
              </div>
              <span className="mt-auto text-xs font-semibold text-amber-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100">Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DAILY BREAD */}
      <section className="relative mx-4 mb-24 min-h-[340px] overflow-hidden rounded-3xl border border-amber-500/20 sm:mx-6 sm:min-h-[380px] lg:mx-12 lg:min-h-[420px]">
        {/* Background photo with gradient overlay */}
        {dailyBread?.photo_url ? (
          <>
            <img
              src={dailyBread.photo_url}
              alt="Daily Bread"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* dark + gold gradient overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-950/40 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950" />
        )}

        {/* Content */}
        <div className="relative z-10 flex min-h-[340px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[380px] sm:px-12 sm:py-20 lg:min-h-[420px]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400">✦ Daily Bread ✦</p>

          {/* Verse */}
          {(() => {
            const text = dailyBread?.verse_text ||
              "But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.";
            const isLong = text.length > VERSE_LIMIT;
            const displayed = isLong && !verseExpanded ? text.slice(0, VERSE_LIMIT).trimEnd() + "…" : text;
            return (
              <>
                <blockquote className="mx-auto max-w-3xl text-xl font-bold italic leading-relaxed text-white drop-shadow-lg sm:text-2xl lg:text-3xl">
                  &ldquo;{displayed}&rdquo;
                </blockquote>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setVerseExpanded(v => !v)}
                    className="mt-3 text-xs font-semibold uppercase tracking-widest text-amber-400 underline-offset-2 hover:text-amber-300 transition"
                  >
                    {verseExpanded ? "Show less ▲" : "Show more ▼"}
                  </button>
                )}
              </>
            );
          })()}

          <cite className="mt-6 block text-sm font-semibold not-italic text-amber-300 drop-shadow">
            — {dailyBread?.verse_reference ?? "Acts 1:8"}
            {dailyBread?.bible_version ? (
              <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-400">
                {dailyBread.bible_version}
              </span>
            ) : null}
          </cite>

          {dailyBread?.reflection ? (
            <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-500/10 bg-black/30 px-6 py-4 text-sm leading-relaxed text-zinc-300">
              {dailyBread.reflection}
            </p>
          ) : null}
        </div>
      </section>

      {/* SHORT STORIES */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Daily Bread</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Short Stories</h2>
          <p className="mt-3 text-zinc-500">Fresh encouragement shared by the admin team.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStories.map((story) => (
            <article
              key={story.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-amber-900/20 hover:shadow-xl"
            >
              {/* Photo */}
              {story.photo_url ? (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={story.photo_url}
                    alt={story.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* subtle bottom fade into card */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent" />
                </div>
              ) : (
                /* No photo: coloured accent bar */
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300" />
              )}

              {/* Body */}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className="text-lg font-extrabold leading-snug text-white">{story.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-zinc-400">{storyExcerpt(story.story)}</p>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
                    {story.author_name || "Spirit Revival Africa"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveStory(story)}
                    className="rounded-full border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-400 transition hover:border-amber-400 hover:bg-amber-950/40 hover:text-amber-300"
                  >
                    Read more →
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeStory ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4"
          onClick={() => setActiveStory(null)}
          role="presentation"
        >
          <article
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-500/20 bg-zinc-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal photo */}
            {activeStory?.photo_url && (
              <div className="relative h-64 w-full overflow-hidden rounded-t-2xl sm:h-72">
                <img
                  src={activeStory.photo_url}
                  alt={activeStory.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
                {/* Title overlaid on image */}
                <div className="absolute bottom-0 left-0 p-6">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-400">Short Story</p>
                  <h3 className="text-2xl font-black text-white drop-shadow-lg">{activeStory.title}</h3>
                </div>
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setActiveStory(null)}
                  className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
                  aria-label="Close story"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="p-6">
              {/* Header when no photo */}
              {!activeStory?.photo_url && (
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">Short Story</p>
                    <h3 className="text-2xl font-black text-white">{activeStory.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStory(null)}
                    className="rounded-lg border border-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-300 transition hover:border-amber-500 hover:text-white"
                    aria-label="Close story"
                  >
                    Close
                  </button>
                </div>
              )}

              <p className="whitespace-pre-line text-base leading-relaxed text-zinc-300">
                {activeStory.story}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  {activeStory.author_name || "Spirit Revival Africa"}
                </p>
                {typeof activeStory.id === "number" ? (
                  <Link
                    to={`/stories/${activeStory.id}`}
                    onClick={() => setActiveStory(null)}
                    className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-amber-300 transition hover:border-amber-400 hover:text-amber-200"
                  >
                    Open full page
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-32 text-center">
        <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
          Ready to be Part of the{" "}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Revival?</span>
        </h2>
        <p className="mb-8 text-zinc-500">Create your free account and connect with thousands of believers across Africa.</p>
        <Link to="/register" className="btn-gold text-base px-10 py-4">Create Free Account</Link>
      </section>
    </div>
  );
}

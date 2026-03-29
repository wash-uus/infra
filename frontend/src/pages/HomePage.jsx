import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import HeroSection from "../components/hero/HeroSection";
import { getHomeFeed } from "../api/homeContent";
import AnnouncementBanner from "../components/AnnouncementBanner";

const features = [
  { icon: "�", title: "Prayer Network", description: "Lift your voice with intercessors across Africa. Submit requests, agree in faith, and witness answered prayer.", link: "/prayer" },
  { icon: "📖", title: "Content Library", description: "Sermons, teachings, and daily scripture curated by revivalists across the continent.", link: "/content" },
  { icon: "👥", title: "Community Groups", description: "Youths, women, worshippers, preachers, intercessors — your tribe is already here. Join the circle.", link: "/groups" },
  { icon: "🎓", title: "Discipleship Courses", description: "Grow deeper in your walk with structured courses and lessons designed for every believer.", link: "/discipleship" },
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

  const visibleStories = stories.length ? stories : [];

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

      {/* VERSE ANCHOR */}
      <section className="mx-auto max-w-3xl px-6 py-10 text-center">
        <blockquote className="text-lg font-semibold italic leading-relaxed text-zinc-400 sm:text-xl">
          &ldquo;But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.&rdquo;
        </blockquote>
        <cite className="mt-3 block text-xs font-semibold not-italic uppercase tracking-widest text-amber-500">— Acts 1:8 KJV</cite>
      </section>

      {/* FOUNDER */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          {/* amber glow */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-8 p-8 sm:flex-row sm:p-12">
            {/* Photo */}
            <div className="flex-shrink-0">
              <div className="h-36 w-36 overflow-hidden rounded-full border-2 border-amber-500/40 shadow-xl shadow-amber-900/30 sm:h-44 sm:w-44">
                <img src="/washika.jpg" alt="W. Washika" className="h-full w-full object-cover object-top" />
              </div>
            </div>
            {/* Text */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">Founder & Author</p>
              <h2 className="mb-3 text-2xl font-black text-white sm:text-3xl">W. Washika</h2>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
                A dynamic tele-evangelist from Kakamega County, Kenya, W. Washika founded Spirit Revival Africa at 25 with a burning vision
                to ignite revival across the continent. Inspired by the likes of Reinhard Bonnke, he balances his calling as a preacher
                with his career as a land surveyor in Nairobi — a living testimony that faith and life walk hand in hand.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                His first published book, <em className="text-amber-300 font-semibold">Beneath the Crown</em>, is now available — a 12-chapter
                journey from the cross into the throne room of God.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/book/beneath-the-crown"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
                >
                  📖 Get the Book — KSH 600
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-14 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">The Platform</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Built for the Movement.<br className="hidden sm:block" /> Designed for Revival.</h2>
          <p className="mt-3 max-w-xl mx-auto text-zinc-400">Everything your ministry, community and spiritual walk needs — worship, prayer, discipleship and connection, all in one place.</p>
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Stories of Faith</p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Hear What God Is Doing</h2>
          <p className="mt-3 text-zinc-400">Moments of grace, breakthrough and revival from hearts across the movement.</p>
        </div>

        {visibleStories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
            <p className="mb-2 text-3xl">✍️</p>
            <p className="font-bold text-white">Stories are coming.</p>
            <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">Be the first to share what God has been doing in your life.</p>
            <Link to="/stories/submit" className="mt-5 inline-block btn-gold py-2 px-5 text-sm">Share Your Story</Link>
          </div>
        ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStories.map((story) => (
            <article
              key={story.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-amber-900/20 hover:shadow-xl"
            >
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
        )}
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
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-400"
                  >
                    View Full Story →
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {/* SUPPORT THE MOVEMENT — PayPal */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 p-8 sm:p-12 text-center shadow-xl shadow-amber-900/10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="relative">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">Partner With Us</p>
            <h2 className="mb-3 text-3xl font-black text-white sm:text-4xl">Support the Movement</h2>
            <p className="mx-auto mb-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Every contribution fuels revival across Africa — helping us reach more souls, equip more leaders,
              and spread the fire of the Holy Spirit to every nation.
            </p>
            <p className="mx-auto mb-8 max-w-lg text-xs text-zinc-500 italic">
              "Give, and it will be given to you." — Luke 6:38
            </p>
            <a
              href="https://www.paypal.com/paypalme/wwashika9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-2xl bg-[#0070ba] hover:bg-[#003087] px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 hover:shadow-blue-900/40 hover:shadow-xl"
            >
              <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.477z"/>
              </svg>
              Donate via PayPal
            </a>
            <p className="mt-4 text-xs text-zinc-600">
              Secure payment via PayPal · <span className="text-zinc-500">wwashika9@gmail.com</span>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-32 text-center">
        <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
          Your Revival Journey{" "}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Starts Here.</span>
        </h2>
        <p className="mb-8 text-zinc-400">Join thousands of believers, intercessors and leaders across Africa building the Kingdom together.</p>
        <Link to="/register" className="btn-gold text-base px-10 py-4">Join the Movement — It's Free</Link>
      </section>
    </div>
  );
}

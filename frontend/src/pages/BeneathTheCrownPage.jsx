import { useState } from "react";

import { bookMeta, aboutAuthor, parts, introduction } from "../data/beneathTheCrown";
import { usePageMeta } from "../hooks/usePageMeta";

/* ── Helpers ── */
function openWhatsApp() {
  const phone = bookMeta.authorPhone.replace(/\s+/g, "");
  const msg = encodeURIComponent(
    `Hello! I'd like to order a copy of "${bookMeta.title}" by ${bookMeta.author} at KSH 1,200 (~$9.30 USD). Please guide me on how to get it.`
  );
  window.open(`https://wa.me/${phone.replace("+", "")}?text=${msg}`, "_blank");
}

function callOwner() {
  window.open(`tel:${bookMeta.authorPhone}`, "_self");
}

function emailOwner() {
  const subject = encodeURIComponent(`Order: ${bookMeta.title} — KSH 1,200 (~$9.30 USD)`);
  const body = encodeURIComponent(
    `Hello,\n\nI would like to order a copy of "${bookMeta.title}" by ${bookMeta.author}.\n\nPlease let me know how to proceed.\n\nThank you.`
  );
  window.open(`mailto:${bookMeta.authorEmail}?subject=${subject}&body=${body}`, "_blank");
}

/* ── Sub-components ── */
function OrderButton({ onClick, icon, label, sub, color }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:scale-105 active:scale-95 ${color}`}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-bold text-white leading-tight">{label}</p>
        <p className="text-xs text-white/70">{sub}</p>
      </div>
    </button>
  );
}

function ChapterCard({ chapter }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-amber-500">
        Chapter {chapter.number}
      </p>
      <p className="font-bold text-white text-sm leading-snug">{chapter.title}</p>
      {chapter.subtitle && (
        <p className="mt-1 text-xs italic text-zinc-400">{chapter.subtitle}</p>
      )}
      <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
        {chapter.paragraphs[0].slice(0, 120)}…
      </p>
    </div>
  );
}


export default function BeneathTheCrownPage() {
  usePageMeta({
    title: "Beneath the Crown — By W. Washika",
    description:
      "A 12-chapter journey from the cross into the throne room of God. Beneath the Crown by W. Washika — now available. KSH 1,200.",
  });
  const [showMore, setShowMore] = useState(false);

  const chapterOneTeaser = parts[0].chapters[0].paragraphs[0];
  const shortAbout = aboutAuthor.split("\n\n").slice(0, 2).join("\n\n");



  return (
    <div className="page-bg min-h-screen text-zinc-300">

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-black py-16 px-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-950/20 via-transparent to-zinc-950/60" />

        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">

            {/* ── Book Cover Mockup ── */}
            <div className="shrink-0" style={{ filter: "drop-shadow(0 30px 60px rgba(20,184,166,0.2))" }}>
              <div
                className="relative w-56 sm:w-64 bg-black overflow-hidden rounded-sm"
                style={{
                  height: "336px",
                  boxShadow: "8px 8px 40px rgba(0,0,0,0.9), -2px 0 12px rgba(20,184,166,0.12)",
                }}
              >
                {/* Top-left teal geometric corner */}
                <div className="absolute -top-2 -left-2 w-36 h-36 overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #0d9488 0px, #0d9488 3px, transparent 3px, transparent 14px)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/40 to-black" />
                </div>

                {/* Bottom-right teal geometric corner */}
                <div className="absolute -bottom-2 -right-2 w-36 h-36 overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #0d9488 0px, #0d9488 3px, transparent 3px, transparent 14px)",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-black/40 to-black" />
                </div>

                {/* Title block */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-[58%] px-5 text-center">
                  <p
                    className="text-4xl sm:text-5xl font-black text-amber-50 uppercase leading-none tracking-tight"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 2px 24px rgba(245,158,11,0.25)" }}
                  >
                    BENEATH
                  </p>
                  <p
                    className="text-4xl sm:text-5xl font-black text-amber-50 uppercase leading-none tracking-tight my-1"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    THE
                  </p>
                  <p
                    className="text-4xl sm:text-5xl font-black text-amber-50 uppercase leading-none tracking-tight"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", textShadow: "0 2px 24px rgba(245,158,11,0.25)" }}
                  >
                    CR<span role="img" aria-hidden className="text-3xl sm:text-4xl align-middle mx-px">👑</span>WN
                  </p>
                  <p className="mt-5 text-[9px] sm:text-[10px] font-bold text-amber-100/80 uppercase tracking-[0.15em] leading-snug">
                    &ldquo;A JOURNEY INTO<br />DIVINE WORSHIP&rdquo;
                  </p>
                </div>

                {/* Author */}
                <div className="absolute bottom-5 left-0 right-0 text-center">
                  <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-amber-100/70 uppercase">
                    BY WASHIKA W.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Info Panel ── */}
            <div className="flex-1 text-center lg:text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-400">New Release · {bookMeta.year}</p>
              <h1
                className="mb-2 text-4xl font-black text-amber-100 sm:text-5xl uppercase tracking-tight leading-none"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {bookMeta.title}
              </h1>
              <p className="mb-6 text-sm font-semibold tracking-widest text-amber-400 uppercase">
                &ldquo;{bookMeta.subtitle}&rdquo;
              </p>
              <p className="mb-1 text-sm text-zinc-400">
                by <span className="font-bold text-white">{bookMeta.author}</span>
              </p>
              <p className="mb-8 text-xs text-zinc-500 uppercase tracking-wider">
                {bookMeta.publisher} · {bookMeta.year}
              </p>

              {/* Price Badge */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-3 mb-6">
                <div className="flex flex-col items-start">
                  <span className="text-3xl font-black text-amber-400 leading-tight">KSH 1,200</span>
                  <span className="text-sm font-semibold text-amber-300/70">≈ $9.30 USD</span>
                </div>
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black uppercase tracking-wider">
                  Only
                </span>
              </div>

              <p className="mx-auto lg:mx-0 mb-8 max-w-xl text-base leading-relaxed text-zinc-300">
                A life-changing journey into the heart of true worship — from the cross to the throne
                room of God. This is not just a book. It is an encounter.
              </p>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <button
                  onClick={openWhatsApp}
                  className="flex items-center gap-2 rounded-2xl bg-green-500 hover:bg-green-400 px-8 py-4 font-bold text-white shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95 text-lg"
                >
                  <span className="text-2xl">💬</span> Order on WhatsApp
                </button>
                <button
                  onClick={callOwner}
                  className="flex items-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 px-8 py-4 font-bold text-amber-300 transition-all hover:scale-105 active:scale-95 text-lg"
                >
                  <span className="text-2xl">📞</span> Call Owner
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 space-y-20 pb-20">

        {/* ══ HOOK QUOTE ══════════════════════════════════════════════ */}
        <section>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-8 py-10 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
            <p className="relative text-3xl text-amber-400 font-serif mb-4 leading-none">"</p>
            <p className="relative text-base sm:text-lg leading-relaxed text-zinc-200 font-medium italic max-w-2xl mx-auto">
              Step closer. You have been summoned. This is not a call made with the fleeting words
              of men, but an eternal, divine summons written not in ink, but in the blood of the
              Lamb — precious, holy, and irrevocable.
            </p>
            <p className="relative mt-4 text-xs text-amber-500 uppercase tracking-widest font-semibold">
              — From the Introduction
            </p>
          </div>
        </section>

        {/* ══ WHY THIS BOOK ══════════════════════════════════════════ */}
        <section>
          <div className="text-center mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">
              Why Every Worshipper Needs This Book
            </p>
            <h2 className="text-3xl font-black text-white sm:text-4xl">More Than a Book</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: "✝️",
                title: "The Cross Explained",
                desc: "Understand the full weight and glory of what Jesus accomplished — and how it opens the throne room to YOU.",
              },
              {
                icon: "🏛️",
                title: "Enter the Throne Room",
                desc: "You are not a stranger to God's presence. This book shows you how to live there — daily, boldly, freely.",
              },
              {
                icon: "🎵",
                title: "Worship Redefined",
                desc: "Worship is not a Sunday activity — it is the atmosphere of your entire life. Transform how you show up for God.",
              },
              {
                icon: "🔥",
                title: "Spiritual Transformation",
                desc: "Real encounters with God produce real change. Journey through 12 chapters of soul-deep renewal.",
              },
              {
                icon: "🌿",
                title: "For the Weary",
                desc: "If faith has felt heavy or dry, this book is your invitation to a fresh encounter. The King is calling.",
              },
              {
                icon: "♾️",
                title: "Eternal Perspective",
                desc: "From earthly struggle to eternal anthem — discover worship that endures beyond circumstance.",
              },
            ].map((item) => (
              <div key={item.title} className="card-hover rounded-2xl p-6">
                <p className="mb-3 text-3xl">{item.icon}</p>
                <p className="mb-2 font-bold text-white">{item.title}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ PREVIEW EXCERPT ════════════════════════════════════════ */}
        <section>
          <div className="text-center mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">
              A Taste of Chapter 1
            </p>
            <h2 className="text-3xl font-black text-white">Feel the Power Inside</h2>
          </div>

          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
            <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Chapter 1 — The Price of Access
              </span>
            </div>
            <div className="px-6 py-8 relative">
              <p className="text-base leading-relaxed text-zinc-300">
                {chapterOneTeaser.slice(0, 400)}…
              </p>
              {showMore && (
                <p className="mt-4 text-base leading-relaxed text-zinc-300">
                  {parts[0].chapters[0].paragraphs[1].slice(0, 350)}…
                </p>
              )}
              <button
                onClick={() => setShowMore((v) => !v)}
                className="mt-4 text-sm font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
              >
                {showMore ? "Show less" : "Read a little more…"}
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
            </div>
            <div className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 text-center">
              <p className="text-sm text-zinc-400">
                Want to read the rest?{" "}
                <button
                  onClick={openWhatsApp}
                  className="font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors"
                >
                  Get your copy for KSH 1,200 (~$9.30) →
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* ══ WHAT'S INSIDE ══════════════════════════════════════════ */}
        <section>
          <div className="text-center mb-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">
              12 Chapters · 6 Parts
            </p>
            <h2 className="text-3xl font-black text-white sm:text-4xl">What's Inside</h2>
            <p className="mt-2 text-zinc-400 text-sm max-w-lg mx-auto">
              A complete journey — from the agony of the cross to the glory of your eternal anthem
              before God.
            </p>
          </div>

          <div className="space-y-6">
            {parts.map((part) => (
              <div key={part.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                <div className="border-b border-zinc-800 bg-zinc-950/80 px-5 py-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-black text-amber-400 border border-amber-500/30">
                    {part.number}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Part {part.number}</p>
                    <p className="font-bold text-white text-sm leading-tight">{part.title}</p>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {part.chapters.map((ch) => (
                    <ChapterCard key={ch.id} chapter={ch} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ ABOUT THE AUTHOR ═══════════════════════════════════════ */}
        <section>
          <div className="text-center mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-500">
              The Author
            </p>
            <h2 className="text-3xl font-black text-white">Meet W. Washika</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="flex-shrink-0 h-28 w-28 rounded-full overflow-hidden border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
                <img src="/washika.jpg" alt="W. Washika" className="h-full w-full object-cover object-top" />
              </div>
              <div>
                <h3 className="mb-3 text-xl font-black text-white">W. Washika</h3>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {shortAbout.split("\n\n")[0]}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {shortAbout.split("\n\n")[1]}
                </p>
                <p className="mt-4 text-sm text-amber-400 font-medium italic">
                  "Beneath the Crown is his first published work — a testimony poured into every
                  page."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ POEM TEASER ════════════════════════════════════════════ */}
        <section>
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-zinc-900 p-10 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-500">
              A Royal Invitation — From Chapter 3
            </p>
            <div className="mx-auto max-w-sm space-y-1">
              {[
                "Beneath the heavens, where stars unfold,",
                "A King extends His arms of gold.",
                "Not for the mighty, nor the grand,",
                "But for the humble, the weary, the outstretched hand.",
                "",
                "Come as you are, no need for disguise,",
                "Through endless love, He lifts your eyes.",
                "The throne room shines with radiant grace,",
                "A haven of rest, a sacred place.",
                "",
                "Step into wonder, let burdens fall,",
                "Answer the whisper, the sweetest call…",
              ].map((line, i) =>
                line === "" ? (
                  <div key={i} className="h-3" />
                ) : (
                  <p key={i} className="font-serif text-sm italic text-zinc-200 leading-relaxed">
                    {line}
                  </p>
                )
              )}
            </div>
            <p className="mt-6 text-xs text-zinc-500 italic">
              … and 11 more chapters of heaven-lit prose await you inside.
            </p>
          </div>
        </section>

        {/* ══ FINAL CTA ══════════════════════════════════════════════ */}
        <section>
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-black text-center px-6 py-14 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="relative">
              <p className="mb-2 text-6xl">👑</p>
              <h2 className="mb-3 text-3xl font-black text-white sm:text-4xl">
                Your Copy Is Waiting
              </h2>
              <p className="mb-2 text-zinc-400 max-w-lg mx-auto text-base">
                Don&apos;t just attend worship.{" "}
                <em className="text-white font-semibold">Become</em> worship. Let this book break
                open a new dimension in your walk with God.
              </p>
              <p className="mb-8 text-amber-400 font-semibold text-lg">
                Physical copy · KSH 1,200 only (~$9.30 USD)
              </p>

              <div className="flex flex-col gap-3 items-center sm:flex-row sm:justify-center">
                <OrderButton
                  onClick={openWhatsApp}
                  icon="💬"
                  label="WhatsApp"
                  sub={bookMeta.authorPhone}
                  color="bg-green-600 hover:bg-green-500"
                />
                <OrderButton
                  onClick={callOwner}
                  icon="📞"
                  label="Call Owner"
                  sub={bookMeta.authorPhone}
                  color="bg-zinc-700 hover:bg-zinc-600"
                />
                <OrderButton
                  onClick={emailOwner}
                  icon="✉️"
                  label="Email Order"
                  sub={bookMeta.authorEmail}
                  color="bg-amber-700 hover:bg-amber-600"
                />
              </div>

              <p className="mt-8 text-xs text-zinc-500">
                Reach the author directly:{" "}
                <a
                  href={`mailto:${bookMeta.authorEmail}`}
                  className="text-amber-500 hover:text-amber-400 underline underline-offset-2"
                >
                  {bookMeta.authorEmail}
                </a>
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-800 py-8 px-4 text-center text-xs text-zinc-600">
        <p className="mb-1 font-semibold text-zinc-400">{bookMeta.title}</p>
        <p>{bookMeta.copyright}</p>
        <p className="mt-1">Published by {bookMeta.publisher}</p>
      </footer>
    </div>
  );
}
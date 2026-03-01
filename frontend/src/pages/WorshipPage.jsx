import { useEffect, useRef, useState } from "react";

import { getWorshipTeams, recordPlay, submitJoinRequest } from "../api/worship";
import { useAuth } from "../context/AuthContext";

/* ── Helpers ─────────────────────────────────────────────────── */
const ROLE_ICON = { vocalist: "🎤", instrumentalist: "🎸" };
const ROLE_COLOR = {
  vocalist: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  instrumentalist: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};
const TEAM_QUOTE = "Worship is not a song. It has never been a song. And it will never be a song.";

function MemberCard({ member }) {
  return (
    <div className="card-hover flex flex-col items-center gap-3 text-center">
      {/* Avatar */}
      <div className="relative">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.display_name}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-zinc-700"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 ring-2 ring-zinc-700 text-3xl">
            {ROLE_ICON[member.role] ?? "🎵"}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-bold text-white text-sm leading-tight">{member.display_name}</p>
        {member.instrument && (
          <p className="text-xs text-zinc-500">{member.instrument}</p>
        )}
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ROLE_COLOR[member.role] ?? ""}`}
        >
          {ROLE_ICON[member.role]} {member.role_display}
        </span>
      </div>

      {member.bio && (
        <p className="text-[11px] text-zinc-600 leading-relaxed line-clamp-3">{member.bio}</p>
      )}
    </div>
  );
}

function TrackCard({ track }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(track.play_count ?? 0);
  const [played, setPlayed] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      if (!played) {
        setPlayed(true);
        setPlayCount((c) => c + 1);
        recordPlay(track.id).catch(() => {});
      }
    }
  };

  return (
    <div className="card-hover flex gap-4 items-start">
      {/* Cover art / placeholder */}
      <div className="shrink-0 h-14 w-14 rounded-xl overflow-hidden bg-gradient-to-br from-amber-900/40 to-zinc-900 ring-1 ring-zinc-800 flex items-center justify-center text-2xl">
        {track.cover_art_url ? (
          <img src={track.cover_art_url} alt={track.title} className="h-full w-full object-cover" />
        ) : (
          "🎵"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">{track.title}</p>
        {track.duration_display && (
          <p className="text-[11px] text-zinc-600 mt-0.5">{track.duration_display}</p>
        )}
        {track.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{track.description}</p>
        )}

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {/* Audio player */}
          {track.audio_url && (
            <>
              <button
                onClick={togglePlay}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
              >
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <audio
                ref={audioRef}
                src={track.audio_url}
                onEnded={() => setPlaying(false)}
                className="hidden"
              />
            </>
          )}

          {/* YouTube link */}
          {track.youtube_url && (
            <a
              href={track.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-600/20 transition"
            >
              ▶ YouTube
            </a>
          )}

          <span className="ml-auto text-[10px] text-zinc-700">{playCount} plays</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function WorshipPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    getWorshipTeams()
      .then((r) => {
        const results = r.data.results ?? r.data;
        setTeam(Array.isArray(results) ? results[0] : null);
      })
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, []);

  const vocalists = team?.members?.filter((m) => m.role === "vocalist") ?? [];
  const instrumentalists = team?.members?.filter((m) => m.role === "instrumentalist") ?? [];
  const tracks = team?.tracks ?? [];

  const tabs = [
    { id: "about", label: "About" },
    { id: "vocalists", label: `Vocalists${vocalists.length ? ` (${vocalists.length})` : ""}` },
    { id: "instrumentalists", label: `Instrumentalists${instrumentalists.length ? ` (${instrumentalists.length})` : ""}` },
    { id: "tracks", label: `Music${tracks.length ? ` (${tracks.length})` : ""}` },
  ];

  /* Facebook icon SVG */
  const FBIcon = () => (
    <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );

  /* WhatsApp icon SVG — reused in two places */
  const WAIcon = () => (
    <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  return (
    <div className="page-bg min-h-screen">

      {/* ── Team mantra quote banner ──────────────────────── */}
      <div className="border-b border-amber-500/10 bg-gradient-to-r from-amber-950/20 via-zinc-950 to-purple-950/20">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500 mb-3">Our Belief</p>
          <blockquote className="text-xl font-black text-white sm:text-2xl lg:text-3xl leading-snug">
            "{TEAM_QUOTE}"
          </blockquote>
          <p className="mt-3 text-xs text-zinc-600 italic tracking-wide">— Shouts of Joy Melodies</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8 sm:px-5 sm:py-12 sm:space-y-10">

        {loading ? (
          <div className="h-52 animate-pulse rounded-3xl bg-zinc-900" />
        ) : !team ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-20 text-center">
            <p className="text-5xl mb-4">🎵</p>
            <p className="font-bold text-zinc-300 text-lg">Worship team data unavailable</p>
          </div>
        ) : (
          <>
            {/* ── Hero cover ───────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800">
              {team.cover_photo_url
                ? <img src={team.cover_photo_url} alt={team.name} className="h-72 w-full object-cover sm:h-64" />
                : <div className="h-72 w-full bg-gradient-to-br from-amber-950/40 via-zinc-950 to-purple-950/30 sm:h-64" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
                {/* Name / logo */}
                <div className="flex items-end gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-purple-600/20 ring-2 ring-zinc-700 text-3xl shadow-lg">
                    {team.logo_url
                      ? <img src={team.logo_url} alt="logo" className="h-full w-full object-cover rounded-2xl" />
                      : "🎶"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Spirit Revival Africa · Worship Team</p>
                    <h1 className="text-2xl font-black text-white sm:text-3xl">{team.name}</h1>
                    {team.tagline && <p className="mt-1 text-sm text-zinc-400 italic">{team.tagline}</p>}
                  </div>
                </div>

                {/* Hero action buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {team.whatsapp_link ? (
                    <a href={team.whatsapp_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-600/15 px-4 py-2.5 text-sm font-bold text-green-400 hover:bg-green-600/25 transition shadow">
                      <WAIcon /> WhatsApp
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 rounded-xl border border-green-500/15 bg-green-600/5 px-4 py-2.5 text-sm font-bold text-green-800 select-none">
                      <WAIcon /> WhatsApp — soon
                    </span>
                  )}
                  {team.facebook_link ? (
                    <a href={team.facebook_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 px-4 py-2.5 text-sm font-bold text-blue-400 hover:bg-blue-600/25 transition shadow">
                      <FBIcon /> Facebook Group
                    </a>
                  ) : (
                    <span className="flex items-center gap-2 rounded-xl border border-blue-500/15 bg-blue-600/5 px-4 py-2.5 text-sm font-bold text-blue-900 select-none">
                      <FBIcon /> Facebook — soon
                    </span>
                  )}
                  <button onClick={() => setShowJoinModal(true)} className="btn-gold px-4 py-2.5 text-sm">
                    🎵 Join the Team
                  </button>
                </div>
              </div>
            </div>

            {/* ── Stats bar ────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: "🎤", label: "Vocalists",        value: team.vocalist_count ?? vocalists.length },
                { icon: "🎸", label: "Instrumentalists",  value: team.instrumentalist_count ?? instrumentalists.length },
                { icon: "🎵", label: "Tracks",            value: tracks.length },
                { icon: "📅", label: "Founded",           value: team.founded_year ?? "—" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* ── CTA strip ────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-950/20 via-zinc-950 to-purple-950/20 px-7 py-5 items-center justify-between">
              <div>
                <p className="font-black text-white text-base">Want to be part of Shouts of Joy Melodies?</p>
                <p className="text-xs text-zinc-500 mt-0.5">We welcome vocalists and instrumentalists who carry a heart for Spirit-filled worship.</p>
              </div>
              <div className="flex gap-3 shrink-0 flex-wrap">
                {team.whatsapp_link && (
                  <a href={team.whatsapp_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-600/15 px-4 py-2.5 text-sm font-bold text-green-400 hover:bg-green-600/25 transition">
                    <WAIcon /> WhatsApp
                  </a>
                )}
                {team.facebook_link && (
                  <a href={team.facebook_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 px-4 py-2.5 text-sm font-bold text-blue-400 hover:bg-blue-600/25 transition">
                    <FBIcon /> Facebook Group
                  </a>
                )}
                <button onClick={() => setShowJoinModal(true)} className="btn-gold px-5 py-2.5 text-sm">
                  🎵 Request to Join
                </button>
              </div>
            </div>

            {/* ── Tabs ─────────────────────────────────── */}
            <div>
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-900/50 p-1 scrollbar-none border border-zinc-800">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === t.id ? "bg-amber-500 text-black shadow" : "text-zinc-400 hover:text-zinc-200"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {/* About */}
                {activeTab === "about" && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 space-y-6">
                    <h2 className="text-lg font-black text-white">About the Team</h2>
                    {team.description
                      ? <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{team.description}</p>
                      : <p className="text-zinc-600">No description yet.</p>}
                    {/* Quote callout */}
                    <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-6 text-center">
                      <p className="text-sm font-black text-purple-200 italic leading-relaxed">"{TEAM_QUOTE}"</p>
                    </div>
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5 flex gap-4">
                      <span className="text-2xl">ℹ️</span>
                      <div>
                        <p className="text-sm font-semibold text-amber-300 mb-1">Independent Worship Ministry</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Shouts of Joy Melodies operates as an independent worship team within the Spirit Revival Africa
                          movement. Comprising both <strong className="text-zinc-400">instrumentalists</strong> and{" "}
                          <strong className="text-zinc-400">vocalists</strong>, the team is dedicated to Spirit-filled
                          worship that carries revival across Africa and the nations.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "vocalists" && (
                  vocalists.length === 0
                    ? <EmptyState icon="🎤" message="No vocalists listed yet. Check back soon!" />
                    : <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {vocalists.map((m) => <MemberCard key={m.id} member={m} />)}
                      </div>
                )}

                {activeTab === "instrumentalists" && (
                  instrumentalists.length === 0
                    ? <EmptyState icon="🎸" message="No instrumentalists listed yet. Check back soon!" />
                    : <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {instrumentalists.map((m) => <MemberCard key={m.id} member={m} />)}
                      </div>
                )}

                {activeTab === "tracks" && (
                  tracks.length === 0
                    ? <EmptyState icon="🎵" message="No tracks released yet. New music coming soon!" />
                    : <div className="grid gap-4 sm:grid-cols-2">
                        {tracks.map((t) => <TrackCard key={t.id} track={t} />)}
                      </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Join modal */}
      {showJoinModal && <JoinModal team={team} user={user} onClose={() => setShowJoinModal(false)} />}
    </div>
  );
}

/* ── Join Request Modal ───────────────────────────────────────── */
function JoinModal({ team, onClose, user }) {
  const BLANK = { full_name: "", email: "", phone: "", role: "", instrument: "", message: "" };
  const [form, setForm] = useState({
    ...BLANK,
    full_name: user?.full_name || user?.username || "",
    email: user?.email || "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.role) errs.role = "Please select your role";
    if (form.role === "instrumentalist" && !form.instrument.trim()) errs.instrument = "Please specify your instrument";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      await submitJoinRequest({ ...form, team: team.id });
      setSuccess(true);
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") setErrors(data);
      else setErrors({ non_field: "Something went wrong. Please try again." });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 overscroll-contain" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl rounded-b-none border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden sm:rounded-3xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 via-zinc-950 to-purple-950/40 px-7 pt-7 pb-5 border-b border-zinc-800">
          <button onClick={onClose} className="absolute top-4 right-5 text-zinc-500 hover:text-zinc-300 text-xl transition">✕</button>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Shouts of Joy Melodies</p>
          <h2 className="text-xl font-black text-white">Join the Worship Team</h2>
          <p className="text-xs text-zinc-500 mt-1">Fill in your details — the team will review and reach out to you.</p>
        </div>

        {success ? (
          <div className="px-7 py-12 text-center space-y-4">
            <p className="text-5xl">🙌</p>
            <p className="text-lg font-black text-white">Request Submitted!</p>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto">
              Your application has been received. The Shouts of Joy Melodies team will be in touch soon. Keep worshipping!
            </p>
            <button onClick={onClose} className="btn-gold px-8 py-2.5 text-sm mt-2">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {errors.non_field && (
              <p className="rounded-lg bg-red-900/30 border border-red-700/30 px-4 py-2 text-xs text-red-400">{errors.non_field}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400 uppercase tracking-wide">Full Name <span className="text-amber-500">*</span></label>
                <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Your full name" className="input-dark" />
                {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email <span className="text-amber-500">*</span></label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" className="input-dark" />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400 uppercase tracking-wide">Phone <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+27 / +254 / +263 …" className="input-dark" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400 uppercase tracking-wide">I am a <span className="text-amber-500">*</span></label>
              <div className="flex gap-3">
                {[{ value: "vocalist", label: "🎤 Vocalist" }, { value: "instrumentalist", label: "🎸 Instrumentalist" }].map(({ value, label }) => (
                  <label key={value} className="flex-1 cursor-pointer">
                    <input type="radio" name="role" value={value} checked={form.role === value} onChange={() => set("role", value)} className="sr-only peer" />
                    <div className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-400 transition peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-300 hover:border-zinc-500">
                      {label}
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role}</p>}
            </div>
            {form.role === "instrumentalist" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400 uppercase tracking-wide">Instrument <span className="text-amber-500">*</span></label>
                <input value={form.instrument} onChange={(e) => set("instrument", e.target.value)} placeholder="e.g. Keys, Guitar, Drums, Bass, Violin…" className="input-dark" />
                {errors.instrument && <p className="mt-1 text-xs text-red-400">{errors.instrument}</p>}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400 uppercase tracking-wide">Why do you want to join? <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
              <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={3} maxLength={500} placeholder="Share your heart — what draws you to Shouts of Joy Melodies?" className="input-dark resize-none" />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{form.message.length}/500</p>
            </div>
            <div className="pt-1 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:border-zinc-500 transition">Cancel</button>
              <button type="submit" disabled={loading} className="btn-gold px-7 py-2.5 text-sm disabled:opacity-60">
                {loading ? "Submitting…" : "Submit Request 🙏"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-16 text-center">
      <p className="text-5xl mb-3">{icon}</p>
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}

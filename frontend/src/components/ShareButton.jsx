import { useMemo, useState } from "react";

import api from "../api/client";

function buildShareText(shareData, joinUrl) {
  return shareData?.whatsapp_caption
    || `${shareData?.title || "Spirit Revival Africa"}\n\n${shareData?.excerpt || ""}\n\n${shareData?.cta || `Join the movement: ${joinUrl}`}`.trim();
}

export default function ShareButton({ endpoint, label = "Share", className = "" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [status, setStatus] = useState("");
  const joinUrl = `${window.location.origin}/register`;

  const shareText = useMemo(() => buildShareText(shareData, joinUrl), [shareData, joinUrl]);

  const loadShareData = async () => {
    if (shareData || loading) return;
    setLoading(true);
    try {
      const { data } = await api.get(endpoint);
      setShareData(data);
    } catch {
      setStatus("Could not load share options.");
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await loadShareData();
    }
  };

  const setTransientStatus = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2200);
  };

  const handleNativeShare = async () => {
    if (!shareData) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareData.title,
          text: `${shareData.excerpt || ""}\n\n${shareData.cta || ""}`.trim(),
          url: shareData.url || joinUrl,
        });
        setTransientStatus("Shared successfully.");
        return;
      }
      await navigator.clipboard.writeText(shareData.url || joinUrl);
      setTransientStatus("Link copied.");
    } catch {
      setTransientStatus("Could not share right now.");
    }
  };

  const handleCopy = async () => {
    if (!shareData) return;
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareData.url || joinUrl}`.trim());
      setTransientStatus("Share text copied.");
    } catch {
      setTransientStatus("Clipboard unavailable.");
    }
  };

  const whatsappUrl = shareData
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareData.url || joinUrl}`.trim())}`
    : "#";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className={className || "rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-400"}
      >
        ↗ {label}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-amber-500/20 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="border-b border-zinc-800 bg-gradient-to-r from-amber-500/10 to-transparent p-4">
            <div className="mb-3 flex items-center gap-3">
              <img src="/sra-logo.png" alt="Spirit Revival Africa" className="h-10 w-10 rounded-xl border border-amber-500/20 bg-black/40 p-1.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">Spirit Revival Africa</p>
                <p className="text-sm font-semibold text-white">Invite others to pray, read, and join</p>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-zinc-400">Loading share details…</p>
            ) : shareData ? (
              <>
                <p className="text-sm font-semibold text-white">{shareData.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{shareData.excerpt}</p>
                <p className="mt-3 rounded-xl border border-amber-500/15 bg-black/30 px-3 py-2 text-xs text-amber-300">
                  {shareData.cta || `Join the movement: ${joinUrl}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-400">{status || "Share details unavailable."}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 p-4">
            <button type="button" onClick={handleNativeShare} disabled={!shareData} className="btn-gold justify-center py-2 text-sm disabled:opacity-50">
              Share now
            </button>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className={`btn-outline justify-center py-2 text-sm ${!shareData ? "pointer-events-none opacity-50" : ""}`}>
              Share on WhatsApp
            </a>
            <button type="button" onClick={handleCopy} disabled={!shareData} className="btn-outline justify-center py-2 text-sm disabled:opacity-50">
              Copy share text
            </button>
            <a href={joinUrl} className="rounded-xl border border-zinc-800 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300">
              Join the movement
            </a>
            {status ? <p className="text-center text-xs text-zinc-500">{status}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
import { useMemo, useState } from "react";

import api from "../api/client";
import { appendRef } from "../utils/referral";
import { trackShare } from "../utils/trackShare";

const SITE_URL = "https://spiritrevivalafrica.com";

/**
 * Builds the viral share message.
 * Format per spec:
 *   🔥 This touched me. You need to see this.
 *
 *   {title}
 *
 *   {excerpt up to 120 chars}
 *
 *   👉 Join the movement:
 *   https://spiritrevivalafrica.com
 *
 *   Read more:
 *   {deep_link_url}
 */
function buildCopyMessage(shareData) {
  if (!shareData) return "";
  const raw = shareData.excerpt || "";
  const excerpt = raw.length > 120 ? raw.slice(0, 120).trimEnd() + "..." : raw;
  const deepUrl = appendRef(shareData.url);
  return [
    `🔥 This touched me. You need to see this.`,
    shareData.title || "Spirit Revival Africa",
    excerpt,
    `👉 Join the movement:\n${SITE_URL}`,
    deepUrl ? `Read more:\n${deepUrl}` : "",
  ].filter(Boolean).join("\n\n");
}

export default function ShareButton({ endpoint, label = "Share", className = "", contentType, objectId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [status, setStatus] = useState("");

  // WhatsApp: prefer pre-formatted backend caption; fall back to buildCopyMessage
  const whatsappText = useMemo(
    () => shareData?.whatsapp_caption?.trim() || buildCopyMessage(shareData),
    [shareData],
  );

  // Native share body: excerpt + cta — URL passed separately to avoid duplication
  const nativeText = useMemo(
    () =>
      shareData
        ? `${shareData.excerpt || ""}\n\n${shareData.cta || `🔥 Join the movement → ${SITE_URL}`}`.trim()
        : "",
    [shareData],
  );

  // Append ?ref to deep link URL
  const deepUrl = useMemo(() => appendRef(shareData?.url) || SITE_URL, [shareData]);

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
    if (nextOpen) await loadShareData();
  };

  const setTransientStatus = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2400);
  };

  // Native share — uses OS share sheet on mobile; falls back to copy message on desktop
  const handleNativeShare = async () => {
    if (!shareData) return;
    if (contentType && objectId) trackShare(contentType, objectId, "native");
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareData.title,
          text: nativeText,
          url: deepUrl,
        });
        setTransientStatus("Shared successfully.");
        return;
      }
      // Desktop fallback — copy full message
      await navigator.clipboard.writeText(buildCopyMessage(shareData));
      setTransientStatus("Message copied! Paste and send. 🔥");
    } catch {
      setTransientStatus("Could not share right now.");
    }
  };

  // Copies the full viral share message
  const handleCopyMessage = async () => {
    if (!shareData) return;
    if (contentType && objectId) trackShare(contentType, objectId, "copy");
    try {
      await navigator.clipboard.writeText(buildCopyMessage(shareData));
      setTransientStatus("Message copied! Paste and send. 🔥");
    } catch {
      setTransientStatus("Clipboard unavailable.");
    }
  };

  // Copies just the clean deep-link URL (with ?ref appended)
  const handleCopyLink = async () => {
    if (!deepUrl) return;
    if (contentType && objectId) trackShare(contentType, objectId, "copy");
    try {
      await navigator.clipboard.writeText(deepUrl);
      setTransientStatus("Link copied.");
    } catch {
      setTransientStatus("Clipboard unavailable.");
    }
  };

  // WhatsApp gets the full pre-formatted caption (single encodeURIComponent only)
  const whatsappUrl = shareData
    ? `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
    : "#";

  const twitterUrl = shareData
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `${shareData.excerpt || ""}`.slice(0, 240).trimEnd(),
      )}&url=${encodeURIComponent(deepUrl)}`
    : "#";

  const facebookUrl = shareData
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepUrl)}`
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
              {typeof navigator !== "undefined" && navigator.share ? "📤 Share now" : "📤 Share"}
            </button>
            <a href={whatsappUrl} target="_blank" rel="noreferrer"
               onClick={() => contentType && objectId && trackShare(contentType, objectId, "whatsapp")}
               className={`btn-outline justify-center py-2 text-sm ${!shareData ? "pointer-events-none opacity-50" : ""}`}>
              💬 Share on WhatsApp
            </a>
            <a href={twitterUrl} target="_blank" rel="noreferrer"
               onClick={() => contentType && objectId && trackShare(contentType, objectId, "twitter")}
               className={`btn-outline justify-center py-2 text-sm ${!shareData ? "pointer-events-none opacity-50" : ""}`}>
              𝕏 Share on Twitter
            </a>
            <a href={facebookUrl} target="_blank" rel="noreferrer"
               onClick={() => contentType && objectId && trackShare(contentType, objectId, "facebook")}
               className={`btn-outline justify-center py-2 text-sm ${!shareData ? "pointer-events-none opacity-50" : ""}`}>
              📘 Share on Facebook
            </a>
            <button type="button" onClick={handleCopyMessage} disabled={!shareData} className="btn-outline justify-center py-2 text-sm disabled:opacity-50">
              📋 Copy Message
            </button>
            <button type="button" onClick={handleCopyLink} disabled={!shareData} className="btn-outline justify-center py-2 text-sm disabled:opacity-50">
              🔗 Copy Link
            </button>
            <a href={`${SITE_URL}/register`} className="rounded-xl border border-zinc-800 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 transition hover:border-amber-500/30 hover:text-amber-300">
              Join the movement
            </a>
            {status ? <p className="text-center text-xs text-zinc-500">{status}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
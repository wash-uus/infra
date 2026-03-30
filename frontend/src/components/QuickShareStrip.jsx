/**
 * QuickShareStrip — WhatsApp-dominant share strip.
 *
 * Designed for mobile-first placement directly below story or prayer content.
 * WhatsApp is the primary CTA; Copy/Twitter/Facebook are secondary.
 *
 * Props:
 *   url         {string}  Absolute deep-link URL (no ?ref — we append it)
 *   title       {string}  Content title
 *   excerpt     {string}  Short excerpt (max 120 chars recommended)
 *   contentType {"story"|"prayer"}  For analytics tracking
 *   objectId    {number}  Content id for analytics (0 = generic)
 *   className   {string}  Extra classes on the wrapper
 */
import { useMemo, useState } from "react";

import { appendRef } from "../utils/referral";
import { trackShare } from "../utils/trackShare";

const SITE_URL = "https://spiritrevivalafrica.com";

function buildMessage(title, excerpt, deepUrl) {
  const safe = (excerpt || "").slice(0, 120).trimEnd();
  return [
    `🔥 This touched me. You need to see this.`,
    title || "Spirit Revival Africa",
    safe,
    `👉 Join the movement:\n${SITE_URL}`,
    deepUrl ? `Read more:\n${deepUrl}` : "",
    "— Spirit Revival Africa",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function QuickShareStrip({
  url,
  title,
  excerpt,
  contentType = "story",
  objectId = 0,
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const deepUrl = useMemo(() => appendRef(url), [url]);
  const message = useMemo(() => buildMessage(title, excerpt, deepUrl), [title, excerpt, deepUrl]);

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    (excerpt || title || "").slice(0, 240).trimEnd()
  )}&url=${encodeURIComponent(deepUrl || SITE_URL)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepUrl || SITE_URL)}`;

  const fire = (platform) => trackShare(contentType, objectId, platform);

  const handleCopy = async () => {
    fire("copy");
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  const handleNative = async () => {
    fire("native");
    try {
      if (navigator.share) {
        await navigator.share({ title, text: excerpt, url: deepUrl || SITE_URL });
      } else {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className={`rounded-2xl border border-amber-500/15 bg-zinc-950/80 p-5 ${className}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
        Share this with someone who needs it
      </p>

      {/* WhatsApp — PRIMARY */}
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => fire("whatsapp")}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-black shadow-lg shadow-[#25D366]/20 transition hover:bg-[#20bc5a] active:scale-95"
      >
        💬 Share on WhatsApp
      </a>

      {/* Secondary row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-col items-center gap-1 rounded-xl border border-zinc-700 py-3 text-xs font-semibold text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-300 active:scale-95"
        >
          <span className="text-base">{copied ? "✅" : "🔗"}</span>
          {copied ? "Copied!" : "Copy"}
        </button>
        <a
          href={twUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => fire("twitter")}
          className="flex flex-col items-center gap-1 rounded-xl border border-zinc-700 py-3 text-xs font-semibold text-zinc-300 transition hover:border-sky-500/40 hover:text-sky-300 active:scale-95"
        >
          <span className="text-base">𝕏</span>
          Twitter
        </a>
        <a
          href={fbUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => fire("facebook")}
          className="flex flex-col items-center gap-1 rounded-xl border border-zinc-700 py-3 text-xs font-semibold text-zinc-300 transition hover:border-blue-500/40 hover:text-blue-300 active:scale-95"
        >
          <span className="text-base">📘</span>
          Facebook
        </a>
      </div>

      {/* Native share — mobile only, shown as a subtle secondary link */}
      {typeof navigator !== "undefined" && (
        <button
          type="button"
          onClick={handleNative}
          className="mt-3 w-full text-center text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
        >
          📤 More share options
        </button>
      )}
    </div>
  );
}

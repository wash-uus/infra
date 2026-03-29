/**
 * usePageMeta — sets document.title and meta description per-page.
 *
 * This is a lightweight client-side approach that immediately improves:
 *  - Browser tab labels and bookmarks
 *  - Share previews when crawled by Google (via deferred JS rendering)
 *  - Bing/DuckDuckGo previews
 *
 * For full SSR-level crawlability, migrate to Next.js or implement
 * prerendering (see SEO_RECOVERY_PLAN.md).
 *
 * Usage:
 *   import { usePageMeta } from "../hooks/usePageMeta";
 *   usePageMeta({
 *     title: "Prayer Wall | Spirit Revival Africa",
 *     description: "Join thousands of intercessors...",
 *   });
 */
import { useEffect } from "react";

const DEFAULT_TITLE = "Spirit Revival Africa — Reigniting the Holy Spirit Across Africa";
const DEFAULT_DESC =
  "Join Africa's growing interdenominational revival movement. Worship, prayer, discipleship, community groups and revival hubs — all in one place.";
const SITE_NAME = "Spirit Revival Africa";

export function usePageMeta({ title, description, ogImage } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESC;
    const image = ogImage || "https://spiritrevivalafrica.com/og-image.png";

    // Title
    document.title = fullTitle;

    // Helper to set/create a meta tag
    const setMeta = (selector, content) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const attr = selector.startsWith("meta[name")
          ? "name"
          : selector.startsWith("meta[property")
          ? "property"
          : "name";
        const value = selector.match(/["']([^"']+)["']/)?.[1] || "";
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', image);

    // Reset on unmount
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, ogImage]);
}

/**
 * AnnouncementBanner — fetches active announcements from the API and renders
 * a banner for each one. Only admins can remove them via the Django admin panel
 * (toggle is_active or set an expiry date). Users cannot dismiss them.
 */
import { useEffect, useState } from "react";
import api from "../api/client";

const STYLES = {
  info: {
    wrapper: "bg-blue-900/70 border-blue-500/40 text-blue-100",
    icon: "ℹ️",
    badge: "bg-blue-600",
  },
  warning: {
    wrapper: "bg-amber-900/70 border-amber-500/40 text-amber-100",
    icon: "⚠️",
    badge: "bg-amber-500 text-stone-900",
  },
  urgent: {
    wrapper: "bg-red-900/70 border-red-500/40 text-red-100",
    icon: "🚨",
    badge: "bg-red-600",
  },
};

export default function AnnouncementBanner() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .get("/common/announcements/")
      .then((res) => setItems(res.data.results || []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {items.map((a) => {
        const s = STYLES[a.priority] || STYLES.info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${s.wrapper}`}
          >
            {/* Icon */}
            <span className="text-base mt-0.5 shrink-0">{s.icon}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span
                  className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white ${s.badge}`}
                >
                  {a.priority}
                </span>
                <span className="font-semibold">{a.title}</span>
              </div>
              <p className="opacity-90 leading-snug">{a.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


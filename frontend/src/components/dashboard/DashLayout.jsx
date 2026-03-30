/**
 * DashLayout — Shared shell for all role dashboards.
 *
 * Features:
 *  - Collapsible sidebar (desktop pinned, mobile drawer)
 *  - Role badge + avatar near top
 *  - Notification bell with unread count dropdown
 *  - Section nav items driven by role
 */
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getNotifications, getUnreadCount, markAllRead } from "../../api/dashboard";
import api, { resolveMediaUrl } from "../../api/client";
import AnnouncementBanner from "../AnnouncementBanner";

// ── Role-specific nav items ──────────────────────────────────────────────────
const NAV = {
  member: [
    { to: "/dashboard", icon: "⊞", label: "Dashboard" },
    { to: "/groups", icon: "👥", label: "My Groups" },
    { to: "/hubs", icon: "🏛", label: "Hubs" },
    { to: "/discipleship", icon: "📖", label: "Courses" },
    { to: "/prayer", icon: "🙏", label: "Prayer Wall" },
    { to: "/messages", icon: "💬", label: "Messages" },
    { to: "/profile/settings", icon: "⚙", label: "Profile Settings" },
  ],
  moderator: [
    { to: "/dashboard", icon: "⊞", label: "Dashboard" },
    { to: "/content", icon: "📄", label: "Content" },
    { to: "/messages", icon: "💬", label: "Messages" },
  ],
  hub_leader: [
    { to: "/dashboard", icon: "⊞", label: "Dashboard" },
    { to: "/hubs", icon: "🏛", label: "All Hubs" },
    { to: "/groups", icon: "👥", label: "Groups" },
    { to: "/messages", icon: "💬", label: "Messages" },
    { to: "/profile/settings", icon: "⚙", label: "Profile Settings" },
  ],
  admin: [
    { to: "/dashboard", icon: "⊞", label: "Dashboard" },
    { to: "/hubs", icon: "🏛", label: "Hubs" },
    { to: "/content", icon: "📄", label: "Content" },
    { to: "/messages", icon: "💬", label: "Messages" },
    { to: "/profile/settings", icon: "⚙", label: "Profile Settings" },
  ],
  super_admin: [
    { to: "/dashboard", icon: "⊞", label: "Dashboard" },
    { to: "/hubs", icon: "🏛", label: "Hubs" },
    { to: "/content", icon: "📄", label: "Content" },
    { to: "/messages", icon: "💬", label: "Messages" },
    { to: "/profile/settings", icon: "⚙", label: "Profile Settings" },
  ],
};

const ROLE_COLORS = {
  member: "bg-zinc-700 text-zinc-200",
  moderator: "bg-blue-900 text-blue-200",
  hub_leader: "bg-emerald-900 text-emerald-200",
  admin: "bg-amber-900 text-amber-200",
  super_admin: "bg-red-900 text-red-300",
};

const ROLE_LABELS = {
  member: "Member",
  moderator: "Moderator",
  hub_leader: "Hub Leader",
  admin: "Admin",
  super_admin: "Super Admin",
};

// ── Notification bell ─────────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    getUnreadCount().then(r => setUnread(r.data.unread)).catch(() => {});
  }, []);

  const openBell = () => {
    setOpen(o => !o);
    if (!open) {
      getNotifications()
        .then(r => { setItems(r.data.results ?? r.data); })
        .catch(() => {});
    }
  };

  const readAll = () => {
    markAllRead().then(() => { setUnread(0); setItems(items.map(n => ({ ...n, is_read: true }))); }).catch(() => {});
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const NOTIF_ICONS = { info: "ℹ️", warning: "⚠️", action: "⚡", approved: "✅", rejected: "❌", appeal: "⚖️" };

  return (
    <div className="relative" ref={ref}>
      <button onClick={openBell} className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors">
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-semibold text-zinc-200">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs text-amber-500 hover:text-amber-400">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-900">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-600">No notifications</p>
            ) : items.slice(0, 10).map(n => (
              <div key={n.id} className={`px-4 py-3 ${n.is_read ? "opacity-50" : ""}`}>
                <div className="flex gap-2">
                  <span>{NOTIF_ICONS[n.notif_type] ?? "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{n.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────
export default function DashLayout({ children, title }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    api.get("/accounts/profile/")
      .then(r => setProfilePic(resolveMediaUrl(r.data.profile_picture)))
      .catch(() => {});
  }, []);

  const navItems = NAV[role] ?? NAV["member"];
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.member;
  const roleLabel = ROLE_LABELS[role] ?? "Member";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-black text-zinc-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-zinc-800">
          <Link to="/" className="flex items-center gap-2 text-amber-500 font-bold text-lg tracking-tight">
            <img
              src="/sra-logo.png"
              alt="Spirit Revival Africa logo"
              className="h-8 w-8 rounded-full border border-zinc-700 object-cover"
              loading="lazy"
              decoding="async"
            />
            <span>SRA</span>
          </Link>
          <span className="text-zinc-600 text-xs">Dashboard</span>
        </div>

        {/* Role badge */}
        <div className="px-4 py-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="h-9 w-9 rounded-full object-cover ring-1 ring-amber-500/30 shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm shrink-0">
                {(user?.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">{user?.email ?? "User"}</p>
              <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors
                ${isActive
                  ? "bg-amber-500/15 text-amber-400 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors text-left flex items-center gap-2"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-zinc-800"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="text-xl">☰</span>
            </button>
            <img
              src="/sra-logo.png"
              alt="Spirit Revival Africa logo"
              className="hidden h-7 w-7 rounded-full border border-zinc-700 object-cover sm:block"
              loading="lazy"
              decoding="async"
            />
            <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              to="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/30 transition-colors"
            >
              {(user?.email ?? "?")[0].toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AnnouncementBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

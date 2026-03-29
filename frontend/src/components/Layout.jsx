import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import messaging from "../api/messaging";
import SignupModal from "./signup/SignupModal";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/prayer", label: "Prayer" },
  { to: "/content", label: "Content" },
  { to: "/discipleship", label: "Discipleship" },
  { to: "/book/beneath-the-crown", label: "📖 The Book" },
];


export default function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const navigate = useNavigate();

  // Poll unread message count for nav badge
  useEffect(() => {
    if (!isAuthenticated) { setMsgUnread(0); return; }
    const fetchCount = () =>
      messaging.getUnreadCount().then((r) => setMsgUnread(r.data?.total ?? 0)).catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Listen for session-expiry events fired by api/client.js so we can do a
  // smooth React Router redirect instead of a full page reload.
  useEffect(() => {
    const handle = () => navigate("/login", { replace: true });
    window.addEventListener("auth:login-required", handle);
    return () => window.removeEventListener("auth:login-required", handle);
  }, [navigate]);


  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/sra-logo.png"
              alt="Spirit Revival Africa logo"
              className="h-9 w-9 rounded-full border border-zinc-700 object-cover shadow-lg shadow-zinc-900 transition-transform duration-200 group-hover:scale-105"
              loading="eager"
              decoding="async"
            />
            <span className="hidden text-sm font-bold tracking-wide text-white sm:block">
              Spirit Revival <span className="text-amber-400">Africa</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-800 text-amber-400"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

          </nav>

          {/* Auth actions */}
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block">
                  Sign in
                </Link>
                <button onClick={() => setSignupOpen(true)} className="btn-gold py-2 px-4 text-sm">
                  Get Started
                </button>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block">
                  Dashboard
                </Link>
                <Link to="/messages" className="relative hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block">
                  Messages
                  {msgUnread > 0 && (
                    <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
                      {msgUnread > 9 ? "9+" : msgUnread}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition hover:text-white sm:block">
                  Profile
                </Link>
                <button
                  onClick={logout}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
                >
                  Sign out
                </button>
              </>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg border border-zinc-800 md:hidden"
            >
              <span className={`block h-0.5 w-5 bg-zinc-300 transition-all duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 bg-zinc-300 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-zinc-300 transition-all duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-zinc-800/60 bg-zinc-950 px-4 py-4 md:hidden">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium ${isActive ? "text-amber-400" : "text-zinc-300"}`
                }
              >
                {label}
              </NavLink>
            ))}
            {/* Explore links in mobile menu - now inlined into navLinks */}
            {!isAuthenticated ? (
              <div className="mt-4 flex gap-2 border-t border-zinc-800 pt-4">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 btn-outline py-2 text-center text-sm justify-center">
                  Sign in
                </Link>
                <button onClick={() => { setMenuOpen(false); setSignupOpen(true); }} className="flex-1 btn-gold py-2 text-center text-sm justify-center">
                  Register
                </button>
              </div>
            ) : (
              <div className="mt-4 border-t border-zinc-800 pt-4 space-y-1">
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition">
                  Dashboard
                </Link>
                <Link to="/messages" onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition">
                  Messages
                  {msgUnread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                      {msgUnread > 9 ? "9+" : msgUnread}
                    </span>
                  )}
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition">
                  Profile
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full rounded-lg border border-zinc-700/60 px-4 py-2.5 text-sm font-medium text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition text-left">
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} />

      {/* ── Floating WhatsApp CTA ─────────────────────────── */}
      <a
        href="https://wa.me/27140365237"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-full border border-green-500/40 bg-green-600 px-3 py-3 shadow-lg shadow-green-900/40 hover:bg-green-500 transition-all duration-200 sm:px-4"
      >
        <svg className="h-5 w-5 fill-white shrink-0" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="hidden text-sm font-bold text-white sm:inline">Talk to us</span>
      </a>

      {/* Footer */}
      <footer className="mt-24 border-t border-zinc-800/60 bg-zinc-950/50 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src="/sra-logo.png"
              alt="Spirit Revival Africa logo"
              className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
              loading="lazy"
              decoding="async"
            />
            <p className="text-sm font-semibold text-zinc-300">Spirit Revival Africa</p>
            <p className="max-w-sm text-xs text-zinc-600">
              An interdenominational revival movement centered on Jesus Christ. Inspired by Acts 1:7–9.
            </p>
            {/* Social links */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a href="https://www.facebook.com/groups/1481385329372393/?ref=share&mibextid=NSMWBT" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-600/20 transition">
                <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <a href="https://youtube.com/@spiritrevivalafrica?si=0XSwoVgPSBjK064w" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-600/20 transition">
                <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
              <a href="https://chat.whatsapp.com/Blr9XX2eWEb93SZTEkRAwo?mode=gi_t" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-600/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-600/20 transition">
                <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
              <a href="mailto:spirit@spiritrevivalafrica.com"
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-600/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-600/20 transition">
                <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
                Email
              </a>
            </div>
            <p className="text-xs text-zinc-700">&copy; {new Date().getFullYear()} Spirit Revival Africa. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

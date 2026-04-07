'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Menu, X, Bell, MessageSquare, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import InfraLogo from '@/components/ui/InfraLogo';

const NAV_LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: '/tools', label: 'Equipment' },
  { href: '/tools/new', label: 'Sell Equipment', exact: true },
  { href: '/jobs', label: 'Jobs' },
  { href: '/search', label: 'Find Professionals' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const { user, profile, signOutUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // 🚨 Mark component as mounted to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time unread notification count via Firestore onSnapshot.
  // Reads the denormalized `unreadNotificationCount` integer from the user doc —
  // zero Firestore read quota vs the previous O(n) query approach.
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const count = (snap.data()?.unreadNotificationCount as number) ?? 0;
        setUnreadCount(Math.max(0, count));
      },
      () => { /* silently ignore permission errors (unauthenticated edge case) */ },
    );
    return unsub;
  }, [user?.uid]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-infra-primary/20 bg-infra-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group">
            <InfraLogo size="sm" />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                  (link.exact ? pathname === link.href : pathname.startsWith(link.href))
                    ? 'bg-white/10 text-infra-secondary font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* 🚨 SSR SAFE GUARD: only render auth-dependent UI after mount */}
            {mounted ? (
              user ? (
                <>
                  {/* Notifications */}
                  <Link
                    href="/notifications"
                    className="relative rounded-xl p-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-infra-secondary px-1 text-[10px] font-bold text-white leading-none shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link
                  href="/messages"
                  className="relative rounded-xl p-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Messages"
                >
                  <MessageSquare className="h-5 w-5" />
                </Link>

                {/* Profile dropdown */}
                <div className="relative ml-1">
                  <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-1.5 pr-3 transition-all duration-200 hover:bg-white/20 hover:border-white/30"
                  >
                    {profile?.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt={profile.displayName}
                        width={28}
                        height={28}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-infra-secondary text-xs font-semibold text-white">
                        {(profile?.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="hidden text-sm font-medium text-white/90 sm:block">
                      {profile?.displayName?.split(' ')[0] ?? 'Account'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 z-20 mt-2 w-52 animate-scale-in rounded-2xl border border-gray-100 bg-white p-1.5 shadow-premium">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="h-4 w-4 text-gray-400" /> Dashboard
                        </Link>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                          onClick={() => setProfileOpen(false)}
                        >
                          <Settings className="h-4 w-4 text-gray-400" /> Profile
                        </Link>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => router.push('/signup')}>
                  Get started
                </Button>
              </div>
            )
            ) : (
              /* Placeholder while mounting - invisible to prevent layout shift */
              <div className="opacity-0">
                <div className="h-10 w-10" />
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 md:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="animate-slide-down border-t border-gray-100 pb-4 pt-2 md:hidden">
            <div className="space-y-0.5 px-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {!user && (
              <div className="mt-3 flex flex-col gap-2 px-3">
                <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => router.push('/signup')}>
                  Get started
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

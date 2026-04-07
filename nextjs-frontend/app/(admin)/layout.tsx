'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wrench,
  CreditCard,
  Bell,
  Server,
  ScrollText,
  LogOut,
  ShieldCheck,
  Flag,
  Shield,
  BarChart3,
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',     href: '/admin/dashboard',      icon: LayoutDashboard },
  { label: 'Users',         href: '/admin/users',           icon: Users },
  { label: 'Jobs',          href: '/admin/jobs',            icon: Briefcase },
  { label: 'Tools',         href: '/admin/tools',           icon: Wrench },
  { label: 'Transactions',  href: '/admin/transactions',    icon: CreditCard },
  { label: 'Subscriptions', href: '/admin/subscriptions',   icon: BarChart3 },
  { label: 'Abuse Reports', href: '/admin/abuse-reports',   icon: Flag },
  { label: 'Moderation',    href: '/admin/moderation',      icon: Shield },
  { label: 'Notifications', href: '/admin/notifications',   icon: Bell },
  { label: 'Audit Logs',    href: '/admin/audit-logs',      icon: ScrollText },
  { label: 'System',        href: '/admin/system',          icon: Server },
];

function AdminSidebar() {
  const pathname  = usePathname();
  const { signOutUser, profile } = useAuth();

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-gray-900 text-white">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-gray-700 px-6 py-5">
        <ShieldCheck className="h-6 w-6 text-infra-secondary" />
        <div>
          <p className="text-sm font-bold tracking-wide text-white">INFRA Admin</p>
          <p className="text-xs text-gray-400 capitalize">{profile?.role ?? 'admin'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-infra-secondary text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={() => signOutUser()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['admin', 'superadmin']}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

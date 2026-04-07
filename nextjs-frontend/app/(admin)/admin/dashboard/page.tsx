'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  Users,
  Briefcase,
  Wrench,
  CreditCard,
  AlertTriangle,
  Activity,
  DollarSign,
  Flag,
  X,
  Zap,
  UserCheck,
} from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminStats {
  totalUsers: number;
  activeUsers24h: number;
  totalJobs: number;
  jobsThisMonth: number;
  totalTools: number;
  totalTransactions: number;
  totalRevenue: number;
  failedPayments: number;
}

interface LiveAlert {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  ts: number;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

const ALERT_LABELS: Record<string, { label: string; color: string }> = {
  NEW_ABUSE_REPORT:             { label: 'New abuse report',          color: 'bg-red-50 border-red-200 text-red-800' },
  PAYMENT_FAILED:               { label: 'Payment failed',            color: 'bg-orange-50 border-orange-200 text-orange-800' },
  HIGH_VALUE_PAYMENT:           { label: 'High-value payment',        color: 'bg-green-50 border-green-200 text-green-800' },
  USER_BANNED:                  { label: 'User banned',               color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  PAYMENT_REFUNDED:             { label: 'Transaction refunded',      color: 'bg-blue-50 border-blue-200 text-blue-800' },
  ANOMALY:                      { label: '⚠ Anomaly detected',        color: 'bg-red-50 border-red-300 text-red-900' },
  RECONCILIATION_DISCREPANCY:   { label: '💰 Reconciliation alert',   color: 'bg-purple-50 border-purple-300 text-purple-900' },
  MODERATION_HIT:               { label: '🚫 Content auto-flagged',   color: 'bg-orange-50 border-orange-300 text-orange-900' },
  FRAUD_SIGNAL:                 { label: '🔍 Fraud signal',           color: 'bg-red-50 border-red-400 text-red-900' },
};

/** Connect to the admin SSE event stream and accumulate alerts. */
function useAdminEventStream() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Only run in browser — get auth token for the SSE request
    const connect = async () => {
      try {
        const { auth } = await import('@/lib/firebase');
        const token = await auth?.currentUser?.getIdToken();
        if (!token) return;

        const baseURL = process.env.NEXT_PUBLIC_API_URL ?? '';
        const es = new EventSource(`${baseURL}/api/admin/events`, {
          // Note: EventSource doesn't support custom headers natively.
          // The backend should accept the token via cookie or query param in production.
          // For now we append it as a query param (requires server-side support).
        });

        es.addEventListener('connected', () => setConnected(true));

        Object.keys(ALERT_LABELS).forEach((eventName) => {
          es.addEventListener(eventName, (e: MessageEvent) => {
            try {
              const payload = JSON.parse(e.data);
              setAlerts((prev) => [
                { id: `${Date.now()}-${Math.random()}`, event: eventName, payload, ts: Date.now() },
                ...prev.slice(0, 19), // keep last 20
              ]);
            } catch {
              // ignore parse errors
            }
          });
        });

        es.onerror = () => setConnected(false);
        esRef.current = es;
      } catch {
        // silently fail — SSE is non-critical
      }
    };

    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { alerts, connected, dismiss: (id: string) => setAlerts((p) => p.filter((a) => a.id !== id)) };
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AdminStats }>('/admin/stats');
      return res.data.data;
    },
    refetchInterval: 60_000,
  });

  const { data: liveRevenue } = useQuery<{
    totalKES: number;
    subscriptionKES: number;
    microtransactionKES: number;
    txCount: number;
  }>({
    queryKey: ['admin-live-revenue'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/live-revenue');
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const { data: activeUsersData } = useQuery<{ count: number }>({
    queryKey: ['admin-active-users'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/active-users');
      return res.data.data;
    },
    refetchInterval: 15_000,
  });

  const { alerts, connected, dismiss } = useAdminEventStream();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-2 text-gray-600">Failed to load dashboard stats.</p>
        </div>
      </div>
    );
  }

  const revenueKes = `KES ${(data.totalRevenue / 100).toLocaleString()}`;

  const cards = [
    {
      label:  'Total Users',
      value:  data.totalUsers,
      sub:    `${data.activeUsers24h} active in last 24 h`,
      icon:   Users,
      color:  'bg-infra-primary',
    },
    {
      label:  'Total Jobs',
      value:  data.totalJobs,
      sub:    `${data.jobsThisMonth} posted this month`,
      icon:   Briefcase,
      color:  'bg-blue-600',
    },
    {
      label:  'Tools Listed',
      value:  data.totalTools,
      icon:   Wrench,
      color:  'bg-purple-600',
    },
    {
      label:  'Transactions',
      value:  data.totalTransactions,
      icon:   CreditCard,
      color:  'bg-orange-500',
    },
    {
      label:  'Total Revenue',
      value:  revenueKes,
      sub:    'Completed + released payments',
      icon:   DollarSign,
      color:  'bg-green-600',
    },
    {
      label:  'Failed Payments',
      value:  data.failedPayments,
      sub:    'Refunded transactions',
      icon:   AlertTriangle,
      color:  'bg-red-500',
    },
  ];

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform overview — refreshes every 60 seconds
          </p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          connected
            ? 'bg-green-50 text-green-700'
            : 'bg-gray-50 text-gray-500'
        }`}>
          <Activity className="h-4 w-4" />
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>

      {/* Live Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Flag className="h-4 w-4 text-red-500" /> Live Alerts
          </h2>
          {alerts.map((alert) => {
            const meta = ALERT_LABELS[alert.event] ?? { label: alert.event, color: 'bg-gray-50 border-gray-200 text-gray-700' };
            return (
              <div key={alert.id} className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm ${meta.color}`}>
                <span>
                  <span className="font-medium">{meta.label}</span>
                  {typeof alert.payload.transactionId === 'string' && (
                    <span className="ml-2 font-mono text-xs opacity-70">{alert.payload.transactionId.slice(0, 12)}…</span>
                  )}
                  {typeof alert.payload.userId === 'string' && (
                    <span className="ml-2 font-mono text-xs opacity-70">{alert.payload.userId.slice(0, 12)}…</span>
                  )}
                  <span className="ml-3 text-xs opacity-50">{new Date(alert.ts).toLocaleTimeString()}</span>
                </span>
                <button onClick={() => dismiss(alert.id)} className="ml-4 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Live Pulse — revenue + active users in last 60/5 min */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Revenue — last 60 min</p>
              <p className="mt-2 text-3xl font-bold text-green-900">
                {liveRevenue
                  ? `KES ${liveRevenue.totalKES.toLocaleString()}`
                  : '—'}
              </p>
              {liveRevenue && (
                <p className="mt-1 text-xs text-green-600">
                  {liveRevenue.txCount} transactions ·
                  KES {liveRevenue.subscriptionKES.toLocaleString()} subs ·
                  KES {liveRevenue.microtransactionKES.toLocaleString()} micro
                </p>
              )}
            </div>
            <div className="rounded-xl bg-green-600 p-3">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="mt-3 text-xs text-green-500">Refreshes every 30 s</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Active Users — last 5 min</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {activeUsersData?.count ?? '—'}
              </p>
              <p className="mt-1 text-xs text-blue-600">Based on lastSeen field</p>
            </div>
            <div className="rounded-xl bg-blue-600 p-3">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-500">Refreshes every 15 s</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Manage Users',      href: '/admin/users' },
            { label: 'Abuse Reports',     href: '/admin/abuse-reports' },
            { label: 'Moderation Queue',  href: '/admin/moderation' },
            { label: 'Send Notification', href: '/admin/notifications' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-5 text-sm font-medium text-gray-500 transition hover:border-infra-primary hover:bg-infra-primary/5 hover:text-infra-primary"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}


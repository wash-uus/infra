'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, TrendingUp, DollarSign, Users } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  expiresAt: string;
  createdAt: string;
}

interface RevenueData {
  totalRevenue30d: number;
  revenueByMethod: Record<string, number>;
  revenueByTier: Record<string, number>;
  subscriptionRevenue: Record<string, number>;
  conversionFunnel: { signups: number; paid: number; rate: number };
  since: string;
}

interface SubsApiResponse {
  success: boolean;
  data: Subscription[];
  meta: { limit: number; total: number; nextCursor?: string };
}

const TIER_BADGE: Record<string, string> = {
  free:      'bg-gray-100 text-gray-600',
  pro:       'bg-blue-100 text-blue-700',
  elite:     'bg-purple-100 text-purple-700',
  unlimited: 'bg-amber-100 text-amber-700',
};

export default function AdminSubscriptionsPage() {
  const [tier, setTier]       = useState('');
  const [cursor, setCursor]   = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]);

  const { data: subsData, isLoading: subsLoading } = useQuery<SubsApiResponse>({
    queryKey: ['admin-subscriptions', tier, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '25' });
      if (tier)   params.set('tier', tier);
      if (cursor) params.set('cursor', cursor);
      const res = await api.get<SubsApiResponse>(`/admin/subscriptions?${params}`);
      return res.data;
    },
  });

  const { data: revenueData, isLoading: revLoading } = useQuery<{ success: boolean; data: RevenueData }>({
    queryKey: ['admin-revenue-analytics'],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/revenue`);
      return res.data;
    },
  });

  const subs = subsData?.data ?? [];
  const total = subsData?.meta.total ?? 0;
  const nextCursor = subsData?.meta.nextCursor;
  const rev = revenueData?.data;

  function goNext() {
    if (!nextCursor) return;
    setCursors((p) => [...p, cursor ?? '']);
    setCursor(nextCursor);
  }
  function goPrev() {
    const prev = [...cursors];
    setCursor(prev.pop() || undefined);
    setCursors(prev);
  }

  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Subscriptions & Revenue</h1>

      {/* ── Revenue Summary Cards ── */}
      {revLoading ? (
        <div className="mb-6 flex justify-center py-8"><LoadingSpinner size="md" /></div>
      ) : rev && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Revenue (30d)</p>
                <p className="text-2xl font-bold text-gray-900">
                  KES {rev.totalRevenue30d.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{rev.conversionFunnel.rate}%</p>
                <p className="text-xs text-gray-400">
                  {rev.conversionFunnel.paid} / {rev.conversionFunnel.signups} signups
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="w-full">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">By Tier</p>
                {Object.entries(rev.subscriptionRevenue).map(([t, v]) => (
                  <div key={t} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-600">{t}</span>
                    <span className="font-medium text-gray-900">KES {v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription List ── */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">All Subscriptions</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-600">{total}</span>
        <select
          value={tier}
          onChange={(e) => { setTier(e.target.value); setCursor(undefined); setCursors([]); }}
          className="ml-auto rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-infra-primary"
        >
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
          <option value="unlimited">Unlimited</option>
        </select>
      </div>

      {subsLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['User ID', 'Tier', 'Amount', 'Method', 'Status', 'Expires', 'Created'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.userId?.slice(0, 12)}…</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TIER_BADGE[s.tier] ?? 'bg-gray-100 text-gray-500'}`}>{s.tier}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.currency} {s.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs capitalize text-gray-500">{s.paymentMethod}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{s.status}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No subscriptions found.</td></tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <span className="text-xs text-gray-500">{total.toLocaleString()} total</span>
            <div className="flex gap-2">
              <button disabled={cursors.length === 0} onClick={goPrev} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={!nextCursor} onClick={goNext} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

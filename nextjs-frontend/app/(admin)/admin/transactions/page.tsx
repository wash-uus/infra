'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paidBy: string;
  paidTo: string;
  jobId: string;
  stripePaymentIntentId?: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: AdminTransaction[];
  meta: { limit: number; total: number; nextCursor?: string };
}

const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-700',
  deposited:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  released:    'bg-green-200 text-green-800',
  disputed:    'bg-orange-100 text-orange-700',
  refunded:    'bg-red-100 text-red-700',
};

const REFUNDABLE = new Set(['completed', 'released', 'deposited', 'in_progress']);

export default function AdminTransactionsPage() {
  const queryClient = useQueryClient();
  const [cursor, setCursor]   = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]); // stack for back navigation
  const [status, setStatus]   = useState('');
  const [refunding, setRefunding] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-transactions', cursor, status],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (status) params.set('status', status);
      if (cursor) params.set('cursor', cursor);
      const res = await api.get<ApiResponse>(`/admin/transactions?${params}`);
      return res.data;
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/admin/transactions/${id}/refund`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      setRefunding(null);
    },
  });

  const transactions = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const nextCursor = data?.meta.nextCursor;

  function goNext() {
    if (!nextCursor) return;
    setCursors((prev) => [...prev, cursor ?? '']);
    setCursor(nextCursor);
  }
  function goPrev() {
    const prev = [...cursors];
    const last = prev.pop();
    setCursors(prev);
    setCursor(last || undefined);
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total transactions</p>
      </div>

      <div className="mb-6">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setCursor(undefined); setCursors([]); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-infra-primary"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="deposited">Deposited</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="released">Released</option>
          <option value="disputed">Disputed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Amount', 'Method', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{t.id.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {t.currency} {(t.amount / 100).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-gray-500">{t.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {REFUNDABLE.has(t.status) && (
                      <button
                        onClick={() => {
                          const reason = window.prompt('Refund reason (optional):') ?? 'Admin refund';
                          if (reason !== null) {
                            refundMutation.mutate({ id: t.id, reason });
                            setRefunding(t.id);
                          }
                        }}
                        disabled={refunding === t.id || refundMutation.isPending}
                        className="flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">No transactions found.</td>
                </tr>
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


'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Shield } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ModerationItem {
  id: string;
  type: 'job' | 'tool';
  targetId: string;
  title?: string;
  description?: string;
  status: string;
  submittedBy: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: ModerationItem[];
  meta: { limit: number; total: number; nextCursor?: string };
}

export default function AdminModerationPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [cursor, setCursor]         = useState<string | undefined>();
  const [cursors, setCursors]       = useState<string[]>([]);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-moderation', typeFilter, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (cursor) params.set('cursor', cursor);
      const res = await api.get<ApiResponse>(`/admin/moderation?${params}`);
      return res.data;
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ id, decision, reason }: { id: string; decision: 'approve' | 'reject'; reason: string }) => {
      await api.post(`/admin/moderation/${id}`, { decision, reason });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-moderation'] }),
  });

  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const nextCursor = data?.meta.nextCursor;

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

  function handleDecision(id: string, decision: 'approve' | 'reject') {
    const reason = decision === 'reject'
      ? window.prompt('Rejection reason (required):')
      : '';
    if (reason === null) return; // cancelled
    moderateMutation.mutate({ id, decision, reason: reason ?? '' });
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-infra-primary" /> Moderation Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500">{total} items pending review</p>
        </div>

        <div className="flex gap-2">
          {(['all', 'job', 'tool'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setCursor(undefined); setCursors([]); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                typeFilter === t
                  ? 'bg-infra-primary text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      item.type === 'job' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>

                  {item.title && (
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    Submitted by: <span className="font-mono">{item.submittedBy?.slice(0, 12)}…</span>
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleDecision(item.id, 'approve')}
                    disabled={moderateMutation.isPending}
                    className="flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, 'reject')}
                    disabled={moderateMutation.isPending}
                    className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-400">No items pending moderation.</p>
            </div>
          )}

          {(cursors.length > 0 || nextCursor) && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button disabled={cursors.length === 0} onClick={goPrev} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={!nextCursor} onClick={goNext} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

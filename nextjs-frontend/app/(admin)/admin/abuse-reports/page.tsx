'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Flag } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AbuseReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportedItemType: string;
  reportedItemId: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: AbuseReport[];
  meta: { limit: number; total: number; nextCursor?: string };
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  resolved:  'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
};

export default function AbuseReportsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter]   = useState('pending');
  const [cursor, setCursor]   = useState<string | undefined>();
  const [cursors, setCursors] = useState<string[]>([]);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-abuse-reports', filter, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '25', status: filter });
      if (cursor) params.set('cursor', cursor);
      const res = await api.get<ApiResponse>(`/admin/abuse-reports?${params}`);
      return res.data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action, resolution }: { id: string; action: 'resolve' | 'dismiss'; resolution: string }) => {
      await api.post(`/admin/abuse-reports/${id}/resolve`, { action, resolution });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-abuse-reports'] }),
  });

  const reports = data?.data ?? [];
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

  function handleAction(id: string, action: 'resolve' | 'dismiss') {
    const resolution = window.prompt(
      action === 'resolve'
        ? 'Resolution notes (describe action taken):'
        : 'Dismiss reason:',
    );
    if (resolution === null) return; // cancelled
    resolveMutation.mutate({ id, action, resolution });
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Flag className="h-6 w-6 text-red-500" /> Abuse Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">{total} {filter} reports</p>
        </div>

        <div className="flex gap-2">
          {(['pending', 'resolved', 'dismissed', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setCursor(undefined); setCursors([]); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-infra-primary text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
                      {r.reportedItemType}
                    </span>
                    <span className="text-xs text-gray-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-gray-900">{r.reason}</p>
                  {r.details && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{r.details}</p>
                  )}

                  <div className="mt-3 flex gap-4 text-xs text-gray-400">
                    <span>Reporter: <span className="font-mono">{r.reporterId?.slice(0, 10)}…</span></span>
                    <span>Reported: <span className="font-mono">{r.reportedUserId?.slice(0, 10)}…</span></span>
                    {r.reportedItemId && (
                      <span>Item: <span className="font-mono">{r.reportedItemId.slice(0, 10)}…</span></span>
                    )}
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleAction(r.id, 'resolve')}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </button>
                    <button
                      onClick={() => handleAction(r.id, 'dismiss')}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {reports.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              No {filter} reports.
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

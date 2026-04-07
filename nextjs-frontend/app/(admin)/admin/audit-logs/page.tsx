'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface ApiResponse {
  success: boolean;
  data: AuditLog[];
  meta: { page: number; limit: number; total: number };
}

const ACTION_COLOR: Record<string, string> = {
  'user.ban':                'bg-red-100 text-red-700',
  'user.unban':              'bg-green-100 text-green-700',
  'user.verify':             'bg-blue-100 text-blue-700',
  'user.role_change':        'bg-purple-100 text-purple-700',
  'job.remove':              'bg-red-100 text-red-700',
  'job.feature':             'bg-yellow-100 text-yellow-700',
  'tool.remove':             'bg-red-100 text-red-700',
  'tool.feature':            'bg-yellow-100 text-yellow-700',
  'notification.broadcast':  'bg-infra-primary/10 text-infra-primary',
  'system.view_metrics':     'bg-gray-100 text-gray-600',
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-audit-logs', page],
    queryFn: async () => {
      const res = await api.get<ApiResponse>(`/admin/audit-logs?page=${page}&limit=25`);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const logs  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.ceil(total / 25);

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Activity className="h-6 w-6 text-infra-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} actions recorded</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {log.action}
                  </span>
                  {log.targetId && (
                    <span className="text-xs font-mono text-gray-400">
                      → {log.targetType}: {log.targetId.slice(0, 12)}…
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-gray-400">{log.adminId.slice(0, 12)}…</p>
                  <p className="text-xs text-gray-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
              No audit logs yet.
            </div>
          )}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

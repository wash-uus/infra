'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface AdminJob {
  id: string;
  title: string;
  postedBy: string;
  status: string;
  listingType: string;
  isFeatured: boolean;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: AdminJob[];
  meta: { page: number; limit: number; total: number };
}

const STATUS_BADGE: Record<string, string> = {
  posted:     'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  archived:   'bg-gray-100 text-gray-500',
  completed:  'bg-blue-100 text-blue-700',
};

export default function AdminJobsPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-jobs', page, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      const res = await api.get<ApiResponse>(`/admin/jobs?${params}`);
      return res.data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-jobs'] });

  const feature = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      api.patch(`/admin/jobs/${id}/feature`, { featured }),
    onSuccess: () => { toast.success('Job updated'); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/jobs/${id}`),
    onSuccess: () => { toast.success('Job removed'); invalidate(); },
    onError:   () => toast.error('Failed to remove job'),
  });

  const setJobStatus = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) =>
      api.patch(`/admin/jobs/${id}/status`, { status: s }),
    onSuccess: () => { toast.success('Job status updated'); invalidate(); },
  });

  const jobs  = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pages = Math.ceil(total / 20);

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total jobs</p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-infra-primary"
        >
          <option value="">All statuses</option>
          <option value="posted">Posted</option>
          <option value="cancelled">Cancelled</option>
          <option value="archived">Archived</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Title', 'Type', 'Status', 'Featured', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{j.title || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize text-gray-500">{j.listingType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[j.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => feature.mutate({ id: j.id, featured: !j.isFeatured })}
                      title={j.isFeatured ? 'Unfeature' : 'Feature'}
                      className={`rounded-lg p-1.5 transition ${j.isFeatured ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-300 hover:bg-gray-50'}`}
                    >
                      <Star className="h-4 w-4" fill={j.isFeatured ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {j.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setJobStatus.mutate({ id: j.id, s: 'cancelled' })}
                        >
                          Cancel
                        </Button>
                      )}
                      {j.status !== 'posted' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setJobStatus.mutate({ id: j.id, s: 'posted' })}
                        >
                          Restore
                        </Button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Permanently archive this job?')) remove.mutate(j.id);
                        }}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400">No jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <span className="text-xs text-gray-500">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

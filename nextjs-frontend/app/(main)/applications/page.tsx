'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  applicantName?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter?: string;
  proposedRate?: number;
  currency?: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  pending: 'warning',
  reviewed: 'info',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'default',
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const res = await api.get('/jobs/applications/mine');
      return res.data.data;
    },
    enabled: !!user,
  });

  const withdrawMutation = useMutation({
    mutationFn: (appId: string) => api.put(`/jobs/applications/${appId}/status`, { status: 'withdrawn' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-applications'] });
      toast.success('Application withdrawn.');
    },
    onError: () => toast.error('Failed to withdraw application. Please try again.'),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">My Applications</h1>

      {isLoading ? (
        <div className="flex justify-center mt-16"><LoadingSpinner size="lg" /></div>
      ) : !applications || applications.length === 0 ? (
        <div className="mt-16 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <p className="text-gray-400 mb-4">You haven&apos;t applied to any jobs yet.</p>
          <Link href="/jobs"><Button>Browse Jobs</Button></Link>
        </div>
      ) : (
        <div className="space-y-5">
          {applications.map((app) => (
            <div key={app.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/jobs/${app.jobId}`}
                      className="font-semibold text-gray-900 hover:text-infra-primary transition-colors"
                    >
                      {app.jobTitle ?? `Job #${app.jobId.slice(-6)}`}
                    </Link>
                    <Badge variant={STATUS_BADGE[app.status] ?? 'default'} className="capitalize">
                      {app.status}
                    </Badge>
                  </div>
                  {app.coverLetter && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{app.coverLetter}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {app.proposedRate && (
                    <p className="text-sm font-medium text-gray-900">{app.currency ?? 'KES'} {app.proposedRate.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(app.createdAt)}</p>
                  {app.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="danger"
                      className="mt-2 min-h-[44px] text-xs"
                      loading={withdrawMutation.isPending && withdrawMutation.variables === app.id}
                      onClick={() => {
                        if (confirm('Withdraw this application?')) withdrawMutation.mutate(app.id);
                      }}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import api from '@/lib/api';
import { JobApplication, UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  pending: 'warning',
  reviewed: 'info',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'default',
};

export default function JobApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: job } = useQuery({
    queryKey: ['job-title', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data.data as { title: string; postedBy: string };
    },
  });

  const { data: applications, isLoading } = useQuery<JobApplication[]>({
    queryKey: ['job-applications', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}/applications`);
      return res.data.data;
    },
    enabled: !!user,
  });

  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) =>
      api.put(`/jobs/applications/${appId}/status`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['job-applications', id] });
      toast.success(`Application ${vars.status}.`);
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={`/jobs/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Job
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
        {job && <p className="mt-1 text-sm text-gray-500">{job.title}</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-16"><LoadingSpinner size="lg" /></div>
      ) : !applications || applications.length === 0 ? (
        <div className="mt-16 text-center">
          <User className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">No applications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-infra-primary/10 text-infra-primary font-semibold shrink-0">
                      {(app.applicantName ?? 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{app.applicantName}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(app.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE[app.status] ?? 'default'} className="capitalize shrink-0">
                    {app.status}
                  </Badge>
                </div>

                {app.coverLetter && (
                  <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{app.coverLetter}</p>
                )}

                {app.proposedRate && (
                  <p className="mt-2 text-sm font-medium text-gray-800">
                    Proposed: {formatCurrency(app.proposedRate, app.currency ?? 'KES')}
                  </p>
                )}

                {app.status === 'pending' || app.status === 'reviewed' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/profile/${app.applicantId}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> View Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      loading={statusMutation.isPending && (statusMutation.variables as any)?.appId === app.id && (statusMutation.variables as any)?.status === 'accepted'}
                      onClick={() => statusMutation.mutate({ appId: app.id, status: 'accepted' })}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="gap-1"
                      loading={statusMutation.isPending && (statusMutation.variables as any)?.appId === app.id && (statusMutation.variables as any)?.status === 'rejected'}
                      onClick={() => statusMutation.mutate({ appId: app.id, status: 'rejected' })}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                    {app.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={() => statusMutation.mutate({ appId: app.id, status: 'reviewed' })}
                      >
                        <Clock className="h-3.5 w-3.5" /> Mark Reviewed
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <Link href={`/profile/${app.applicantId}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> View Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

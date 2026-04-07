'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Clock, DollarSign, Users, Star, Shield, Bookmark, BookmarkCheck,
  ArrowLeft, Send, Pencil, Trash2, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Job } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/lib/analytics';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConversionNudge from '@/components/ui/ConversionNudge';
import { useConversionNudge } from '@/hooks/useConversionNudge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  hiring: 'Hiring',
  offering: 'Service Offered',
  seeking: 'Seeking Work',
};

const TYPE_BADGE: Record<string, 'default' | 'success' | 'info'> = {
  hiring: 'info',
  offering: 'success',
  seeking: 'default',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [showTxForm, setShowTxForm] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txProfessionalId, setTxProfessionalId] = useState('');
  const { nudge, triggerNudge, clearNudge } = useConversionNudge();

  const { data: job, isLoading } = useQuery<Job & { isBookmarked?: boolean }>({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data.data;
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/jobs/${id}/bookmark`),
    onSuccess: (res) => {
      qc.setQueryData<Job & { isBookmarked?: boolean }>(['job', id], (old) =>
        old ? { ...old, isBookmarked: res.data.bookmarked } : old
      );
    },
    onError: () => toast.error('Failed to update bookmark.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/jobs/${id}`),
    onSuccess: () => router.push('/jobs'),
    onError: () => toast.error('Failed to delete listing.'),
  });

  const txMutation = useMutation({
    mutationFn: () =>
      api.post('/transactions', {
        jobId: id,
        professionalId: txProfessionalId,
        amount: parseFloat(txAmount),
        currency: job?.currency ?? 'KES',
        description: `Payment for: ${job?.title}`,
      }),
    onSuccess: (res) => {
      analytics.transactionCreated(res.data.data?.id, parseFloat(txAmount), job?.currency ?? 'KES');
      setShowTxForm(false);
      setTxAmount('');
      toast.success('Transaction created! Go to Transactions to make payment.');
      router.push('/transactions');
    },
    onError: () => toast.error('Failed to create transaction. Please try again.'),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      api.post(`/jobs/${id}/apply`, {
        coverLetter,
        proposedRate: proposedBudget ? parseFloat(proposedBudget) : undefined,
      }),
    onSuccess: () => {
      analytics.jobApplied(id, job?.title);
      setApplying(false);
      setCoverLetter('');
      setProposedBudget('');
      qc.invalidateQueries({ queryKey: ['job', id] });
      toast.success('Application submitted successfully!');
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      if (code === 'APPLICATION_LIMIT_HIT' || code === 'LIMIT_HIT') {
        triggerNudge('LIMIT_HIT', { context: 'apply' });
      } else {
        toast.error(err?.response?.data?.message ?? 'Failed to submit application');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Job not found.</p>
        <Link href="/jobs"><Button variant="outline">Back to Jobs</Button></Link>
      </div>
    );
  }

  const isOwner = user?.uid === job.postedBy;
  const isBookmarked = job.isBookmarked ?? false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back */}
      <Link href="/jobs" className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-infra-primary">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Jobs
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant={TYPE_BADGE[job.listingType] ?? 'default'}>
                      {TYPE_LABELS[job.listingType]}
                    </Badge>
                    {job.isFeatured && <Badge variant="warning">Featured</Badge>}
                    {job.isVerified && (
                      <Badge variant="success">
                        <Shield className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Posted by {job.postedByName} · {formatRelativeTime(job.createdAt)}
                  </p>
                </div>

                {user && !isOwner && (
                  <button
                    onClick={() => bookmarkMutation.mutate()}
                    className="shrink-0 rounded-xl p-2.5 text-gray-400 transition-all hover:bg-infra-primary/5 hover:text-infra-primary"
                  >
                    {isBookmarked
                      ? <BookmarkCheck className="h-5 w-5 text-infra-primary" />
                      : <Bookmark className="h-5 w-5" />}
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                {(job.location || job.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {[job.location, job.country].filter(Boolean).join(', ')}
                    {job.isRemote && ' · Remote OK'}
                  </span>
                )}
                {job.budget && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    {formatCurrency(job.budget, job.currency)}
                  </span>
                )}
                {job.deadline && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    Deadline: {new Date(job.deadline).toISOString().split('T')[0]}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  {job.applicationsCount ?? 0} applicants
                </span>
              </div>

              <hr className="my-5" />

              <div className="prose prose-sm max-w-none text-gray-700">
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.requirements && job.requirements.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 font-semibold text-gray-800">Requirements</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                    {job.requirements.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {isOwner ? (
                <div className="mt-6 flex gap-3 flex-wrap">
                  <Link href={`/jobs/${id}/applicants`}>
                    <Button variant="outline" className="gap-1">
                      <Users className="h-4 w-4" /> View Applicants
                      {job.applicationsCount > 0 && (
                        <span className="ml-1 rounded-full bg-infra-primary/10 px-1.5 py-0.5 text-xs font-medium text-infra-primary">
                          {job.applicationsCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href={`/jobs/${id}/edit`}>
                    <Button variant="outline" className="gap-1">
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="gap-1"
                    onClick={() => {
                      if (confirm('Delete this job posting?')) deleteMutation.mutate();
                    }}
                    loading={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              ) : user ? (
                applying ? (
                  <div className="mt-6 space-y-3">
                    <textarea
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                      rows={4}
                      placeholder="Cover letter (optional)..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                      placeholder={`Your proposed budget (${job.currency ?? 'KES'})`}
                      value={proposedBudget}
                      onChange={(e) => setProposedBudget(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => applyMutation.mutate()}
                        loading={applyMutation.isPending}
                        className="gap-1"
                      >
                        <Send className="h-4 w-4" /> Submit Application
                      </Button>
                      <Button variant="ghost" onClick={() => setApplying(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button className="mt-6" onClick={() => setApplying(true)}>
                    Apply Now
                  </Button>
                )
              ) : (
                <Link href="/login" className="mt-6 inline-block">
                  <Button>Sign in to Apply</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: poster info */}
        <div>
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold text-gray-800">Posted By</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-infra-primary to-infra-primary text-white font-semibold shadow-md shadow-infra-primary/20">
                  {(job.postedByName ?? 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{job.postedByName}</p>
                </div>
              </div>
              {user && !isOwner && (
                <Link href={`/profile/${job.postedBy}`} className="mt-4 block">
                  <Button variant="outline" className="w-full text-sm">View Profile</Button>
                </Link>
              )}
              {user && !isOwner && (
                <Link href={`/messages?with=${job.postedBy}`} className="mt-2 block">
                  <Button variant="ghost" className="w-full text-sm">Send Message</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Create Transaction — shown to job owner when job is accepted */}
          {isOwner && (job.status === 'accepted' || job.status === 'in_progress') && (
            <Card className="mt-4 border-infra-primary/20 bg-infra-primary/5/40">
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-infra-primary" /> Payment
                </h3>
                {!showTxForm ? (
                  <>
                    <p className="mb-3 text-xs text-gray-500">
                      Create an escrow transaction to securely pay the professional.
                    </p>
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      onClick={() => setShowTxForm(true)}
                    >
                      <CreditCard className="h-4 w-4" /> Create Transaction
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Professional&apos;s User ID</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-infra-primary focus:outline-none"
                        placeholder="Paste professional's UID"
                        value={txProfessionalId}
                        onChange={(e) => setTxProfessionalId(e.target.value)}
                      />
                      <p className="mt-0.5 text-xs text-gray-400">
                        Find it on their profile page URL: /profile/[uid]
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Amount ({job.currency ?? 'KES'})
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-infra-primary focus:outline-none"
                        placeholder="e.g. 50000"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        loading={txMutation.isPending}
                        onClick={() => txMutation.mutate()}
                        disabled={!txProfessionalId || !txAmount}
                      >
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowTxForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {job.category && (
            <Card className="mt-4">
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-gray-800">Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Category</dt>
                    <dd className="font-medium">{job.category}</dd>
                  </div>
                  {job.disciplineId && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Discipline</dt>
                      <dd className="font-medium">{job.disciplineId}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Remote</dt>
                    <dd className="font-medium">{job.isRemote ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Conversion nudge — slides from bottom-right when user hits limit */}
      {nudge && (
        <ConversionNudge
          trigger={nudge.trigger}
          currentTier={(profile as any)?.subscription?.tier ?? 'free'}
          context={nudge.context}
          onDismiss={clearNudge}
        />
      )}
    </div>
  );
}

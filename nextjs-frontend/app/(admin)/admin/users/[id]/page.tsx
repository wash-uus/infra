'use client';

import { use } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ShieldCheck, Ban, CheckCircle2, Trash2,
  Star, Briefcase, Wrench,
} from 'lucide-react';
import api from '@/lib/api';
import Image from 'next/image';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface UserDetail {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  role: string;
  verificationStatus: string;
  subscription: { tier: string; status: string } | null;
  banned: boolean;
  deleted?: boolean;
  createdAt: string;
  lastLoginAt: string;
  totalJobs: number;
  totalTools: number;
  averageRating: number;
  totalReviews: number;
  bio?: string;
  photoURL?: string;
}

const TIER_BADGE: Record<string, string> = {
  free:      'bg-gray-100 text-gray-600',
  pro:       'bg-blue-100 text-blue-700',
  elite:     'bg-purple-100 text-purple-700',
  unlimited: 'bg-amber-100 text-amber-700',
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isSuperAdmin = (profile?.role as string) === 'superadmin';

  const [roleInput, setRoleInput] = useState('');

  const { data, isLoading } = useQuery<{ success: boolean; data: UserDetail }>({
    queryKey: ['admin-user-detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${id}`);
      return res.data;
    },
  });

  const user = data?.data;

  const banMutation = useMutation({
    mutationFn: async (action: 'ban' | 'unban') => {
      await api.post(`/admin/users/${id}/${action}`, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] }),
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/users/${id}/verify`, {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] }),
  });

  const roleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      await api.post(`/admin/users/${id}/role`, { role: newRole });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.delete(`/admin/users/${id}`, { data: { reason } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); router.push('/admin/users'); },
  });

  function handleRoleChange() {
    if (!roleInput) return;
    if (!window.confirm(`Change role to "${roleInput}"?`)) return;
    roleMutation.mutate(roleInput);
    setRoleInput('');
  }

  function handleDelete() {
    const reason = window.prompt('Delete reason (for audit log):');
    if (reason === null) return;
    if (!window.confirm('PERMANENTLY delete and anonymize this user? This cannot be undone.')) return;
    deleteMutation.mutate(reason);
  }

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!user) {
    return (
      <div className="px-8 py-12 text-center text-gray-400">
        User not found.
        <button onClick={() => router.back()} className="ml-2 text-infra-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* ── Header ── */}
      <div className="mb-8 flex items-start gap-4">
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-infra-primary/10 text-2xl font-bold text-infra-primary">
            {user.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">{user.role}</span>
            {user.subscription?.tier && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TIER_BADGE[user.subscription.tier] ?? 'bg-gray-100 text-gray-500'}`}>
                {user.subscription.tier}
              </span>
            )}
            {user.banned && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Banned</span>}
            {user.verificationStatus === 'verified' && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Jobs', value: user.totalJobs, icon: Briefcase },
          { label: 'Tools', value: user.totalTools, icon: Wrench },
          { label: 'Reviews', value: user.totalReviews, icon: Star },
          { label: 'Rating', value: user.averageRating ? `${user.averageRating.toFixed(1)}★` : 'N/A', icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <Icon className="mx-auto mb-1 h-4 w-4 text-gray-400" />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Meta ── */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Account Info</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="w-32 text-gray-500">UID</dt><dd className="font-mono text-gray-900 break-all">{user.uid}</dd></div>
          <div className="flex gap-2"><dt className="w-32 text-gray-500">Joined</dt><dd className="text-gray-900">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</dd></div>
          <div className="flex gap-2"><dt className="w-32 text-gray-500">Last login</dt><dd className="text-gray-900">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}</dd></div>
          <div className="flex gap-2"><dt className="w-32 text-gray-500">Verification</dt><dd className="capitalize text-gray-900">{user.verificationStatus}</dd></div>
          {user.bio && <div className="flex gap-2"><dt className="w-32 text-gray-500">Bio</dt><dd className="text-gray-900">{user.bio}</dd></div>}
        </dl>
      </div>

      {/* ── Actions ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Admin Actions</h2>

        {/* Ban / Unban */}
        <div className="flex gap-3">
          {user.banned ? (
            <button
              onClick={() => banMutation.mutate('unban')}
              disabled={banMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> Unban User
            </button>
          ) : (
            <button
              onClick={() => {
                if (window.confirm('Ban this user?')) banMutation.mutate('ban');
              }}
              disabled={banMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Ban className="h-4 w-4" /> Ban User
            </button>
          )}

          {user.verificationStatus !== 'verified' && (
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" /> Verify
            </button>
          )}
        </div>

        {/* Role Change (superadmin only) */}
        {isSuperAdmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Change Role</label>
            <div className="flex gap-2">
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-infra-primary"
              >
                <option value="">Select role…</option>
                <option value="user">User</option>
                <option value="professional">Professional</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <button
                onClick={handleRoleChange}
                disabled={!roleInput || roleMutation.isPending}
                className="rounded-xl bg-infra-primary px-4 py-2 text-sm font-medium text-white hover:bg-infra-primary/90 disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Delete (superadmin only) */}
        {isSuperAdmin && !user.deleted && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete & Anonymize User (GDPR)
            </button>
            <p className="mt-1 text-xs text-gray-400">This cannot be undone. PII will be anonymized.</p>
          </div>
        )}
      </div>
    </div>
  );
}

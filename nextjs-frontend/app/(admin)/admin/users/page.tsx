'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  ShieldOff,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  verificationStatus: string;
  banned: boolean;
  createdAt: string;
  totalJobs: number;
  totalTools: number;
}

interface ApiResponse {
  success: boolean;
  data: AdminUser[];
  meta: { limit: number; total: number; nextCursor?: string };
}

const ROLE_BADGE: Record<string, string> = {
  admin:        'bg-red-100 text-red-700',
  superadmin:   'bg-red-200 text-red-900 font-bold',
  professional: 'bg-blue-100 text-blue-700',
  client:       'bg-gray-100 text-gray-600',
  vendor:       'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  // cursorStack stores all cursors visited so far — last element is current page.
  // An empty stack means we are on the first page (cursor = undefined).
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1];
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('');

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['admin-users', currentCursor, role],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (role)          params.set('role', role);
      if (currentCursor) params.set('cursor', currentCursor);
      const res = await api.get<ApiResponse>(`/admin/users?${params}`);
      return res.data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const ban = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/users/${id}/ban`, { reason: 'Admin action' }),
    onSuccess: () => { toast.success('User banned'); invalidate(); },
    onError:   () => toast.error('Failed to ban user'),
  });

  const unban = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/unban`),
    onSuccess: () => { toast.success('User unbanned'); invalidate(); },
    onError:   () => toast.error('Failed to unban user'),
  });

  const verify = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/users/${id}/verify`, { level: 'identity_verified' }),
    onSuccess: () => { toast.success('User verified'); invalidate(); },
    onError:   () => toast.error('Failed to verify user'),
  });

  const users = (data?.data ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const total = data?.meta.total ?? 0;
  const nextCursor = data?.meta.nextCursor;
  const hasPrev = cursorStack.length > 1;

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">{total.toLocaleString()} total users</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-infra-primary focus:ring-1 focus:ring-infra-primary"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setCursorStack([]); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-infra-primary"
        >
          <option value="">All roles</option>
          <option value="client">Client</option>
          <option value="professional">Professional</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['User', 'Role', 'Status', 'Verification', 'Jobs/Tools', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={u.banned ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="hover:text-infra-primary transition-colors">
                      <div className="font-medium text-gray-900 text-sm">{u.displayName || '—'}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <ShieldOff className="h-3 w-3" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Shield className="h-3 w-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 capitalize">
                      {u.verificationStatus?.replace(/_/g, ' ') ?? 'unverified'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.totalJobs} / {u.totalTools}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.verificationStatus === 'unverified' && !u.banned && (
                        <button
                          onClick={() => verify.mutate(u.id)}
                          title="Verify user"
                          className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {u.banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unban.mutate(u.id)}
                        >
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Ban ${u.displayName || u.email}?`)) {
                              ban.mutate(u.id);
                            }
                          }}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Cursor pagination */}
          {(hasPrev || nextCursor) && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <span className="text-xs text-gray-500">
                {total.toLocaleString()} total
              </span>
              <div className="flex gap-2">
                <button
                  disabled={!hasPrev}
                  onClick={() => setCursorStack((s) => s.slice(0, -1))}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={!nextCursor}
                  onClick={() => nextCursor && setCursorStack((s) => [...s, nextCursor])}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
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

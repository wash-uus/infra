'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, Briefcase, Wrench, CreditCard, MessageSquare, Users, Star, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Link from 'next/link';

interface AppNotification {
  id: string;
  type: 'message' | 'job_update' | 'tool_update' | 'transaction' | 'application' | 'connection' | 'review' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  message: MessageSquare,
  job_update: Briefcase,
  tool_update: Wrench,
  transaction: CreditCard,
  application: Briefcase,
  connection: Users,
  review: Star,
  system: Info,
};

const TYPE_COLOR: Record<string, string> = {
  message: 'bg-infra-primary/10 text-infra-primary',
  job_update: 'bg-indigo-100 text-indigo-600',
  tool_update: 'bg-orange-100 text-orange-600',
  transaction: 'bg-green-100 text-green-600',
  application: 'bg-purple-100 text-purple-600',
  connection: 'bg-teal-100 text-teal-600',
  review: 'bg-yellow-100 text-yellow-600',
  system: 'bg-gray-100 text-gray-600',
};

function getNotifLink(notif: AppNotification): string | null {
  const d = notif.data ?? {};
  if (d.jobId) return `/jobs/${d.jobId}`;
  if (d.transactionId) return `/transactions`;
  if (d.applicationId && d.jobId) return `/jobs/${d.jobId}`;
  if (notif.type === 'message') return '/messages';
  if (notif.type === 'connection') return '/profile';
  return null;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { pageSize: 50 } });
      return res.data.data;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => toast.error('Failed to mark notifications as read.'),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => {},
  });

  if (!user) return null;

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-infra-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-infra-primary px-1.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-16"><LoadingSpinner size="lg" /></div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <BellOff className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No notifications yet.</p>
          <p className="text-sm text-gray-400">
            You&apos;ll be notified about job applications, messages, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => {
            const Icon = TYPE_ICON[notif.type] ?? Info;
            const iconCls = TYPE_COLOR[notif.type] ?? 'bg-gray-100 text-gray-600';
            const link = getNotifLink(notif);

            const content = (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl px-4 py-3 transition-colors',
                  notif.isRead
                    ? 'bg-white hover:bg-gray-50'
                    : 'bg-infra-primary/60-pct hover:bg-infra-primary/5',
                )}
              >
                <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconCls)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', notif.isRead ? 'font-normal text-gray-700' : 'font-semibold text-gray-900')}>
                    {notif.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{notif.body}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-infra-primary" aria-hidden />
                )}
              </div>
            );

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead && !markOneMutation.isPending) markOneMutation.mutate(notif.id);
                }}
                className="cursor-pointer"
              >
                {link ? <Link href={link}>{content}</Link> : content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

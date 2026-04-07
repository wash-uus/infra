'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Bell } from 'lucide-react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function AdminNotificationsPage() {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [topic, setTopic]   = useState('all_users');

  const broadcast = useMutation({
    mutationFn: () =>
      api.post('/admin/notifications/broadcast', { title, body, topic }),
    onSuccess: () => {
      toast.success('Broadcast notification sent!');
      setTitle('');
      setBody('');
    },
    onError: () => toast.error('Failed to send notification'),
  });

  const remaining = 500 - body.length;

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Broadcast Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send a push notification to all users or a specific topic via FCM.
        </p>
      </div>

      <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-infra-primary/10 p-3">
            <Bell className="h-5 w-5 text-infra-primary" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">New Broadcast</p>
            <p className="text-xs text-gray-400">Sends to all FCM-subscribed users</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="e.g. Platform Update"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-infra-primary focus:ring-1 focus:ring-infra-primary"
            />
            <p className="mt-1 text-xs text-gray-400">{100 - title.length} chars remaining</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Notification body text…"
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-infra-primary focus:ring-1 focus:ring-infra-primary"
            />
            <p className={`mt-1 text-xs ${remaining < 50 ? 'text-red-500' : 'text-gray-400'}`}>
              {remaining} chars remaining
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-infra-primary"
            >
              <option value="all_users">All Users</option>
              <option value="professionals">Professionals</option>
              <option value="clients">Clients</option>
              <option value="vendors">Vendors</option>
            </select>
          </div>

          <Button
            onClick={() => {
              if (!title.trim() || !body.trim()) {
                toast.error('Title and message are required');
                return;
              }
              if (confirm(`Send broadcast to topic "${topic}"?`)) {
                broadcast.mutate();
              }
            }}
            loading={broadcast.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4" /> Send Broadcast
          </Button>
        </div>
      </div>
    </div>
  );
}

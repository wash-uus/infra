'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Flag } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ReportModalProps {
  /** The type of item being reported */
  itemType: 'user' | 'job' | 'tool';
  /** The Firestore document ID of the item */
  itemId: string;
  /** Optional display name for context */
  itemTitle?: string;
  onClose: () => void;
}

const REASONS: Record<ReportModalProps['itemType'], string[]> = {
  user: [
    'Harassment or bullying',
    'Spam or fake account',
    'Impersonation',
    'Hate speech or discrimination',
    'Inappropriate content',
    'Scam or fraud',
    'Other',
  ],
  job: [
    'Misleading job description',
    'Spam or duplicate post',
    'Discriminatory requirements',
    'Suspected scam',
    'Inappropriate content',
    'Other',
  ],
  tool: [
    'Misleading information',
    'Spam or duplicate listing',
    'Inappropriate content',
    'Copyright violation',
    'Other',
  ],
};

export default function ReportModal({ itemType, itemId, itemTitle, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/abuse-reports', {
        reportedItemType: itemType,
        reportedItemId: itemId,
        reason,
        details,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-900">Report {itemType}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Flag className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Report submitted</p>
            <p className="text-sm text-gray-500">Our team will review this report and take appropriate action.</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-infra-primary px-6 py-2 text-sm font-medium text-white hover:bg-infra-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {itemTitle && (
              <p className="text-sm text-gray-500 truncate">
                Reporting: <span className="font-medium text-gray-900">{itemTitle}</span>
              </p>
            )}

            {/* Reason */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason *</label>
              <div className="space-y-2">
                {REASONS[itemType].map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) => setReason(e.target.value)}
                      className="accent-infra-primary"
                    />
                    <span className="text-sm text-gray-700">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Additional details (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Describe the issue in more detail…"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-infra-primary transition-colors"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{details.length}/500</p>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600">Failed to submit report. Please try again.</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || mutation.isPending || !user}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>

            {!user && (
              <p className="text-center text-xs text-gray-400">You must be signed in to report content.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

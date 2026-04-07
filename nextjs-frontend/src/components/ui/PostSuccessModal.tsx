'use client';

/**
 * PostSuccessModal
 *
 * Shown immediately after a user publishes a job or tool listing.
 * Prompts them to share it to maximise reach.
 *
 * Usage:
 *   <PostSuccessModal
 *     isOpen={showShareModal}
 *     onClose={() => setShowShareModal(false)}
 *     type="job"
 *     entityId={newJobId}
 *     title={newJobTitle}
 *     referralCode={profile?.referralCode}
 *   />
 */

import { useState, useCallback } from 'react';
import { X, Share2, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildShareUrl, logShareEvent, ShareEntityType } from '@/lib/share';

export interface PostSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ShareEntityType;
  entityId: string;
  title: string;
  referralCode?: string;
}

const TYPE_LABELS: Record<ShareEntityType, { noun: string; verb: string; emoji: string }> = {
  job:     { noun: 'listing',  verb: 'get more applicants',   emoji: '🎉' },
  tool:    { noun: 'listing',  verb: 'reach more buyers',     emoji: '🔧' },
  profile: { noun: 'profile',  verb: 'attract more clients',  emoji: '🌟' },
};

const PATH_MAP: Record<ShareEntityType, string> = {
  job:     '/jobs',
  tool:    '/tools',
  profile: '/profile',
};

export default function PostSuccessModal({
  isOpen,
  onClose,
  type,
  entityId,
  title,
  referralCode,
}: PostSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl(`${PATH_MAP[type]}/${entityId}`, referralCode);
  const meta = TYPE_LABELS[type];

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      logShareEvent(type, entityId, 'copy');
      setTimeout(() => setCopied(false), 2_500);
    } catch {
      // Fallback for browsers that block clipboard in non-https or non-focus
    }
  }, [shareUrl, type, entityId]);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`Check out this ${type} listing on INFRA: ${title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    logShareEvent(type, entityId, 'whatsapp');
  }, [shareUrl, type, entityId, title]);

  const handleTwitter = useCallback(() => {
    const text = encodeURIComponent(`Just posted on INFRA: "${title}" — ${shareUrl} #INFRA`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
    logShareEvent(type, entityId, 'twitter');
  }, [shareUrl, type, entityId, title]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-infra-primary/5 to-infra-accent/5 px-6 pt-8 pb-6 text-center">
          <div className="mb-3 text-4xl">{meta.emoji}</div>
          <h2 className="text-xl font-bold text-gray-900">Your {meta.noun} is live!</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Share it to {meta.verb} faster.
          </p>
        </div>

        {/* Listing title preview */}
        <div className="mx-6 mt-4 rounded-xl bg-gray-50 px-4 py-3">
          <p className="truncate text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-0.5 truncate text-xs text-gray-400">{shareUrl}</p>
        </div>

        {/* Share buttons */}
        <div className="space-y-2.5 px-6 py-4">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex w-full items-center gap-3 rounded-xl bg-[#25D366]/10 px-4 py-3 text-sm font-medium text-[#128C7E] transition-colors hover:bg-[#25D366]/20"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share on WhatsApp
          </button>

          {/* Twitter/X */}
          <button
            onClick={handleTwitter}
            className="flex w-full items-center gap-3 rounded-xl bg-gray-900/5 px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-900/10"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X (Twitter)
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopy}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
              copied
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
            )}
          >
            {copied
              ? <Check className="h-5 w-5 shrink-0 text-emerald-500" />
              : <Copy className="h-5 w-5 shrink-0 text-gray-400" />}
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-infra-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Done — view your {meta.noun}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Briefcase, Wrench, MessageSquare, Bell, Star, Plus, Mail, Users, Link2, Check } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatRelativeTime } from '@/lib/utils';
import { buildShareUrl } from '@/lib/share';
import toast from 'react-hot-toast';

interface DashboardStats {
  jobsPosted: number;
  toolsListed: number;
  applicationsSubmitted: number;
  unreadNotifications: number;
  unreadMessages: number;
  recentTransactions: any[];
}

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: referralData } = useQuery<{
    referralCode: string;
    referralCount: number;
    referralUrl: string;
  }>({
    queryKey: ['my-referral'],
    queryFn: async () => {
      const res = await api.get('/users/me/referral');
      return res.data.data;
    },
    // Only fetch once the profile is loaded
    enabled: !!profile,
  });

  const referralUrl = referralData?.referralUrl ?? buildShareUrl('/', profile?.referralCode);

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Referral link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  }

  function shareOnWhatsApp() {
    const text = `Join me on INFRA — Kenya's platform for engineers and contractors:\n${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/search/dashboard/stats');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    { label: 'Jobs Posted', value: data?.jobsPosted ?? 0, icon: Briefcase, href: '/jobs?mine=true' },
    { label: 'Equipment Listed', value: data?.toolsListed ?? 0, icon: Wrench, href: '/tools?mine=true' },
    { label: 'Applications', value: data?.applicationsSubmitted ?? 0, icon: Briefcase, href: '/applications' },
    { label: 'Unread Messages', value: data?.unreadMessages ?? 0, icon: MessageSquare, href: '/messages' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.displayName?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="mt-1 text-gray-500">
            {profile?.role === 'professional' && 'Manage your profile, jobs, and projects.'}
            {profile?.role === 'client' && 'Post jobs and manage your hires.'}
            {profile?.role === 'vendor' && 'Manage your equipment listings.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/jobs/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Post a Job
            </Button>
          </Link>
          <Link href="/tools/new">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" /> List Equipment
            </Button>
          </Link>
        </div>
      </div>

      {/* Email verification banner */}
      {user && !user.emailVerified && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-infra-primary/20 bg-infra-primary/5 px-5 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-infra-primary/10">
              <Mail className="h-4.5 w-4.5 text-infra-primary" />
            </div>
            <p className="text-sm font-medium text-infra-primary">
              Please verify your email address. Check your inbox for the verification link.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                toast.success('Verification email resent!');
              }
            }}
          >
            Resend Email
          </Button>
        </div>
      )}

      {/* Verification banner */}
      {profile?.verificationStatus === 'unverified' && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Bell className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-amber-800">
              Your profile is not yet verified. Upload your ID to get a verification badge.
            </p>
          </div>
          <Link href="/profile#documents">
            <Button size="sm" variant="secondary">
              Verify now
            </Button>
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="stagger-children mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="group transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-infra-primary/5 transition-colors group-hover:bg-infra-primary/10">
                  <stat.icon className="h-5.5 w-5.5 text-infra-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Profile completion & recent activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-infra-primary text-lg font-bold text-white shadow-md shadow-infra-primary/20">
                {(profile?.displayName ?? 'U')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{profile?.displayName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant={profile?.verificationStatus === 'license_verified' ? 'success' : profile?.verificationStatus === 'identity_verified' ? 'info' : 'warning'}
                  >
                    {profile?.verificationStatus?.replace('_', ' ') ?? 'Unverified'}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {profile?.role}
                  </Badge>
                </div>
              </div>
            </div>

            {profile?.averageRating !== undefined && profile.averageRating > 0 && (
              <div className="mt-5 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-amber-700">{profile.averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({profile.totalReviews} reviews)</span>
              </div>
            )}

            <Link href="/profile" className="mt-5 block">
              <Button variant="outline" size="sm" className="w-full">
                Edit profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardContent className="py-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            {data?.recentTransactions?.length ? (
              <div className="mt-5 space-y-4">
                {data.recentTransactions.map((txn: any) => (
                  <div key={txn.id} className="flex items-center justify-between rounded-xl bg-infra-background px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{txn.jobTitle ?? txn.toolTitle ?? 'Transaction'}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{formatRelativeTime(txn.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {txn.currency} {txn.amount?.toFixed(2)}
                      </p>
                      <Badge variant={txn.status === 'released' ? 'success' : txn.status === 'pending' ? 'warning' : 'info'}>
                        {txn.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center">
                <p className="text-sm text-gray-400">No transactions yet.</p>
              </div>
            )}
            <Link href="/transactions" className="mt-5 inline-block text-sm font-semibold text-infra-secondary hover:underline">
              View all transactions →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Invite Friends — referral engine */}
      <Card className="mt-6">
        <CardContent className="py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-infra-primary/5">
                <Users className="h-5 w-5 text-infra-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Invite Friends &amp; Earn</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {referralData?.referralCount
                    ? `You've referred ${referralData.referralCount} person${referralData.referralCount !== 1 ? 's' : ''} so far.`
                    : 'Share your link and grow the INFRA community.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* WhatsApp share */}
              <button
                onClick={shareOnWhatsApp}
                className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>

              {/* Copy link */}
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>

          {/* Referral link preview */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
            <span className="flex-1 truncate font-mono text-xs text-gray-500">{referralUrl}</span>
            {referralData?.referralCode && (
              <span className="shrink-0 rounded-lg bg-infra-primary/10 px-2 py-0.5 text-xs font-semibold text-infra-primary">
                Code: {referralData.referralCode}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

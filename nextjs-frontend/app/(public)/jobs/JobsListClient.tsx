'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Job } from '@/types';
import JobCard from '@/components/jobs/JobCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface JobsPage {
  data: Job[];
  hasMore: boolean;
  nextCursor?: string;
}

interface Props {
  /** First page of jobs pre-fetched on the server for SEO crawlability. */
  initialJobs: Job[];
}

export default function JobsListClient({ initialJobs }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [listingType, setListingType] = useState('');

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useInfiniteQuery<JobsPage>({
      queryKey: ['jobs', { listingType, search }],
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string> = {};
        if (listingType) params.listingType = listingType;
        if (search) params.q = search;
        if (pageParam) params.cursor = pageParam as string;
        const res = await api.get('/jobs', { params });
        return res.data;
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // Use server-rendered initial data as placeholder while the real query loads.
      // This prevents the blank flash on first paint and gives crawlers real content.
      placeholderData: {
        pages: [{ data: initialJobs, hasMore: initialJobs.length >= 20, nextCursor: undefined }],
        pageParams: [undefined],
      },
    });

  const allJobs = data?.pages.flatMap((p) => p.data) ?? initialJobs;

  const TYPES = [
    { value: '', label: 'All' },
    { value: 'hiring', label: 'Hiring' },
    { value: 'offering', label: 'Services' },
    { value: 'seeking', label: 'Looking for Work' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-infra-secondary">Opportunities</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Jobs &amp; Services</h1>
          <p className="mt-1 text-gray-500">Engineering jobs, services, and opportunities</p>
        </div>
        {user && (
          <Link href="/jobs/new">
            <Button>Post a Job</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 hover:border-gray-300"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setListingType(t.value)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                listingType === t.value
                  ? 'border-infra-primary bg-infra-primary/5 text-infra-primary shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs grid */}
      {isLoading && allJobs.length === 0 ? (
        <div className="mt-16 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : allJobs.length === 0 ? (
        <div className="mt-16 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <p className="text-gray-400">No jobs found. Be the first to post one!</p>
          {user && (
            <Link href="/jobs/new" className="mt-4 inline-block">
              <Button>Post a Job</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

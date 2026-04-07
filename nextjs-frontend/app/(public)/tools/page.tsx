'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Tool } from '@/types';
import ToolCard from '@/components/tools/ToolCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface ToolsPage {
  data: Tool[];
  hasMore: boolean;
  nextCursor?: string;
}

const TYPES = [
  { value: '', label: 'All' },
  { value: 'selling', label: 'For Sale' },
  { value: 'renting', label: 'For Rent' },
  { value: 'wanted', label: 'Wanted' },
];

export default function ToolsPage() {
  const { user } = useAuth();
  const [listingType, setListingType] = useState('');

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useInfiniteQuery<ToolsPage>({
      queryKey: ['tools', { listingType }],
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string> = {};
        if (listingType) params.listingType = listingType;
        if (pageParam) params.cursor = pageParam as string;
        const res = await api.get('/tools', { params });
        return res.data;
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const allTools = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">Marketplace</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Equipment &amp; Tools</h1>
          <p className="mt-1 text-gray-500">Buy, rent, or find engineering equipment</p>
        </div>
        {user && (
          <Link href="/tools/new">
            <Button>List Equipment</Button>
          </Link>
        )}
      </div>

      {/* Type filter */}
      <div className="mt-8 flex flex-wrap gap-2">
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

      {isLoading ? (
        <div className="mt-16 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : allTools.length === 0 ? (
        <div className="mt-16 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <p className="text-gray-400">No equipment listed yet.</p>
          {user && (
            <Link href="/tools/new" className="mt-4 inline-block">
              <Button>List Equipment</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

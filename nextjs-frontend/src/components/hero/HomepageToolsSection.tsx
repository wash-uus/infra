'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Wrench } from 'lucide-react';
import axios from 'axios';
import ToolCard from '@/components/tools/ToolCard';
import { Tool } from '@/types';

// Uses public (unauthenticated) endpoint — no auth header needed, CDN-cacheable.
async function fetchFeaturedTools(): Promise<Tool[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  const res = await axios.get(`${base}/tools`, { params: { pageSize: 6 } });
  return res.data.data as Tool[];
}

const CATEGORIES = [
  { label: 'Surveying', value: 'surveying' },
  { label: 'Earthmoving', value: 'construction' },
  { label: 'Safety', value: 'safety' },
  { label: 'Measuring Tools', value: 'testing' },
  { label: 'Power Tools', value: 'construction' },
];

export default function HomepageToolsSection() {
  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ['homepage-tools'],
    queryFn: fetchFeaturedTools,
    staleTime: 60_000,
  });

  return (
    <section className="py-16 bg-infra-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-infra-secondary">
              Equipment Marketplace
            </p>
            <h2 className="mt-1 text-3xl font-bold text-gray-900">
              Buy, Rent &amp; Sell Construction Equipment
            </h2>
            <p className="mt-2 text-gray-500 max-w-xl">
              Kenya&apos;s largest infrastructure equipment marketplace — surveying gear, earthmovers, power tools and more.
            </p>
          </div>
          <Link
            href="/tools/new"
            className="inline-flex items-center gap-2 rounded-xl bg-infra-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-infra-secondary/20 transition-all hover:brightness-105"
          >
            <Wrench className="h-4 w-4" /> Sell Your Equipment
          </Link>
        </div>

        {/* Category pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/tools"
            className="rounded-full border border-infra-primary/20 bg-white px-4 py-1.5 text-xs font-medium text-infra-primary shadow-sm transition-colors hover:bg-infra-primary hover:text-white"
          >
            All Equipment
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={`/tools?category=${cat.value}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:border-infra-primary/30 hover:text-infra-primary"
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Tool grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
              ))
            : tools && tools.length > 0
            ? tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)
            : (
              <div className="col-span-full py-12 text-center text-gray-400">
                <Wrench className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <p>No equipment listed yet. Be the first to list!</p>
                <Link href="/tools/new" className="mt-3 inline-block text-sm font-medium text-infra-primary hover:underline">
                  List your equipment →
                </Link>
              </div>
            )}
        </div>

        {/* View all CTA */}
        {tools && tools.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-xl border border-infra-primary/20 bg-white px-6 py-2.5 text-sm font-semibold text-infra-primary shadow-sm transition-all hover:bg-infra-primary hover:text-white"
            >
              Browse all equipment <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

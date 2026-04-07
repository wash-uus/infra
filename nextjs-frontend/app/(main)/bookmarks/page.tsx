'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import api from '@/lib/api';
import { Job, Tool } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import JobCard from '@/components/jobs/JobCard';
import ToolCard from '@/components/tools/ToolCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type Tab = 'jobs' | 'equipment';

interface BookmarksData {
  jobs: Job[];
  tools: Tool[];
}

export default function BookmarksPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  const { data, isLoading } = useQuery<BookmarksData>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api.get('/users/me/bookmarks');
      return {
        jobs: res.data.data.jobs ?? [],
        tools: res.data.data.tools ?? [],
      };
    },
    enabled: !!user,
  });

  if (!user) return null;

  const jobs = data?.jobs ?? [];
  const tools = data?.tools ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-infra-primary/5">
          <Bookmark className="h-5 w-5 text-infra-primary" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Bookmarks</h1>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'jobs'
              ? 'border-infra-primary bg-infra-primary/5 text-infra-primary shadow-sm'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Jobs {jobs.length > 0 && `(${jobs.length})`}
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'equipment'
              ? 'border-infra-primary bg-infra-primary/5 text-infra-primary shadow-sm'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Equipment {tools.length > 0 && `(${tools.length})`}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center mt-16"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'jobs' ? (
        jobs.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        ) : (
          <div className="mt-16 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <p className="text-gray-400 mb-4">No bookmarked jobs yet.</p>
            <Link href="/jobs"><Button variant="outline">Browse Jobs</Button></Link>
          </div>
        )
      ) : (
        tools.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        ) : (
          <div className="mt-16 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <p className="text-gray-400 mb-4">No bookmarked equipment yet.</p>
            <Link href="/tools"><Button variant="outline">Browse Equipment</Button></Link>
          </div>
        )
      )}
    </div>
  );
}

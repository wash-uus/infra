'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon, Users, Briefcase, Wrench, SlidersHorizontal,
  X, MapPin, Star, CheckCircle, ChevronDown, ChevronUp, ArrowUpDown,
} from 'lucide-react';
import api from '@/lib/api';
import { Job, Tool, UserProfile } from '@/types';
import { analytics } from '@/lib/analytics';
import JobCard from '@/components/jobs/JobCard';
import ToolCard from '@/components/tools/ToolCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

type Tab = 'jobs' | 'equipment' | 'professionals';

interface SearchResults {
  jobs?: Job[];
  tools?: Tool[];
  users?: UserProfile[];
}

// ── Filter option constants ─────────────────────────────────────────────────
const JOB_CATEGORIES = [
  'Civil Engineering', 'Structural Engineering', 'Mechanical Engineering',
  'Electrical Engineering', 'Architecture', 'Surveying', 'Project Management',
  'Environmental Engineering', 'Other',
];

const JOB_LISTING_TYPES = [
  { value: 'hiring', label: 'Hiring' },
  { value: 'offering', label: 'Offering Service' },
  { value: 'seeking', label: 'Seeking Work' },
];

const TOOL_CATEGORIES = [
  'Surveying Equipment', 'Earthmoving Equipment', 'Concrete Equipment',
  'Lifting Equipment', 'Drilling Equipment', 'Compaction Equipment',
  'Safety Equipment', 'Measuring Tools', 'Power Tools', 'Other',
];

const TOOL_LISTING_TYPES = [
  { value: 'selling', label: 'For Sale' },
  { value: 'renting', label: 'For Rent' },
  { value: 'wanted', label: 'Wanted' },
];

const TOOL_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For Parts' },
];

const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior (0–3 yrs)' },
  { value: 'mid', label: 'Mid (3–7 yrs)' },
  { value: 'senior', label: 'Senior (7+ yrs)' },
];

const COUNTRIES = [
  'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'Nigeria',
  'South Africa', 'Ghana', 'Egypt', 'United States', 'United Kingdom',
  'India', 'UAE', 'Canada', 'Australia', 'Germany',
];

// ── Filters type ────────────────────────────────────────────────────────────
interface Filters {
  country: string;
  category: string;
  listingType: string;
  isRemote: boolean;
  minBudget: string;
  maxBudget: string;
  condition: string;
  verifiedOnly: boolean;
  experienceLevel: string;
  sort: string;
  nearMe?: boolean;
}

const DEFAULT_FILTERS: Filters = {
  country: '', category: '', listingType: '', isRemote: false,
  minBudget: '', maxBudget: '', condition: '', verifiedOnly: false,
  experienceLevel: '', sort: 'relevance',
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
    // Helper: calculate distance between two lat/lng points (Haversine)
    function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Near Me state
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lon: number } | null>(null);

  // When Near Me is pressed, get geolocation
  useEffect(() => {
    if (filters.nearMe) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setNearMeCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        });
      }
    } else {
      setNearMeCoords(null);
    }
  }, [filters.nearMe]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') ?? '';
  const initialTab = (searchParams.get('tab') as Tab) ?? 'equipment';
  const [q, setQ] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [inputValue, setInputValue] = useState(initialQ);
  const [showFilters, setShowFilters] = useState(false);

  // ── Search-as-you-type: debounce 400ms ──────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputValue.trim();
    if (trimmed.length >= 2) {
      debounceRef.current = setTimeout(() => {
        setQ(trimmed);
        const params = new URLSearchParams({ q: trimmed, tab: activeTab });
        router.replace(`/search?${params.toString()}`, { scroll: false });
      }, 400);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val !== '' && val !== false
  ).length;

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Build query params for API call
  const buildParams = useCallback(() => {
    const params: Record<string, string> = { q, type: activeTab };
    if (filters.country) params.country = filters.country;
    if (filters.category) params.category = filters.category;
    if (filters.listingType) params.listingType = filters.listingType;
    if (filters.isRemote) params.isRemote = 'true';
    if (filters.minBudget) params.minBudget = filters.minBudget;
    if (filters.maxBudget) params.maxBudget = filters.maxBudget;
    if (filters.condition) params.condition = filters.condition;
    if (filters.verifiedOnly) params.verifiedOnly = 'true';
    if (filters.experienceLevel) params.experienceLevel = filters.experienceLevel;
    if (filters.sort && filters.sort !== 'relevance') params.sort = filters.sort;
    return params;
  }, [q, activeTab, filters]);

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ['search', q, activeTab, filters],
    queryFn: async () => {
      if (!q) return {};
      const res = await api.get('/search', { params: buildParams() });
      return res.data.data;
    },
    enabled: !!q,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) analytics.searchStarted(trimmed, activeTab);
    setQ(trimmed);
    const params = new URLSearchParams({ q: trimmed, tab: activeTab });
    router.replace(`/search?${params.toString()}`);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Reset tab-specific filters when switching tabs
    setFilters((prev) => ({
      ...prev,
      category: '',
      listingType: '',
      isRemote: false,
      minBudget: '',
      maxBudget: '',
      condition: '',
      verifiedOnly: false,
      experienceLevel: '',
    }));
    if (q) {
      const params = new URLSearchParams({ q, tab });
      router.replace(`/search?${params.toString()}`);
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'equipment', label: 'Equipment', icon: Wrench },
    { id: 'professionals', label: 'Professionals', icon: Users },
  ];

  const jobs = data?.jobs ?? [];
  const tools = data?.tools ?? [];
  const users = ((data as any)?.profiles ?? data?.users ?? []) as UserProfile[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Search</h1>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm transition-all focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 hover:border-gray-300"
            placeholder="Search jobs, equipment, professionals..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-infra-primary to-infra-primary px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-infra-primary/20 transition-all hover:shadow-lg hover:shadow-infra-primary/25"
        >
          Search
        </button>
      </form>

      {/* Tabs + Filter toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === id
                  ? 'border-infra-primary bg-infra-primary/5 text-infra-primary shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? 'border-infra-primary bg-infra-primary/5 text-infra-primary'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-infra-primary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────────────────── */}
            {/* Add Near Me toggle to all tabs */}
            <div className="mt-2 mb-4 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filters.nearMe || false} onChange={e => updateFilter('nearMe', e.target.checked)} /> Near Me
              </label>
            </div>
      {showFilters && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-card animate-slide-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Filter {activeTab === 'jobs' ? 'Jobs' : activeTab === 'equipment' ? 'Equipment' : 'Professionals'}
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-medium text-infra-primary hover:text-infra-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear all filters
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Country — shared across all tabs */}
            <FilterSelect
              label="Country"
              value={filters.country}
              onChange={(v) => updateFilter('country', v)}
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              placeholder="Any country"
            />

            {/* ── Job-specific filters ────────────────────────────────── */}
            {activeTab === 'jobs' && (
              <>
                <FilterSelect
                  label="Listing Type"
                  value={filters.listingType}
                  onChange={(v) => updateFilter('listingType', v)}
                  options={JOB_LISTING_TYPES}
                  placeholder="All types"
                />
                <FilterSelect
                  label="Category"
                  value={filters.category}
                  onChange={(v) => updateFilter('category', v)}
                  options={JOB_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  placeholder="All categories"
                />
                <FilterToggle
                  label="Remote Only"
                  checked={filters.isRemote}
                  onChange={(v) => updateFilter('isRemote', v)}
                />
                <FilterInput
                  label="Min Budget"
                  type="number"
                  placeholder="e.g. 10000"
                  value={filters.minBudget}
                  onChange={(v) => updateFilter('minBudget', v)}
                />
                <FilterInput
                  label="Max Budget"
                  type="number"
                  placeholder="e.g. 500000"
                  value={filters.maxBudget}
                  onChange={(v) => updateFilter('maxBudget', v)}
                />
              </>
            )}

            {/* ── Equipment-specific filters ──────────────────────────── */}
            {activeTab === 'equipment' && (
              <>
                <FilterSelect
                  label="Listing Type"
                  value={filters.listingType}
                  onChange={(v) => updateFilter('listingType', v)}
                  options={TOOL_LISTING_TYPES}
                  placeholder="All types"
                />
                <FilterSelect
                  label="Category"
                  value={filters.category}
                  onChange={(v) => updateFilter('category', v)}
                  options={TOOL_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  placeholder="All categories"
                />
                <FilterSelect
                  label="Condition"
                  value={filters.condition}
                  onChange={(v) => updateFilter('condition', v)}
                  options={TOOL_CONDITIONS}
                  placeholder="Any condition"
                />
              </>
            )}

            {/* ── Professionals-specific filters ──────────────────────── */}
            {activeTab === 'professionals' && (
              <>
                <FilterSelect
                  label="Sort By"
                  value={filters.sort}
                  onChange={(v) => updateFilter('sort', v)}
                  options={[
                    { value: 'relevance', label: 'Best Match' },
                    { value: 'rating', label: 'Highest Rated' },
                    { value: 'experience', label: 'Most Experienced' },
                  ]}
                  placeholder="Best Match"
                />
                <FilterSelect
                  label="Experience Level"
                  value={filters.experienceLevel}
                  onChange={(v) => updateFilter('experienceLevel', v)}
                  options={EXPERIENCE_LEVELS}
                  placeholder="Any level"
                />
                <FilterToggle
                  label="Verified Only"
                  checked={filters.verifiedOnly}
                  onChange={(v) => updateFilter('verifiedOnly', v)}
                />
              </>
            )}
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {filters.country && (
                <FilterTag label={`Country: ${filters.country}`} onRemove={() => updateFilter('country', '')} />
              )}
              {filters.listingType && (
                <FilterTag label={`Type: ${filters.listingType}`} onRemove={() => updateFilter('listingType', '')} />
              )}
              {filters.category && (
                <FilterTag label={`Category: ${filters.category}`} onRemove={() => updateFilter('category', '')} />
              )}
              {filters.isRemote && (
                <FilterTag label="Remote Only" onRemove={() => updateFilter('isRemote', false)} />
              )}
              {filters.minBudget && (
                <FilterTag label={`Min: ${filters.minBudget}`} onRemove={() => updateFilter('minBudget', '')} />
              )}
              {filters.maxBudget && (
                <FilterTag label={`Max: ${filters.maxBudget}`} onRemove={() => updateFilter('maxBudget', '')} />
              )}
              {filters.condition && (
                <FilterTag label={`Condition: ${filters.condition}`} onRemove={() => updateFilter('condition', '')} />
              )}
              {filters.verifiedOnly && (
                <FilterTag label="Verified Only" onRemove={() => updateFilter('verifiedOnly', false)} />
              )}
              {filters.experienceLevel && (
                <FilterTag label={`Experience: ${filters.experienceLevel}`} onRemove={() => updateFilter('experienceLevel', '')} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      {!q ? (
        <p className="mt-16 text-center text-gray-400">Enter a search term to find jobs, equipment, or professionals.</p>
      ) : isLoading ? (
        <div className="flex justify-center mt-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Jobs tab */}
          {activeTab === 'jobs' && (
            <>
              <ResultCount count={jobs.length} label="job" />
              {jobs.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(filters.nearMe && nearMeCoords
                    ? [...jobs].sort((a, b) => {
                        // location is string: "lat,lng" or empty
                        const parseLoc = (loc: string) => {
                          if (!loc) return null;
                          const parts = loc.split(',').map(Number);
                          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] };
                          return null;
                        };
                        const aLoc = parseLoc(a.location);
                        const bLoc = parseLoc(b.location);
                        const aDist = aLoc ? getDistanceKm(nearMeCoords.lat, nearMeCoords.lon, aLoc.lat, aLoc.lng) : 99999;
                        const bDist = bLoc ? getDistanceKm(nearMeCoords.lat, nearMeCoords.lon, bLoc.lat, bLoc.lng) : 99999;
                        return aDist - bDist;
                      })
                    : jobs
                  ).map((job) => <JobCard key={job.id} job={job} />)}
                </div>
              ) : <EmptyState message="No jobs found. Try adjusting your search or filters." />}
            </>
          )}

          {/* Equipment tab */}
          {activeTab === 'equipment' && (
            <>
              <ResultCount count={tools.length} label="listing" />
              {tools.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(filters.nearMe && nearMeCoords
                    ? [...tools].sort((a, b) => {
                        const parseLoc = (loc: string) => {
                          if (!loc) return null;
                          const parts = loc.split(',').map(Number);
                          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] };
                          return null;
                        };
                        const aLoc = parseLoc(a.location);
                        const bLoc = parseLoc(b.location);
                        const aDist = aLoc ? getDistanceKm(nearMeCoords.lat, nearMeCoords.lon, aLoc.lat, aLoc.lng) : 99999;
                        const bDist = bLoc ? getDistanceKm(nearMeCoords.lat, nearMeCoords.lon, bLoc.lat, bLoc.lng) : 99999;
                        return aDist - bDist;
                      })
                    : tools
                  ).map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                </div>
              ) : <EmptyState message="No equipment found. Try adjusting your search or filters." />}
            </>
          )}

          {/* Professionals tab */}
          {activeTab === 'professionals' && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {users.length} professional{users.length !== 1 ? 's' : ''} found
                </p>
                {users.length > 1 && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {filters.sort === 'rating' ? 'Highest Rated' : filters.sort === 'experience' ? 'Most Experienced' : 'Best Match'}
                  </span>
                )}
              </div>
              {users.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(filters.nearMe && nearMeCoords
                    ? [...users].sort((a, b) => {
                        // Use cityLat/cityLng for proximity if available
                        const getLatLng = (u: UserProfile) => {
                          const lat = typeof u.cityLat === 'number' ? u.cityLat : null;
                          const lng = typeof u.cityLng === 'number' ? u.cityLng : null;
                          return lat !== null && lng !== null ? { lat, lng } : null;
                        };
                        const aLoc = getLatLng(a);
                        const bLoc = getLatLng(b);
                        const aDist = aLoc ? getDistanceKm(nearMeCoords.lat, nearMeCoords.lon, aLoc.lat, aLoc.lng) : 99999;
                        const bDist = bLoc ? getDistanceKm(nearMeCoords.lat, nearMeCoords.lon, bLoc.lat, bLoc.lng) : 99999;
                        return aDist - bDist;
                      })
                    : users
                  ).map((u) => <ProfessionalCard key={u.uid} profile={u} />)}
                </div>
              ) : <EmptyState message="No professionals found. Try adjusting your search or filters." />}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared filter components ────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FilterInput({ label, type, placeholder, value, onChange }: {
  label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10"
      />
    </div>
  );
}

function FilterToggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-end pb-1">
      <label className="flex cursor-pointer items-center gap-2.5">
        <div
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-infra-primary' : 'bg-gray-200'}`}
        >
          <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </label>
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-infra-primary/5 px-2.5 py-1 text-xs font-medium text-infra-primary">
      {label}
      <button onClick={onRemove} className="rounded p-0.5 hover:bg-infra-primary/10 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ResultCount({ count, label }: { count: number; label: string }) {
  return (
    <p className="mb-4 text-sm text-gray-500">
      {count} {label}{count !== 1 ? 's' : ''} found
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-12 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
      <SearchIcon className="mx-auto h-10 w-10 text-gray-300" />
      <p className="mt-3 text-gray-400">{message}</p>
    </div>
  );
}

function ProfessionalCard({ profile }: { profile: UserProfile }) {
  return (
    <Link href={`/profile/${profile.uid}`} className="group block">
      <div className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0">
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt={profile.displayName} fill className="rounded-2xl object-cover" sizes="48px" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-infra-primary to-infra-primary text-lg font-semibold text-white shadow-md shadow-infra-primary/20">
                {getInitials(profile.displayName)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 group-hover:text-infra-primary transition-colors">{profile.displayName}</p>
            <p className="truncate text-xs text-gray-500">
              {profile.jobTitle || profile.disciplines?.[0] || 'Professional'}
            </p>
          </div>
        </div>

        {/* Location + Rating */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {(profile.city || profile.country) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {[profile.city, profile.country].filter(Boolean).join(', ')}
            </span>
          )}
          {profile.averageRating > 0 && (
            <span className="flex items-center gap-1 font-semibold text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {profile.averageRating.toFixed(1)}
              <span className="font-normal text-gray-400">({profile.totalReviews})</span>
            </span>
          )}
          {profile.yearsExperience && profile.yearsExperience > 0 && (
            <span className="text-gray-400">{profile.yearsExperience} yrs exp</span>
          )}
        </div>

        {/* Disciplines */}
        {profile.disciplines && profile.disciplines.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {profile.disciplines.slice(0, 3).map((d: string) => (
              <Badge key={d} variant="default" className="text-[10px]">{d}</Badge>
            ))}
            {profile.disciplines.length > 3 && (
              <span className="text-[10px] text-gray-400 self-center">+{profile.disciplines.length - 3}</span>
            )}
          </div>
        )}

        {/* Verification + availability */}
        <div className="mt-3 flex items-center gap-3 text-xs">
          {profile.idVerified && (
            <span className="flex items-center gap-1 font-medium text-infra-primary">
              <CheckCircle className="h-3.5 w-3.5" /> Verified
            </span>
          )}
          {profile.availabilityStatus === 'available' && (
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
            </span>
          )}
          {profile.hourlyRate && (
            <span className="text-gray-500 ml-auto">${profile.hourlyRate}/hr</span>
          )}
        </div>
      </div>
    </Link>
  );
}

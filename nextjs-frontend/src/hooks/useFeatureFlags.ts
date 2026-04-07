'use client';

/**
 * useFeatureFlags
 *
 * Fetches feature flags from the public /api/config/features endpoint.
 * Cached for 5 minutes in-component — won't hammer the backend.
 *
 * Usage:
 *   const { flags, isLoading } = useFeatureFlags();
 *   if (flags.contactUnlock) { ... }
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface FeatureFlags {
  applicationLimits:  boolean;
  contactUnlock:      boolean;
  messagingGate:      boolean;
  boosts:             boolean;
  featuredListings:   boolean;
  referralSystem:     boolean;
  conversionTracking: boolean;
}

// All flags ON — safe fallback while loading or on error
const DEFAULT_FLAGS: FeatureFlags = {
  applicationLimits:  true,
  contactUnlock:      true,
  messagingGate:      true,
  boosts:             true,
  featuredListings:   true,
  referralSystem:     true,
  conversionTracking: true,
};

export function useFeatureFlags() {
  const { data, isLoading, isError } = useQuery<FeatureFlags>({
    queryKey: ['config', 'features'],
    queryFn: async () => {
      const res = await api.get('/config/features');
      return res.data.data as FeatureFlags;
    },
    staleTime: 5 * 60 * 1_000, // 5 minutes
    gcTime:    10 * 60 * 1_000,
    // Never throw — always return something usable
    retry: 1,
  });

  return {
    flags: data ?? DEFAULT_FLAGS,
    isLoading,
    isError,
  };
}

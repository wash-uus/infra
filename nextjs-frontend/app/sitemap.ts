import type { MetadataRoute } from 'next';
import { generateAllSlugs } from '@/lib/seo-slugs';
import { generateHireSlugs, generateJobSearchSlugs, generateToolBrowseSlugs } from '@/config/seoMatrix';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infra.co.ke';
const API_URL  = process.env.NEXT_PUBLIC_API_URL  ?? 'http://localhost:8000/api';

// ── Static pages ──────────────────────────────────────────────────────────────
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/tools`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
];

/** Fetch a list endpoint defensively — returns [] on any error (build must not fail). */
async function safeFetch<T>(url: string, key: string): Promise<T[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json[key] ?? json.data ?? []) as T[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Programmatic SEO pages (discipline × location matrix)
  const seoPages: MetadataRoute.Sitemap = generateAllSlugs().map((slug) => ({
    url: `${BASE_URL}/find/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic content — limit to 500 entries each to keep sitemap size reasonable
  const [jobs, tools] = await Promise.all([
    safeFetch<{ id: string; updatedAt?: string }>(`${API_URL}/jobs?status=posted&pageSize=500`, 'data'),
    safeFetch<{ id: string; updatedAt?: string }>(`${API_URL}/tools?pageSize=500`, 'data'),
  ]);

  const jobPages: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${BASE_URL}/jobs/${j.id}`,
    lastModified: j.updatedAt ? new Date(j.updatedAt) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const toolPages: MetadataRoute.Sitemap = tools.map((t) => ({
    url: `${BASE_URL}/tools/${t.id}`,
    lastModified: t.updatedAt ? new Date(t.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Programmatic SEO pages for hire / job-search / tool-browse routes
  const hirePages: MetadataRoute.Sitemap = generateHireSlugs().map((slug) => ({
    url: `${BASE_URL}/hire/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const jobSearchPages: MetadataRoute.Sitemap = generateJobSearchSlugs().map((slug) => ({
    url: `${BASE_URL}/jobs/search/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const toolBrowsePages: MetadataRoute.Sitemap = generateToolBrowseSlugs().map((slug) => ({
    url: `${BASE_URL}/tools/browse/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [
    ...STATIC_ROUTES,
    ...seoPages,
    ...hirePages,
    ...jobSearchPages,
    ...toolBrowsePages,
    ...jobPages,
    ...toolPages,
  ];
}

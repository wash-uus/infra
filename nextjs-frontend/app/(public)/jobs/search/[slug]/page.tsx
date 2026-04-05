import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Clock, DollarSign, ChevronRight, Briefcase, Users } from 'lucide-react';
import {
  parseJobSlug,
  buildJobSeoTitle,
  buildJobSeoDescription,
  buildJobFaqs,
  LOCATIONS,
  type FaqItem,
} from '@/lib/seo-slugs';
import { generateJobSearchSlugs } from '@/config/seoMatrix';
import { Job } from '@/types';
import { formatCurrency } from '@/lib/utils';

export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infrasells.com';

export async function generateStaticParams() {
  return generateJobSearchSlugs().slice(0, 500).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const parsed = parseJobSlug(params.slug);
  if (!parsed.valid) return { title: 'Jobs | INFRA' };

  const title = buildJobSeoTitle(parsed, 'search');
  const description = buildJobSeoDescription(parsed, 'search');
  const canonicalPath = `/jobs/search/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}${canonicalPath}`,
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchJobs(parsed: ReturnType<typeof parseJobSlug>): Promise<Job[]> {
  try {
    const params = new URLSearchParams({ status: 'posted', pageSize: '24' });
    if (parsed.city) params.set('location', parsed.city);
    if (parsed.country) params.set('country', parsed.country);
    if (parsed.skillSlug) params.set('q', parsed.skillSlug.replace(/-/g, ' '));
    const res = await fetch(`${API_URL}/jobs?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function JobsSearchPage({ params }: { params: { slug: string } }) {
  const parsed = parseJobSlug(params.slug);
  if (!parsed.valid) notFound();

  const jobs = await fetchJobs(parsed);
  const title = buildJobSeoTitle(parsed, 'search');
  const description = buildJobSeoDescription(parsed, 'search');
  const faqs = buildJobFaqs(parsed);
  const loc = parsed.locationDisplay ? ` in ${parsed.locationDisplay}` : '';

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    numberOfItems: jobs.length,
    itemListElement: jobs.slice(0, 10).map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'JobPosting',
        title: job.title,
        description: (job.description ?? '').slice(0, 200),
        datePosted: (job as any).createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
        hiringOrganization: { '@type': 'Organization', name: job.postedByName },
        jobLocation: job.location
          ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: job.country ?? 'KE' } }
          : undefined,
        employmentType: 'CONTRACTOR',
        url: `${SITE_URL}/jobs/${job.id}`,
      },
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${SITE_URL}/jobs` },
      { '@type': 'ListItem', position: 3, name: title },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }: FaqItem) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const COUNTRY_CITIES: Record<string, string[]> = {
    Kenya: ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'],
    Nigeria: ['lagos', 'abuja', 'port-harcourt'],
    'South Africa': ['johannesburg', 'cape-town', 'durban'],
  };
  const relatedCities = parsed.country
    ? (COUNTRY_CITIES[parsed.country] ?? [])
        .filter((c) => LOCATIONS[c]?.city !== parsed.city)
        .map((c) => ({ href: `/jobs/search/${parsed.skillSlug}-in-${c}`, label: LOCATIONS[c]?.city ?? c }))
    : [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-gray-500">
          <Link href="/" className="hover:text-infra-primary">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/jobs" className="hover:text-infra-primary">Jobs</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-800">{parsed.skill} Jobs{loc}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {parsed.skill} Jobs{loc}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">{description}</p>
          {parsed.avgDailyRate && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              💰 Typical rate: <strong>{parsed.avgDailyRate}</strong>
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/jobs/new`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Briefcase className="h-4 w-4" /> Post a Job
            </Link>
            <Link
              href={`/search?q=${parsed.skillSlug ?? ''}&tab=jobs`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              All {parsed.skill} Jobs
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-5">
            {relatedCities.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">More Cities</h2>
                <ul className="space-y-2">
                  {relatedCities.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-infra-primary">
                        <ChevronRight className="h-3.5 w-3.5 flex-none text-gray-300" />
                        {parsed.skill} jobs in {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Hire a {parsed.skill}
              </h2>
              <p className="text-xs text-gray-500 mb-3">Need someone for your project instead?</p>
              <Link
                href={`/hire/${parsed.skillSlug}${parsed.city ? `-in-${parsed.city.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
                className="block w-full rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Browse {parsed.skill}s for hire
              </Link>
            </div>
          </aside>

          {/* Job listings */}
          <section className="lg:col-span-3 space-y-4">
            {jobs.length > 0 ? (
              <>
                <p className="text-sm text-gray-500">{jobs.length} open {parsed.skill?.toLowerCase()} jobs{loc}</p>
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-gray-900 leading-snug">{job.title}</h2>
                        <p className="mt-0.5 text-sm text-gray-500">{job.postedByName}</p>
                      </div>
                      {job.budget && (
                        <span className="flex-none rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {formatCurrency(job.budget, job.currency as any)}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      {job.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      )}
                      {job.isRemote && <span className="text-emerald-600 font-medium">Remote OK</span>}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />{job.applicationsCount ?? 0} applicants
                      </span>
                    </div>
                  </Link>
                ))}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <Briefcase className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-700">No {parsed.skill?.toLowerCase()} jobs posted yet{loc}</p>
                <p className="mt-1 text-sm text-gray-500">Be the first to post a job and find talent fast.</p>
                <Link href="/jobs/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  Post a Job
                </Link>
              </div>
            )}

            {/* FAQ */}
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-gray-900">FAQ — {parsed.skill} Jobs{loc}</h2>
              <div className="space-y-4">
                {faqs.map(({ q, a }: FaqItem) => (
                  <div key={q}>
                    <dt className="font-medium text-gray-900">{q}</dt>
                    <dd className="mt-1 text-sm text-gray-600">{a}</dd>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Star, Shield, ChevronRight, Briefcase, Clock } from 'lucide-react';
import {
  parseJobSlug,
  buildJobSeoTitle,
  buildJobSeoDescription,
  buildJobFaqs,
  LOCATIONS,
  type FaqItem,
} from '@/lib/seo-slugs';
import { generateHireSlugs } from '@/config/seoMatrix';
import { UserProfile } from '@/types';
import { getInitials } from '@/lib/utils';

export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infrasells.com';

// ── Pre-render high-value slug combos at build time ───────────────────────────
export async function generateStaticParams() {
  return generateHireSlugs().slice(0, 500).map((slug) => ({ slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const parsed = parseJobSlug(params.slug);
  if (!parsed.valid) return { title: 'Hire Professionals | INFRA' };

  const title = buildJobSeoTitle(parsed, 'hire');
  const description = buildJobSeoDescription(parsed, 'hire');
  const canonicalPath = `/hire/${params.slug}`;

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
async function fetchProfessionals(parsed: ReturnType<typeof parseJobSlug>): Promise<UserProfile[]> {
  try {
    const params = new URLSearchParams({ role: 'professional', pageSize: '24' });
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.country) params.set('country', parsed.country);
    if (parsed.skillSlug) params.set('q', parsed.skillSlug.replace(/-/g, ' '));
    const res = await fetch(`${API_URL}/users/profiles/search?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.profiles ?? json.data ?? [];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function HirePage({ params }: { params: { slug: string } }) {
  const parsed = parseJobSlug(params.slug);
  if (!parsed.valid) notFound();

  const professionals = await fetchProfessionals(parsed);

  const title = buildJobSeoTitle(parsed, 'hire');
  const description = buildJobSeoDescription(parsed, 'hire');
  const faqs = buildJobFaqs(parsed);
  const loc = parsed.locationDisplay ? ` in ${parsed.locationDisplay}` : '';

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    numberOfItems: professionals.length,
    itemListElement: professionals.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'ProfessionalService',
        name: p.displayName,
        description: p.bio,
        address: { '@type': 'PostalAddress', addressLocality: p.city, addressCountry: p.country },
        aggregateRating: p.totalReviews > 0
          ? { '@type': 'AggregateRating', ratingValue: p.averageRating, reviewCount: p.totalReviews }
          : undefined,
      },
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Hire Professionals', item: `${SITE_URL}/hire` },
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

  // ── Related city links ─────────────────────────────────────────────────────
  const COUNTRY_CITIES: Record<string, string[]> = {
    Kenya: ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'],
    Nigeria: ['lagos', 'abuja', 'port-harcourt'],
    'South Africa': ['johannesburg', 'cape-town', 'durban'],
  };
  const relatedCities: { href: string; label: string }[] = parsed.country
    ? (COUNTRY_CITIES[parsed.country] ?? [])
        .filter((c) => LOCATIONS[c]?.city !== parsed.city)
        .map((c) => ({ href: `/hire/${parsed.skillSlug}-in-${c}`, label: `${LOCATIONS[c]?.city ?? c}` }))
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
          <Link href="/search" className="hover:text-infra-primary">Hire</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-800">Hire a {parsed.skill}{loc}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Hire a {parsed.skill}{loc}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">{description}</p>
          {parsed.avgDailyRate && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              💰 Average daily rate: <strong>{parsed.avgDailyRate}</strong>
            </p>
          )}
          {parsed.skillDescription && (
            <p className="mt-1 text-sm text-gray-500 italic">
              Services include: {parsed.skillDescription}.
            </p>
          )}

          {/* CTA buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/jobs/new?skill=${parsed.skillSlug ?? ''}&location=${parsed.city ?? ''}`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Briefcase className="h-4 w-4" />
              Post a Job
            </Link>
            <Link
              href={`/search?q=${parsed.skillSlug ?? ''}&tab=professionals&city=${parsed.city ?? ''}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Browse Professionals
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-5">
            {relatedCities.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Other Cities
                </h2>
                <ul className="space-y-2">
                  {relatedCities.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-infra-primary">
                        <ChevronRight className="h-3.5 w-3.5 flex-none text-gray-300" />
                        {parsed.skill} in {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
              <h2 className="mb-2 text-sm font-semibold text-emerald-800">Why INFRA?</h2>
              <ul className="space-y-1.5 text-xs text-emerald-700">
                <li>✅ ID-verified professionals</li>
                <li>✅ Escrow payment protection</li>
                <li>✅ Verified client reviews</li>
                <li>✅ M-Pesa, card & bank pay</li>
              </ul>
            </div>
          </aside>

          {/* Main column */}
          <section className="lg:col-span-3 space-y-6">
            {/* Professional cards */}
            {professionals.length > 0 ? (
              <>
                <p className="text-sm text-gray-500">
                  {professionals.length} verified {parsed.skill?.toLowerCase()}s{loc} on INFRA
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {professionals.map((pro) => (
                    <Link
                      key={pro.uid}
                      href={`/profile/${pro.uid}`}
                      className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Avatar */}
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        {pro.photoURL
                          ? <img src={pro.photoURL} alt={pro.displayName} className="h-12 w-12 rounded-full object-cover" />
                          : getInitials(pro.displayName)
                        }
                      </div>
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-gray-900">{pro.displayName}</span>
                          {pro.verificationStatus !== 'unverified' && (
                            <Shield className="h-3.5 w-3.5 flex-none text-emerald-600" aria-label="Verified" />
                          )}
                        </div>
                        {pro.jobTitle && <p className="truncate text-xs text-gray-500">{pro.jobTitle}</p>}
                        {(pro.city || pro.country) && (
                          <p className="flex items-center gap-0.5 text-xs text-gray-400 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {[pro.city, pro.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {pro.totalReviews > 0 && (
                          <p className="flex items-center gap-0.5 text-xs text-amber-600 mt-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {pro.averageRating.toFixed(1)} ({pro.totalReviews})
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <Briefcase className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-700">No {parsed.skill?.toLowerCase()}s listed yet{loc}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Post your job and receive applications within minutes.
                </p>
                <Link href="/jobs/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  Post a Job
                </Link>
              </div>
            )}

            {/* FAQ */}
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-gray-900">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map(({ q, a }: FaqItem) => (
                  <div key={q}>
                    <dt className="font-medium text-gray-900">{q}</dt>
                    <dd className="mt-1 text-sm text-gray-600">{a}</dd>
                  </div>
                ))}
              </div>
            </section>

            {/* Internal links */}
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-gray-900">Related searches</h2>
              <div className="flex flex-wrap gap-2">
                {[parsed.city && `${parsed.skill} jobs in ${parsed.city}`,
                  parsed.country && `${parsed.skill} in ${parsed.country}`,
                  `${parsed.skill} near me`,
                  `hire ${parsed.skill} online`,
                ].filter(Boolean).map((term) => (
                  <Link
                    key={term as string}
                    href={`/search?q=${encodeURIComponent((term as string).toLowerCase())}&tab=professionals`}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </section>
          </section>
        </div>
      </div>
    </>
  );
}

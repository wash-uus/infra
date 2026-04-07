import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, Star, Shield, Briefcase, ChevronRight, Users, Search,
} from 'lucide-react';
import {
  parseSlug,
  buildSeoTitle,
  buildSeoDescription,
  buildH1,
  buildRelatedLinks,
  buildFaqs,
  LOCATIONS,
  DISCIPLINES,
  SPECIALTIES,
  SERVICES,
  type FaqItem,
} from '@/lib/seo-slugs';
import { UserProfile } from '@/types';
import { getInitials } from '@/lib/utils';

// ── ISR: revalidate every hour ────────────────────────────────────────────────
export const revalidate = 3600;

// ── generateStaticParams (high-value combinations pre-rendered at build time) ─
export async function generateStaticParams() {
  const params: { slug: string[] }[] = [];

  const highValueDiscs = ['engineers', 'surveyors', 'architects', 'contractors'];
  const highValueSpecs = ['civil', 'structural', 'mechanical', 'electrical'];
  const highValueLocs  = ['nairobi', 'mombasa', 'kampala', 'dar-es-salaam', 'lagos', 'accra', 'johannesburg', 'kenya', 'uganda', 'tanzania'];
  const highValueSvcs  = ['structural-design', 'foundation-design', 'topographic-survey', 'bill-of-quantities', 'architectural-design', 'quantity-surveying'];

  for (const disc of highValueDiscs) {
    params.push({ slug: [disc] });
    for (const loc of highValueLocs) {
      params.push({ slug: [`${disc}-in-${loc}`] });
      params.push({ slug: [`hire-${disc}-in-${loc}`] });
      params.push({ slug: [`best-${disc}-in-${loc}`] });
    }
  }
  for (const spec of highValueSpecs) {
    for (const loc of highValueLocs) {
      params.push({ slug: [`${spec}-engineers-in-${loc}`] });
      params.push({ slug: [`hire-${spec}-engineer-in-${loc}`] });
      params.push({ slug: [`best-${spec}-engineer-in-${loc}`] });
    }
  }
  for (const svc of highValueSvcs) {
    for (const loc of highValueLocs) {
      params.push({ slug: [`${svc}-cost-in-${loc}`] });
      params.push({ slug: [`${svc}-engineer-in-${loc}`] });
    }
  }
  return params;
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  const parsed = parseSlug(params.slug);
  if (!parsed.valid) return { title: 'Find Professionals | INFRA' };

  const title       = buildSeoTitle(parsed);
  const description = buildSeoDescription(parsed);
  const canonicalPath = `/find/${params.slug.join('/')}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'InfraSells',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchProfiles(parsed: ReturnType<typeof parseSlug>): Promise<UserProfile[]> {
  try {
    const params = new URLSearchParams();
    if (parsed.city)       params.set('city', parsed.city);
    if (parsed.country)    params.set('country', parsed.country);
    if (parsed.discipline) params.set('discipline', parsed.discipline);
    if (parsed.specialty)  params.set('specialty', parsed.specialty);
    params.set('role', 'professional');
    params.set('pageSize', '24');

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
    const res = await fetch(`${apiBase}/users/profiles/search?${params.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.profiles ?? json.data ?? [];
  } catch {
    return [];
  }
}

// ── Page component ────────────────────────────────────────────────────────────
export default async function FindPage({ params }: { params: { slug: string[] } }) {
  const parsed = parseSlug(params.slug);
  if (!parsed.valid) notFound();

  const [profiles, relatedLinks] = await Promise.all([
    fetchProfiles(parsed),
    Promise.resolve(buildRelatedLinks(parsed)),
  ]);

  const h1          = buildH1(parsed);
  const description = buildSeoDescription(parsed);
  const faqs        = buildFaqs(parsed);

  // ── JSON-LD structured data ────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    description,
    numberOfItems: profiles.length,
    itemListElement: profiles.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Person',
        name: p.displayName,
        jobTitle: p.jobTitle,
        description: p.bio,
        address: {
          '@type': 'PostalAddress',
          addressLocality: p.city,
          addressCountry: p.country,
        },
        aggregateRating: p.totalReviews > 0
          ? { '@type': 'AggregateRating', ratingValue: p.averageRating, reviewCount: p.totalReviews }
          : undefined,
      },
    })),
  };

  // ── Breadcrumb JSON-LD ─────────────────────────────────────────────────────
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'Find Professionals', item: '/find' },
      { '@type': 'ListItem', position: 3, name: h1 },
    ],
  };

  // ── FAQ JSON-LD ────────────────────────────────────────────────────────────
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-gray-500">
          <Link href="/" className="hover:text-infra-primary">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/search?tab=professionals" className="hover:text-infra-primary">Find Professionals</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-800 font-medium">{h1}</span>
        </nav>

        {/* Hero heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{h1}</h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600 max-w-2xl">{description}</p>

          {/* Quick search bar */}
          <div className="mt-5 flex max-w-lg items-center gap-2">
            <form
              action="/search"
              method="GET"
              className="flex flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-infra-primary"
            >
              <Search className="ml-3 h-4 w-4 flex-none text-gray-400" />
              <input
                name="q"
                type="search"
                placeholder={`Search ${h1}…`}
                defaultValue={`${parsed.specialty ?? parsed.discipline ?? ''}`}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
              />
              <input type="hidden" name="tab" value="professionals" />
              <button
                type="submit"
                className="mr-1 rounded-lg bg-infra-primary px-4 py-2 text-xs font-semibold text-white hover:bg-infra-primary transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Location filter */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Location
              </h2>
              <LocationLinks discipline={parsed.discipline} specialty={parsed.specialty} activeLoc={parsed.locationDisplay} />
            </div>

            {/* Specialty filter */}
            {parsed.discipline === 'Engineer' && (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Specialty
                </h2>
                <SpecialtyLinks
                  city={parsed.city}
                  country={parsed.country}
                  activeSpecialty={parsed.specialty}
                />
              </div>
            )}

            {/* Related pages */}
            {relatedLinks.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Also find
                </h2>
                <ul className="space-y-2">
                  {relatedLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-infra-primary"
                      >
                        <ChevronRight className="h-3.5 w-3.5 flex-none text-gray-300" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* ── Main column ──────────────────────────────────────────────── */}
          <section className="lg:col-span-3 space-y-10">

            {/* Cost page template */}
            {parsed.pageType === 'cost' && (
              <CostSection parsed={parsed} />
            )}

            {/* Service page summary */}
            {parsed.pageType === 'service' && parsed.serviceLabel && (
              <div className="rounded-xl border border-infra-primary/10 bg-infra-primary/5 p-6">
                <h2 className="text-lg font-bold text-infra-primary">{parsed.serviceLabel} — What to expect</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Hiring a verified {parsed.serviceLabel.toLowerCase()} expert through INFRA gives you access to
                  credentialed professionals, transparent pricing, and escrow-protected payments.
                  {parsed.serviceCostRange && ` Typical range: ${parsed.serviceCostRange}.`}
                </p>
                <Link
                  href="/jobs/new"
                  className="mt-4 inline-block rounded-full bg-infra-primary px-5 py-2 text-sm font-semibold text-white hover:bg-infra-primary transition-colors"
                >
                  Post a {parsed.serviceLabel} Job
                </Link>
              </div>
            )}

            {/* Profile grid */}
            <div>
              <p className="mb-4 text-sm text-gray-500">
                {profiles.length > 0
                  ? `${profiles.length} professional${profiles.length !== 1 ? 's' : ''} found`
                  : 'No professionals found yet — be the first to list here!'}
              </p>

              {profiles.length === 0 ? (
                <EmptyState parsed={parsed} />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {profiles.map((profile) => (
                    <ProfileCard key={profile.uid} profile={profile} />
                  ))}
                </div>
              )}

              {/* CTA: become listed */}
              <div className="mt-10 rounded-2xl bg-gradient-to-br from-infra-primary to-infra-primary/80 p-8 text-center text-white shadow-lg">
                <Users className="mx-auto mb-3 h-8 w-8 opacity-80" />
                <h3 className="text-xl font-bold">Are you a {h1.replace(' in ', ' based in ')}?</h3>
                <p className="mt-1 text-sm text-emerald-100">
                  Create a free profile and get discovered by clients searching for your expertise.
                </p>
                <Link
                  href="/signup"
                  className="mt-5 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-infra-primary shadow-sm hover:bg-infra-primary/5 transition-colors"
                >
                  Join INFRA Free
                </Link>
              </div>
            </div>

            {/* FAQ Accordion */}
            <FaqSection faqs={faqs} />

          </section>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Cost page content block
function CostSection({ parsed }: { parsed: ReturnType<typeof parseSlug> }) {
  const svc   = parsed.serviceLabel ?? 'Engineering Service';
  const range = parsed.serviceCostRange ?? 'Varies by scope';
  const loc   = parsed.locationDisplay ?? 'your area';
  return (
    <div className="space-y-6">
      {/* Hero cost card */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Typical cost range</p>
        <p className="mt-1 text-3xl font-extrabold text-gray-900">{range}</p>
        <p className="mt-1 text-sm text-gray-600">for {svc.toLowerCase()} in {loc}</p>
        <Link
          href="/search?tab=professionals"
          className="mt-5 inline-block rounded-full bg-infra-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-infra-primary transition-colors"
        >
          Get Free Quotes
        </Link>
      </div>

      {/* Cost factors table */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-gray-800">Factors that affect {svc.toLowerCase()} cost</h2>
        <div className="divide-y divide-gray-50">
          {[
            ['Project size & complexity', 'Larger or more complex projects require significantly more engineering time.'],
            ['Site conditions', 'Difficult terrain, poor soil, or constrained access adds to the scope.'],
            ['Engineer experience', 'Certified senior engineers command higher rates than recently qualified graduates.'],
            ['Turnaround time', 'Rush deliverables typically attract a 20–40% premium.'],
            ['Location', 'Urban centres (e.g. Nairobi CBD) often cost more than peri-urban sites.'],
          ].map(([factor, detail]) => (
            <div key={factor} className="py-3">
              <p className="text-sm font-semibold text-gray-800">{factor}</p>
              <p className="text-xs text-gray-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How INFRA helps */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-gray-800">How to get the best price</h2>
        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
          <li>Post your project with full details — engineers quote more accurately on scoped work.</li>
          <li>Compare at least 3 quotes; the lowest is not always the best value.</li>
          <li>Check each engineer&apos;s ratings and completed projects on their INFRA profile.</li>
          <li>Use INFRA escrow — pay only when the deliverable meets your approval.</li>
        </ol>
      </div>
    </div>
  );
}

// FAQ accordion section
function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-bold text-gray-800">Frequently Asked Questions</h2>
      <div className="divide-y divide-gray-100">
        {faqs.map(({ q, a }) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-semibold text-gray-800 marker:hidden list-none">
              <span>{q}</span>
              <ChevronRight className="h-4 w-4 flex-none translate-y-0.5 text-gray-400 transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: UserProfile }) {
  const initials = getInitials(profile.displayName);
  return (
    <Link href={`/profile/${profile.uid}`} className="group block">
      <article className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        {/* Avatar + name */}
        <div className="flex items-start gap-3">
          <div className="relative flex-none">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={profile.displayName}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-infra-primary to-infra-primary text-sm font-bold text-white">
                {initials}
              </div>
            )}
            {profile.idVerified && (
              <Shield
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-emerald-500"
                aria-label="Identity verified"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-infra-primary transition-colors">
              {profile.displayName}
            </h3>
            {profile.jobTitle && (
              <p className="truncate text-xs text-gray-500">{profile.jobTitle}</p>
            )}
          </div>
        </div>

        {/* Rating */}
        {profile.totalReviews > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-gray-800">
              {profile.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({profile.totalReviews})</span>
          </div>
        )}

        {/* Location */}
        {(profile.city ?? profile.country) && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3 flex-none text-gray-400" />
            {[profile.city, profile.country].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Bio excerpt */}
        {profile.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">{profile.bio}</p>
        )}

        {/* Stats footer */}
        <div className="mt-4 flex items-center gap-3 border-t border-gray-50 pt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-gray-400" />
            {profile.completedProjects} project{profile.completedProjects !== 1 ? 's' : ''}
          </span>
          {profile.yearsExperience != null && (
            <span>{profile.yearsExperience} yr{profile.yearsExperience !== 1 ? 's' : ''} exp</span>
          )}
          <span
            className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              profile.availabilityStatus === 'available'
                ? 'bg-emerald-50 text-emerald-700'
                : profile.availabilityStatus === 'busy'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {profile.availabilityStatus === 'available'
              ? 'Available'
              : profile.availabilityStatus === 'busy'
              ? 'Busy'
              : 'Unavailable'}
          </span>
        </div>
      </article>
    </Link>
  );
}

function LocationLinks({
  discipline,
  specialty,
  activeLoc,
}: {
  discipline: string | null;
  specialty: string | null;
  activeLoc: string | null;
}) {
  const cities = [
    'nairobi', 'mombasa', 'kampala', 'dar-es-salaam', 'kigali',
    'addis-ababa', 'lagos', 'accra', 'johannesburg',
  ];
  const discSlug = discipline ? discipline.toLowerCase() + 's' : 'engineers';
  const specPrefix = specialty
    ? Object.entries(SPECIALTIES).find(([, v]) => v === specialty)?.[0] + '-'
    : '';

  return (
    <ul className="space-y-1.5">
      {cities.map((c) => {
        const loc = LOCATIONS[c];
        const isActive = activeLoc === loc?.display || activeLoc === loc?.city;
        return (
          <li key={c}>
            <Link
              href={`/find/${specPrefix}${discSlug}-in-${c}`}
              className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-infra-primary/5 font-semibold text-infra-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-infra-primary'
              }`}
            >
              <span>{loc?.city ?? c}</span>
              <span className="text-[11px] text-gray-400">{loc?.country}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SpecialtyLinks({
  city,
  country,
  activeSpecialty,
}: {
  city: string | null;
  country: string | null;
  activeSpecialty: string | null;
}) {
  const locSuffix = city
    ? `-in-${city.toLowerCase().replace(/\s+/g, '-')}`
    : country
    ? `-in-${country.toLowerCase().replace(/\s+/g, '-')}`
    : '';

  const specs = ['civil', 'structural', 'mechanical', 'electrical', 'environmental', 'geotechnical'];

  return (
    <ul className="space-y-1.5">
      {specs.map((spec) => {
        const label = SPECIALTIES[spec];
        const isActive = activeSpecialty === label;
        return (
          <li key={spec}>
            <Link
              href={`/find/${spec}-engineers${locSuffix}`}
              className={`block rounded-lg px-2 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-infra-primary/5 font-semibold text-infra-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-infra-primary'
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ parsed }: { parsed: ReturnType<typeof parseSlug> }) {
  const h1 = buildH1(parsed);
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
      <Users className="mx-auto mb-4 h-10 w-10 text-gray-300" />
      <h3 className="text-base font-semibold text-gray-700">No {h1} yet</h3>
      <p className="mt-2 text-sm text-gray-500">
        Be the first professional to appear here — it&apos;s free to join.
      </p>
      <Link
        href="/signup"
        className="mt-5 inline-block rounded-full bg-infra-primary px-5 py-2 text-sm font-semibold text-white hover:bg-infra-primary transition-colors"
      >
        Create your profile
      </Link>
    </div>
  );
}

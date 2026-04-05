import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ChevronRight, Tag, Package } from 'lucide-react';
import {
  parseToolSlug,
  buildToolSeoTitle,
  buildToolSeoDescription,
  buildToolFaqs,
  LOCATIONS,
  type FaqItem,
} from '@/lib/seo-slugs';
import { generateToolBrowseSlugs } from '@/config/seoMatrix';
import { Tool } from '@/types';
import { formatCurrency } from '@/lib/utils';

export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infrasells.com';

export async function generateStaticParams() {
  return generateToolBrowseSlugs().slice(0, 400).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const parsed = parseToolSlug(params.slug);
  if (!parsed.valid) return { title: 'Equipment & Tools | INFRA' };

  const title = buildToolSeoTitle(parsed);
  const description = buildToolSeoDescription(parsed);
  const canonicalPath = `/tools/browse/${params.slug}`;

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
async function fetchTools(parsed: ReturnType<typeof parseToolSlug>): Promise<Tool[]> {
  try {
    const params = new URLSearchParams({ pageSize: '24' });
    if (parsed.city) params.set('location', parsed.city);
    if (parsed.country) params.set('country', parsed.country);
    if (parsed.categorySlug) params.set('q', parsed.categorySlug.replace(/-/g, ' '));
    const res = await fetch(`${API_URL}/tools?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ToolsBrowsePage({ params }: { params: { slug: string } }) {
  const parsed = parseToolSlug(params.slug);
  if (!parsed.valid) notFound();

  const tools = await fetchTools(parsed);
  const title = buildToolSeoTitle(parsed);
  const description = buildToolSeoDescription(parsed);
  const faqs = buildToolFaqs(parsed);
  const loc = parsed.locationDisplay ? ` in ${parsed.locationDisplay}` : '';

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  const isSoftware = parsed.schemaType === 'SoftwareApplication';
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description,
    numberOfItems: tools.length,
    itemListElement: tools.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': isSoftware ? 'SoftwareApplication' : 'Product',
        name: t.title,
        description: (t.description ?? '').slice(0, 200),
        ...(isSoftware ? { applicationCategory: 'BusinessApplication' } : {}),
        offers: (t.price || t.dailyRate)
          ? { '@type': 'Offer', price: t.price ?? t.dailyRate, priceCurrency: t.currency ?? 'KES', availability: t.isAvailable ? 'InStock' : 'OutOfStock' }
          : undefined,
        url: `${SITE_URL}/tools/${t.id}`,
      },
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Equipment & Tools', item: `${SITE_URL}/tools` },
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
        .map((c) => ({ href: `/tools/browse/${parsed.categorySlug}-in-${c}`, label: LOCATIONS[c]?.city ?? c }))
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
          <Link href="/tools" className="hover:text-infra-primary">Equipment & Tools</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-800">{parsed.category}{loc}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {parsed.category}{loc}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">{description}</p>
          {parsed.categoryDescription && (
            <p className="mt-1 text-sm italic text-gray-500">{parsed.categoryDescription}.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/tools/new"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Package className="h-4 w-4" /> List Your Equipment
            </Link>
            <Link
              href={`/search?q=${parsed.categorySlug ?? ''}&tab=tools`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              All {parsed.category}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-5">
            {relatedCities.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Other Cities</h2>
                <ul className="space-y-2">
                  {relatedCities.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-infra-primary">
                        <ChevronRight className="h-3.5 w-3.5 flex-none text-gray-300" />
                        {parsed.category} in {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
              <h2 className="mb-2 text-sm font-semibold text-emerald-800">List Your Equipment</h2>
              <p className="text-xs text-emerald-700 mb-3">
                Earn from idle tools. Listing is free. Get paid via M-Pesa or bank.
              </p>
              <Link href="/tools/new" className="block w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700">
                Create Listing
              </Link>
            </div>
          </aside>

          {/* Tools grid */}
          <section className="lg:col-span-3 space-y-4">
            {tools.length > 0 ? (
              <>
                <p className="text-sm text-gray-500">{tools.length} listings{loc}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => {
                    const img = tool.images?.[0];
                    const priceDisplay = tool.listingType === 'renting' && tool.dailyRate
                      ? `${formatCurrency(tool.dailyRate, tool.currency as any)}/day`
                      : tool.price ? formatCurrency(tool.price, tool.currency as any) : null;
                    return (
                      <Link
                        key={tool.id}
                        href={`/tools/${tool.id}`}
                        className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                      >
                        <div className="relative h-40 bg-gray-100">
                          {img?.url ? (
                            <Image src={img.url} alt={tool.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">
                              <Package className="h-10 w-10" />
                            </div>
                          )}
                          {tool.isFeatured && (
                            <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">
                              ⭐ Featured
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <h2 className="font-medium text-gray-900 leading-snug line-clamp-2">{tool.title}</h2>
                          {tool.location && (
                            <p className="mt-1 flex items-center gap-0.5 text-xs text-gray-400">
                              <MapPin className="h-3 w-3" />{tool.location}
                            </p>
                          )}
                          {priceDisplay && (
                            <p className="mt-auto pt-2 text-sm font-semibold text-emerald-700">{priceDisplay}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-700">No {parsed.category?.toLowerCase()} listed yet{loc}</p>
                <p className="mt-1 text-sm text-gray-500">Be the first to list equipment in this category.</p>
                <Link href="/tools/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  List Equipment
                </Link>
              </div>
            )}

            {/* FAQ */}
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-gray-900">FAQ — {parsed.category}{loc}</h2>
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

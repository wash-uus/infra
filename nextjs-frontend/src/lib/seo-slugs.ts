/**
 * Programmatic SEO slug utilities.
 *
 * URL patterns supported:
 *   /find/engineers-in-nairobi
 *   /find/civil-engineers-in-nairobi
 *   /find/structural-engineers-in-kenya
 *   /find/top-surveyors-in-kenya
 *   /find/architects-in-mombasa
 *   /find/mechanical-engineers
 *   /find/engineers                          (no location)
 *   /find/hire-civil-engineer-nairobi        (hire- intent)
 *   /find/best-structural-engineer-nairobi   (best- intent)
 *   /find/civil-engineering-cost-nairobi     (cost pages)
 *   /find/foundation-design-engineer-nairobi (long-tail service)
 */

import { JOB_SKILLS, TOOL_CATEGORIES } from '@/config/seoMatrix';

// ── Discipline taxonomy ───────────────────────────────────────────────────────

export const DISCIPLINES: Record<string, string> = {
  engineers:    'Engineer',
  engineering:  'Engineer',
  engineer:     'Engineer',
  surveyors:    'Surveyor',
  surveyor:     'Surveyor',
  surveying:    'Surveyor',
  architects:   'Architect',
  architect:    'Architect',
  architecture: 'Architect',
  contractors:  'Contractor',
  contractor:   'Contractor',
  consultants:  'Consultant',
  consultant:   'Consultant',
  designers:    'Designer',
  designer:     'Designer',
  planners:     'Planner',
  planner:      'Planner',
  inspectors:   'Inspector',
  inspector:    'Inspector',
  managers:     'Manager',
  manager:      'Manager',
  technicians:  'Technician',
  technician:   'Technician',
  draughtsmen:  'Draughtsman',
  draughtsman:  'Draughtsman',
};

export const SPECIALTIES: Record<string, string> = {
  civil:            'Civil Engineering',
  structural:       'Structural Engineering',
  mechanical:       'Mechanical Engineering',
  electrical:       'Electrical Engineering',
  environmental:    'Environmental Engineering',
  geotechnical:     'Geotechnical Engineering',
  highway:          'Highway Engineering',
  water:            'Water Engineering',
  transport:        'Transportation Engineering',
  architectural:    'Architecture',
  interior:         'Interior Design',
  landscape:        'Landscape Architecture',
  quantity:         'Quantity Surveying',
  land:             'Land Surveying',
  hydrographic:     'Hydrographic Surveying',
  urban:            'Urban Planning',
  project:          'Project Management',
  construction:     'Construction Management',
  safety:           'Safety Engineering',
  fire:             'Fire Engineering',
  acoustic:         'Acoustic Engineering',
  telecommunications: 'Telecommunications Engineering',
  petroleum:        'Petroleum Engineering',
  mining:           'Mining Engineering',
  marine:           'Marine Engineering',
  aeronautical:     'Aeronautical Engineering',
  chemical:         'Chemical Engineering',
  biomedical:       'Biomedical Engineering',
  software:         'Software Engineering',
  drainage:         'Drainage Engineering',
  irrigation:       'Irrigation Engineering',
  foundation:       'Foundation Engineering',
  bridge:           'Bridge Engineering',
  road:             'Road Engineering',
  rail:             'Rail Engineering',
  port:             'Port Engineering',
  dam:              'Dam Engineering',
  tunnel:           'Tunnel Engineering',
  offshore:         'Offshore Engineering',
};

// Services that generate intent / cost / long-tail pages
export const SERVICES: Record<string, { label: string; costRange: string }> = {
  'structural-design':       { label: 'Structural Design',      costRange: 'KES 50,000 – 500,000' },
  'foundation-design':       { label: 'Foundation Design',      costRange: 'KES 30,000 – 300,000' },
  'building-plan-approval':  { label: 'Building Plan Approval', costRange: 'KES 20,000 – 150,000' },
  'topographic-survey':      { label: 'Topographic Survey',     costRange: 'KES 25,000 – 200,000' },
  'bill-of-quantities':      { label: 'Bill of Quantities',     costRange: 'KES 15,000 – 120,000' },
  'environmental-impact-assessment': { label: 'Environmental Impact Assessment', costRange: 'KES 80,000 – 800,000' },
  'road-design':             { label: 'Road Design',            costRange: 'KES 100,000 – 2,000,000' },
  'drainage-design':         { label: 'Drainage Design',        costRange: 'KES 40,000 – 400,000' },
  'plumbing-design':         { label: 'Plumbing Design',        costRange: 'KES 20,000 – 180,000' },
  'electrical-design':       { label: 'Electrical Design',      costRange: 'KES 25,000 – 250,000' },
  'land-subdivision':        { label: 'Land Subdivision',       costRange: 'KES 30,000 – 250,000' },
  'project-management':      { label: 'Project Management',     costRange: 'KES 50,000 – 1,000,000' },
  'site-supervision':        { label: 'Site Supervision',       costRange: 'KES 30,000 – 400,000' },
  'soil-testing':            { label: 'Soil Testing',           costRange: 'KES 15,000 – 100,000' },
  'geotechnical-survey':     { label: 'Geotechnical Survey',    costRange: 'KES 50,000 – 500,000' },
  'fire-safety-design':      { label: 'Fire Safety Design',     costRange: 'KES 20,000 – 200,000' },
  'quantity-surveying':      { label: 'Quantity Surveying',     costRange: 'KES 25,000 – 300,000' },
  'architectural-design':    { label: 'Architectural Design',   costRange: 'KES 50,000 – 1,000,000' },
  'interior-design':         { label: 'Interior Design',        costRange: 'KES 30,000 – 500,000' },
  'landscape-design':        { label: 'Landscape Design',       costRange: 'KES 25,000 – 400,000' },
};

// African cities & countries
export const LOCATIONS: Record<string, { city?: string; country: string; display: string }> = {
  'nairobi':          { city: 'Nairobi', country: 'Kenya', display: 'Nairobi, Kenya' },
  'mombasa':          { city: 'Mombasa', country: 'Kenya', display: 'Mombasa, Kenya' },
  'kisumu':           { city: 'Kisumu', country: 'Kenya', display: 'Kisumu, Kenya' },
  'nakuru':           { city: 'Nakuru', country: 'Kenya', display: 'Nakuru, Kenya' },
  'eldoret':          { city: 'Eldoret', country: 'Kenya', display: 'Eldoret, Kenya' },
  'thika':            { city: 'Thika', country: 'Kenya', display: 'Thika, Kenya' },
  'nyeri':            { city: 'Nyeri', country: 'Kenya', display: 'Nyeri, Kenya' },
  'kitale':           { city: 'Kitale', country: 'Kenya', display: 'Kitale, Kenya' },
  'garissa':          { city: 'Garissa', country: 'Kenya', display: 'Garissa, Kenya' },
  'malindi':          { city: 'Malindi', country: 'Kenya', display: 'Malindi, Kenya' },
  'kampala':          { city: 'Kampala', country: 'Uganda', display: 'Kampala, Uganda' },
  'entebbe':          { city: 'Entebbe', country: 'Uganda', display: 'Entebbe, Uganda' },
  'gulu':             { city: 'Gulu', country: 'Uganda', display: 'Gulu, Uganda' },
  'mbarara':          { city: 'Mbarara', country: 'Uganda', display: 'Mbarara, Uganda' },
  'dar-es-salaam':    { city: 'Dar es Salaam', country: 'Tanzania', display: 'Dar es Salaam, Tanzania' },
  'dodoma':           { city: 'Dodoma', country: 'Tanzania', display: 'Dodoma, Tanzania' },
  'arusha':           { city: 'Arusha', country: 'Tanzania', display: 'Arusha, Tanzania' },
  'mwanza':           { city: 'Mwanza', country: 'Tanzania', display: 'Mwanza, Tanzania' },
  'kigali':           { city: 'Kigali', country: 'Rwanda', display: 'Kigali, Rwanda' },
  'addis-ababa':      { city: 'Addis Ababa', country: 'Ethiopia', display: 'Addis Ababa, Ethiopia' },
  'dire-dawa':        { city: 'Dire Dawa', country: 'Ethiopia', display: 'Dire Dawa, Ethiopia' },
  'lagos':            { city: 'Lagos', country: 'Nigeria', display: 'Lagos, Nigeria' },
  'abuja':            { city: 'Abuja', country: 'Nigeria', display: 'Abuja, Nigeria' },
  'port-harcourt':    { city: 'Port Harcourt', country: 'Nigeria', display: 'Port Harcourt, Nigeria' },
  'kano':             { city: 'Kano', country: 'Nigeria', display: 'Kano, Nigeria' },
  'accra':            { city: 'Accra', country: 'Ghana', display: 'Accra, Ghana' },
  'kumasi':           { city: 'Kumasi', country: 'Ghana', display: 'Kumasi, Ghana' },
  'cairo':            { city: 'Cairo', country: 'Egypt', display: 'Cairo, Egypt' },
  'alexandria':       { city: 'Alexandria', country: 'Egypt', display: 'Alexandria, Egypt' },
  'johannesburg':     { city: 'Johannesburg', country: 'South Africa', display: 'Johannesburg, South Africa' },
  'cape-town':        { city: 'Cape Town', country: 'South Africa', display: 'Cape Town, South Africa' },
  'durban':           { city: 'Durban', country: 'South Africa', display: 'Durban, South Africa' },
  'pretoria':         { city: 'Pretoria', country: 'South Africa', display: 'Pretoria, South Africa' },
  'lusaka':           { city: 'Lusaka', country: 'Zambia', display: 'Lusaka, Zambia' },
  'harare':           { city: 'Harare', country: 'Zimbabwe', display: 'Harare, Zimbabwe' },
  'bulawayo':         { city: 'Bulawayo', country: 'Zimbabwe', display: 'Bulawayo, Zimbabwe' },
  'maputo':           { city: 'Maputo', country: 'Mozambique', display: 'Maputo, Mozambique' },
  'blantyre':         { city: 'Blantyre', country: 'Malawi', display: 'Blantyre, Malawi' },
  'lilongwe':         { city: 'Lilongwe', country: 'Malawi', display: 'Lilongwe, Malawi' },
  'dakar':            { city: 'Dakar', country: 'Senegal', display: 'Dakar, Senegal' },
  'nairobi-cbd':      { city: 'Nairobi CBD', country: 'Kenya', display: 'Nairobi CBD, Kenya' },
  'westlands':        { city: 'Westlands', country: 'Kenya', display: 'Westlands, Nairobi' },
  'karen':            { city: 'Karen', country: 'Kenya', display: 'Karen, Nairobi' },
  // Countries (no city)
  'kenya':            { country: 'Kenya', display: 'Kenya' },
  'uganda':           { country: 'Uganda', display: 'Uganda' },
  'tanzania':         { country: 'Tanzania', display: 'Tanzania' },
  'rwanda':           { country: 'Rwanda', display: 'Rwanda' },
  'ethiopia':         { country: 'Ethiopia', display: 'Ethiopia' },
  'nigeria':          { country: 'Nigeria', display: 'Nigeria' },
  'ghana':            { country: 'Ghana', display: 'Ghana' },
  'egypt':            { country: 'Egypt', display: 'Egypt' },
  'south-africa':     { country: 'South Africa', display: 'South Africa' },
  'zambia':           { country: 'Zambia', display: 'Zambia' },
  'zimbabwe':         { country: 'Zimbabwe', display: 'Zimbabwe' },
  'mozambique':       { country: 'Mozambique', display: 'Mozambique' },
  'malawi':           { country: 'Malawi', display: 'Malawi' },
  'senegal':          { country: 'Senegal', display: 'Senegal' },
  'africa':           { country: '', display: 'Africa' },
};

// ── Parsed slug result ────────────────────────────────────────────────────────

export type SlugPageType = 'professionals' | 'cost' | 'hire' | 'best' | 'service';

export interface ParsedSlug {
  /** null = not a valid SEO slug */
  valid: boolean;
  pageType: SlugPageType;
  specialty: string | null;     // e.g. "Civil Engineering"
  discipline: string | null;    // e.g. "Engineer"
  service: string | null;       // e.g. "foundation-design"
  serviceLabel: string | null;
  serviceCostRange: string | null;
  city: string | null;
  country: string | null;
  locationDisplay: string | null;
  /** The raw slug string joined by '/' */
  raw: string;
}

/**
 * Parse a Next.js catch-all `[...slug]` segments array.
 */
export function parseSlug(segments: string[]): ParsedSlug {
  const raw = segments.join('/');
  const full = segments.join('-').toLowerCase();

  const base: Omit<ParsedSlug, 'valid' | 'raw'> = {
    pageType: 'professionals',
    specialty: null,
    discipline: null,
    service: null,
    serviceLabel: null,
    serviceCostRange: null,
    city: null,
    country: null,
    locationDisplay: null,
  };

  // ── 1. Cost pages: "{service}-cost-{location}" ───────────────────────────
  // e.g. civil-engineering-cost-nairobi, foundation-design-cost-kenya
  const costMatch = full.match(/^(.+?)-cost(?:-in)?-(.+)$/) ?? full.match(/^(.+?)-cost$/);
  if (costMatch) {
    const [, servicePart, locSlug] = costMatch;
    const serviceKey = Object.keys(SERVICES).find((k) => k === servicePart || servicePart.endsWith(k)) ?? null;
    const locData = locSlug ? LOCATIONS[locSlug] : null;
    return {
      ...base,
      valid: true,
      pageType: 'cost',
      service: serviceKey,
      serviceLabel: serviceKey ? SERVICES[serviceKey].label : toTitleCase(servicePart.replace(/-/g, ' ')),
      serviceCostRange: serviceKey ? SERVICES[serviceKey].costRange : null,
      city: locData?.city ?? null,
      country: locData?.country ?? null,
      locationDisplay: locData?.display ?? (locSlug ? toTitleCase(locSlug.replace(/-/g, ' ')) : null),
      raw,
    };
  }

  // ── 2. Service pages: "{service}-engineer-{location}" or "{service}-in-{location}" ─
  // e.g. foundation-design-engineer-nairobi
  for (const svcKey of Object.keys(SERVICES)) {
    if (full.startsWith(svcKey)) {
      const rest = full.slice(svcKey.length + 1); // skip trailing '-'
      const locSlug = rest.replace(/^(engineer-in-|engineer-|in-)/, '');
      const locData = LOCATIONS[locSlug] ?? null;
      return {
        ...base,
        valid: true,
        pageType: 'service',
        service: svcKey,
        serviceLabel: SERVICES[svcKey].label,
        serviceCostRange: SERVICES[svcKey].costRange,
        discipline: 'Engineer',
        city: locData?.city ?? null,
        country: locData?.country ?? null,
        locationDisplay: locData?.display ?? (locSlug ? toTitleCase(locSlug.replace(/-/g, ' ')) : null),
        raw,
      };
    }
  }

  // ── 3. Hire intent: "hire-{spec}-engineer-{location}" or "hire-engineers-in-{loc}" ─
  const strippedHire = full.startsWith('hire-') ? full.slice(5) : null;

  // ── 4. Best intent: "best-{spec}-engineer-{location}" ───────────────────
  const strippedBest = full.startsWith('best-') ? full.slice(5) : null;

  const intentStripped = strippedHire ? { src: strippedHire, type: 'hire' as const }
    : strippedBest ? { src: strippedBest, type: 'best' as const }
    : null;

  // Normalise: strip "top-" prefix (e.g. "top-surveyors-in-kenya")
  const stripped = (intentStripped?.src ?? full).replace(/^top-/, '');

  // Split on "-in-" to separate profession from location
  const inIdx = stripped.indexOf('-in-');
  const profPart = inIdx >= 0 ? stripped.slice(0, inIdx) : stripped;
  const locSlug  = inIdx >= 0 ? stripped.slice(inIdx + 4) : null;

  // Try to match "near-me" (no city, triggers geo-lookup client side)
  const isNearMe = profPart.endsWith('-near-me') || locSlug === 'near-me';
  const profPartClean = profPart.replace(/-near-me$/, '');

  // Match discipline from profession part
  let specialty: string | null = null;
  let discipline: string | null = null;
  const words = profPartClean.split('-');
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (DISCIPLINES[word]) {
      discipline = DISCIPLINES[word];
      const specWords = words.slice(0, i);
      if (specWords.length > 0) {
        const specKey = specWords.join(' ');
        specialty = SPECIALTIES[specKey] ?? SPECIALTIES[specWords[specWords.length - 1]] ?? toTitleCase(specWords.join(' ')) + ' Engineering';
      }
      break;
    }
  }

  // Fallback discipline words
  if (!discipline && words.length > 0) {
    const last = words[words.length - 1];
    const COMMON_FALLBACKS: Record<string, string> = {
      professionals: 'Professional',
      experts: 'Expert',
      specialists: 'Specialist',
    };
    discipline = COMMON_FALLBACKS[last] ?? null;
  }

  if (!discipline) return { ...base, valid: false, raw };

  // Match location
  let city: string | null = null;
  let country: string | null = null;
  let locationDisplay: string | null = null;

  if (isNearMe) {
    locationDisplay = 'Near Me';
  } else if (locSlug && LOCATIONS[locSlug]) {
    const loc = LOCATIONS[locSlug];
    city    = loc.city ?? null;
    country = loc.country || null;
    locationDisplay = loc.display;
  } else if (locSlug) {
    locationDisplay = toTitleCase(locSlug.replace(/-/g, ' '));
    city = locationDisplay;
  }

  const pageType: SlugPageType = intentStripped?.type === 'hire' ? 'hire'
    : intentStripped?.type === 'best' ? 'best'
    : full.startsWith('top-') ? 'best'
    : 'professionals';

  return { valid: true, pageType, specialty, discipline, service: null, serviceLabel: null, serviceCostRange: null, city, country, locationDisplay, raw };
}

// ── SEO text generation ───────────────────────────────────────────────────────

export function buildSeoTitle(p: ParsedSlug): string {
  const loc = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  if (p.pageType === 'cost') {
    const svc = p.serviceLabel ?? 'Engineering Service';
    return `${svc} Cost${loc} — Rates & Estimates 2025 | INFRA`;
  }
  if (p.pageType === 'service') {
    const svc = p.serviceLabel ?? 'Engineering Service';
    return `${svc} Engineers${loc} — Hire Verified Experts | INFRA`;
  }
  const type = p.specialty ? `${p.specialty} ${p.discipline}s` : `${p.discipline}s`;
  if (p.pageType === 'hire') return `Hire ${type}${loc} — Verified Experts | INFRA`;
  if (p.pageType === 'best') return `Best ${type}${loc} — Top Rated 2025 | INFRA`;
  if (p.locationDisplay) return `Find ${type} in ${p.locationDisplay} | INFRA`;
  return `Find ${type} — Engineering Professionals | INFRA`;
}

export function buildSeoDescription(p: ParsedSlug): string {
  const loc  = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  if (p.pageType === 'cost') {
    const svc = p.serviceLabel ?? 'this engineering service';
    const range = p.serviceCostRange ? ` Typical cost range: ${p.serviceCostRange}.` : '';
    return `How much does ${svc.toLowerCase()} cost${loc}?${range} Compare rates from verified engineers on INFRA and get free quotes today.`;
  }
  if (p.pageType === 'service') {
    return `Find verified ${p.serviceLabel ?? 'engineering service'} experts${loc} on INFRA. View profiles, ratings, portfolios and get free quotes. Escrow payments available.`;
  }
  const type = p.specialty ? `${p.specialty} ${p.discipline}s` : `${p.discipline}s`;
  if (p.pageType === 'hire') return `Hire verified ${type}${loc} on INFRA. Browse profiles, check ratings, and connect directly. Escrow payments for your protection.`;
  if (p.pageType === 'best') return `Top-rated ${type}${loc} on INFRA. Verified credentials, client reviews, and competitive rates. Find the best expert for your project.`;
  return `Browse verified ${type}${loc} on INFRA. View profiles, ratings, portfolios, and contact professionals directly. Find the right expert for your project today.`;
}

export function buildH1(p: ParsedSlug): string {
  const loc = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  if (p.pageType === 'cost') {
    return `${p.serviceLabel ?? 'Engineering Service'} Cost${loc}`;
  }
  if (p.pageType === 'service') {
    return `${p.serviceLabel ?? 'Engineering Service'} Experts${loc}`;
  }
  const type = p.specialty ? `${p.specialty} ${p.discipline}s` : `${p.discipline}s`;
  if (p.pageType === 'hire') return `Hire ${type}${loc}`;
  if (p.pageType === 'best') return `Best ${type}${loc}`;
  if (p.locationDisplay) return `${type} in ${p.locationDisplay}`;
  return `${type} on INFRA`;
}

// ── FAQ generation ────────────────────────────────────────────────────────────

export interface FaqItem { q: string; a: string }

export function buildFaqs(p: ParsedSlug): FaqItem[] {
  const loc = p.locationDisplay ?? 'your area';
  if (p.pageType === 'cost') {
    const svc = p.serviceLabel ?? 'engineering service';
    const range = p.serviceCostRange ?? 'varies based on scope';
    return [
      { q: `How much does ${svc.toLowerCase()} cost in ${loc}?`, a: `The typical cost for ${svc.toLowerCase()} in ${loc} ranges ${range}. Factors include project size, complexity, and engineer experience.` },
      { q: `What affects the cost of ${svc.toLowerCase()}?`, a: 'Key factors include project scope, site conditions, timeline, engineer experience, and local market rates.' },
      { q: `How do I find affordable ${svc.toLowerCase()} engineers in ${loc}?`, a: `Post your project on INFRA and receive quotes from multiple verified engineers in ${loc}. Compare rates and profiles before hiring.` },
      { q: `Is payment secure when hiring through INFRA?`, a: 'Yes. INFRA uses escrow payments — funds are only released to the engineer after you approve the work.' },
    ];
  }
  const type = p.specialty ? `${p.specialty.toLowerCase()} ${(p.discipline ?? 'engineer').toLowerCase()}` : (p.discipline ?? 'engineer').toLowerCase();
  return [
    { q: `How do I hire a ${type} in ${loc}?`, a: `Browse verified ${type}s on INFRA, review their profiles and ratings, then send a connection request or post a job. Payment is protected by escrow.` },
    { q: `How much does a ${type} cost in ${loc}?`, a: `Rates vary by experience and scope. Post your project on INFRA to receive competitive quotes from local professionals.` },
    { q: `Are the engineers on INFRA verified?`, a: 'Yes. Every professional on INFRA goes through identity verification. Licence and certification checks add an extra layer of trust.' },
    { q: `Can I see reviews for ${type}s before hiring?`, a: 'Yes. INFRA shows verified reviews tied to completed, paid transactions — so ratings are authentic.' },
    { q: `What payment methods are available?`, a: 'INFRA supports M-Pesa, PayPal, and bank transfer. All payments are held in escrow until you approve the work.' },
  ];
}

// ── Related-page link generation ─────────────────────────────────────────────

export function buildRelatedLinks(p: ParsedSlug): Array<{ href: string; label: string }> {
  const links: Array<{ href: string; label: string }> = [];

  // Same discipline, different cities in same country
  const COUNTRY_CITIES: Record<string, string[]> = {
    Kenya:        ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'],
    Uganda:       ['kampala', 'entebbe'],
    Tanzania:     ['dar-es-salaam', 'dodoma'],
    Nigeria:      ['lagos', 'abuja'],
    'South Africa': ['johannesburg', 'cape-town', 'durban'],
  };

  if (p.country && COUNTRY_CITIES[p.country]) {
    for (const city of COUNTRY_CITIES[p.country]) {
      const cityLabel = LOCATIONS[city]?.city ?? toTitleCase(city);
      if (cityLabel === p.city) continue;
      const slug = buildSlug({ ...p, city: cityLabel, locationDisplay: cityLabel });
      links.push({ href: `/find/${slug}`, label: `${p.discipline}s in ${cityLabel}` });
    }
  }

  // Same location, different specialties
  const locSuffix = p.locationDisplay ? `-in-${(p.city ?? p.country ?? p.locationDisplay).toLowerCase().replace(/\s+/g, '-')}` : '';
  const RELATED_SPECS = ['civil', 'structural', 'mechanical', 'electrical', 'environmental'];
  for (const spec of RELATED_SPECS) {
    const label = `${SPECIALTIES[spec]} Engineers`;
    const discSlug = 'engineers';
    const slug = spec + '-' + discSlug + locSuffix;
    if (p.specialty === SPECIALTIES[spec]) continue;
    links.push({ href: `/find/${slug}`, label });
  }

  return links.slice(0, 8);
}

/** Turn a ParsedSlug back into a URL-safe slug */
function buildSlug(p: Partial<ParsedSlug>): string {
  const loc = p.city ?? p.country ?? '';
  const locSuffix = loc ? `-in-${loc.toLowerCase().replace(/\s+/g, '-')}` : '';
  const discSlug = p.discipline ? p.discipline.toLowerCase() + 's' : 'engineers';
  const specSlug = p.specialty
    ? p.specialty.toLowerCase().split(' ')[0] + '-'
    : '';
  return `${specSlug}${discSlug}${locSuffix}`;
}

// ── Sitemap URL generation ────────────────────────────────────────────────────

export const ALL_DISCIPLINE_SLUGS = Object.keys(DISCIPLINES).filter(
  (k) => !['engineering', 'architect', 'surveyor', 'contractor', 'consultant', 'designer', 'planner', 'inspector'].includes(k),
);

// Priority locations for build-time pre-generation (highest-traffic combos)
const SITEMAP_LOCATIONS = [
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika', 'nyeri', 'malindi',
  'lagos', 'abuja', 'johannesburg', 'cape-town', 'kampala', 'dar-es-salaam', 'kigali',
  'kenya', 'nigeria', 'south-africa', 'uganda', 'tanzania', 'africa',
];

const SITEMAP_INTENTS = ['', 'hire-', 'best-'];

// ── Job-skill slug parsing ────────────────────────────────────────────────────

export interface ParsedJobSlug {
  valid: boolean;
  skill: string | null;       // e.g. "Plumber"
  skillSlug: string | null;   // e.g. "plumber"
  skillDescription: string | null;
  avgDailyRate: string | null;
  city: string | null;
  country: string | null;
  locationDisplay: string | null;
  raw: string;
}

/** Parse slugs like "plumber-in-nairobi" or "electrician-in-kenya" */
export function parseJobSlug(slug: string): ParsedJobSlug {
  const s = slug.toLowerCase().trim();

  // Find matching skill (longest match first for compound skills like "civil-engineer")
  const sorted = [...JOB_SKILLS].sort((a, b) => b.slug.length - a.slug.length);
  for (const skill of sorted) {
    if (s === skill.slug || s.startsWith(skill.slug + '-in-')) {
      const locPart = s.startsWith(skill.slug + '-in-')
        ? s.slice(skill.slug.length + 4)
        : null;
      const locData = locPart ? LOCATIONS[locPart] : null;
      return {
        valid: true,
        skill: skill.label,
        skillSlug: skill.slug,
        skillDescription: skill.description,
        avgDailyRate: skill.avgDailyRate,
        city: locData?.city ?? null,
        country: locData?.country ?? null,
        locationDisplay: locData?.display ?? (locPart ? toTitleCase(locPart.replace(/-/g, ' ')) : null),
        raw: slug,
      };
    }
  }
  return { valid: false, skill: null, skillSlug: null, skillDescription: null, avgDailyRate: null, city: null, country: null, locationDisplay: null, raw: slug };
}

// ── Tool-category slug parsing ────────────────────────────────────────────────

export interface ParsedToolSlug {
  valid: boolean;
  category: string | null;      // e.g. "Surveying Tools"
  categorySlug: string | null;  // e.g. "surveying-tools"
  categoryDescription: string | null;
  schemaType: 'Product' | 'SoftwareApplication' | null;
  city: string | null;
  country: string | null;
  locationDisplay: string | null;
  raw: string;
}

/** Parse slugs like "surveying-tools-in-nairobi" or "concrete-mixers-in-kenya" */
export function parseToolSlug(slug: string): ParsedToolSlug {
  const s = slug.toLowerCase().trim();
  const sorted = [...TOOL_CATEGORIES].sort((a, b) => b.slug.length - a.slug.length);
  for (const cat of sorted) {
    if (s === cat.slug || s.startsWith(cat.slug + '-in-')) {
      const locPart = s.startsWith(cat.slug + '-in-') ? s.slice(cat.slug.length + 4) : null;
      const locData = locPart ? LOCATIONS[locPart] : null;
      return {
        valid: true,
        category: cat.label,
        categorySlug: cat.slug,
        categoryDescription: cat.description,
        schemaType: cat.schemaType,
        city: locData?.city ?? null,
        country: locData?.country ?? null,
        locationDisplay: locData?.display ?? (locPart ? toTitleCase(locPart.replace(/-/g, ' ')) : null),
        raw: slug,
      };
    }
  }
  return { valid: false, category: null, categorySlug: null, categoryDescription: null, schemaType: null, city: null, country: null, locationDisplay: null, raw: slug };
}

// ── SEO text helpers for job/tool slugs ───────────────────────────────────────

export function buildJobSeoTitle(p: ParsedJobSlug, intent: 'hire' | 'search' = 'hire'): string {
  const loc = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  if (intent === 'hire') return `Hire a ${p.skill}${loc} — Verified Professionals | INFRA`;
  return `${p.skill} Jobs${loc} — Find Work & Hire | INFRA`;
}

export function buildJobSeoDescription(p: ParsedJobSlug, intent: 'hire' | 'search' = 'hire'): string {
  const loc = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  const rate = p.avgDailyRate ? ` Average daily rate: ${p.avgDailyRate}.` : '';
  const plural = JOB_SKILLS.find((s) => s.slug === p.skillSlug)?.plural ?? ((p.skill ?? 'Professional') + 's');
  if (intent === 'hire') {
    return `Find verified ${plural}${loc} on INFRA. Browse profiles, check reviews, and hire safely with escrow payments.${rate}`;
  }
  return `Browse open ${p.skill?.toLowerCase()} jobs${loc} on INFRA. Apply for work, post listings, and connect with clients today.${rate}`;
}

export function buildToolSeoTitle(p: ParsedToolSlug): string {
  const loc = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  return `${p.category}${loc} — Rent or Buy | INFRA`;
}

export function buildToolSeoDescription(p: ParsedToolSlug): string {
  const loc = p.locationDisplay ? ` in ${p.locationDisplay}` : '';
  return `Find ${p.categoryDescription ?? p.category?.toLowerCase() + ' equipment'}${loc} on INFRA. Rent, buy or list your tools and equipment today.`;
}

export function buildJobFaqs(p: ParsedJobSlug): FaqItem[] {
  const loc = p.locationDisplay ?? 'your area';
  const skill = p.skill?.toLowerCase() ?? 'professional';
  const rate = p.avgDailyRate;
  return [
    { q: `How much does a ${skill} charge in ${loc}?`, a: `${rate ? `A ${skill} in ${loc} typically charges ${rate} per day.` : `Rates for ${skill}s in ${loc} vary based on experience and scope.`} Post your job on INFRA to receive competitive quotes.` },
    { q: `How do I hire a reliable ${skill} in ${loc}?`, a: `Browse verified ${skill}s on INFRA, read client reviews, then post your job or send a direct message. Escrow payments protect your money until the work is approved.` },
    { q: `What should I check before hiring a ${skill}?`, a: `Check their INFRA profile for: (1) verified identity badge, (2) client reviews from completed jobs, (3) portfolio photos, and (4) years of experience. All trades on INFRA are ID-verified.` },
    { q: `Is it safe to pay a ${skill} through INFRA?`, a: `Yes. INFRA uses escrow — you deposit funds, the ${skill} does the work, and you release payment only when satisfied. Disputes are handled by INFRA support.` },
    { q: `Can I post a ${skill} job for free on INFRA?`, a: `Yes. Posting a job on INFRA is free. You only pay when you choose to unlock applicant contacts or boost your listing for faster matches.` },
  ];
}

export function buildToolFaqs(p: ParsedToolSlug): FaqItem[] {
  const loc = p.locationDisplay ?? 'your area';
  const cat = p.category?.toLowerCase() ?? 'equipment';
  return [
    { q: `Where can I rent ${cat} in ${loc}?`, a: `Browse ${cat} listings in ${loc} on INFRA. Filter by availability, price and condition. All listings are from verified owners.` },
    { q: `How much does it cost to rent ${cat} in ${loc}?`, a: `Rental rates vary by equipment type and duration. Browse listings on INFRA to compare daily and weekly rates from local suppliers.` },
    { q: `Can I buy used ${cat} on INFRA?`, a: `Yes. Browse the "For Sale" section to buy ${cat} from verified sellers. All sellers on INFRA are identity-verified.` },
    { q: `How do I list my ${cat} for rent?`, a: `Create a free listing on INFRA in under 5 minutes. Add photos, set your daily rate, and start receiving enquiries from local contractors.` },
  ];
}


export const ALL_SPECIALTY_SLUGS = Object.keys(SPECIALTIES);

export const ALL_LOCATION_SLUGS = Object.keys(LOCATIONS).filter((k) => k !== 'africa');

/** Generate every valid SEO slug for the sitemap (discipline × location combinations). */
export function generateAllSlugs(): string[] {
  const result: string[] = [];

  // ── Professionals pages ──────────────────────────────────────────────────
  for (const disc of ALL_DISCIPLINE_SLUGS) {
    result.push(disc);
    for (const loc of ALL_LOCATION_SLUGS) {
      result.push(`${disc}-in-${loc}`);
      result.push(`hire-${disc}-in-${loc}`);
      result.push(`best-${disc}-in-${loc}`);
    }
  }

  // ── Specialty × location ─────────────────────────────────────────────────
  for (const spec of ALL_SPECIALTY_SLUGS) {
    for (const loc of ALL_LOCATION_SLUGS) {
      result.push(`${spec}-engineers-in-${loc}`);
      result.push(`hire-${spec}-engineer-in-${loc}`);
      result.push(`best-${spec}-engineer-in-${loc}`);
    }
    result.push(`${spec}-engineers`);
  }

  // ── Cost pages: service × location ──────────────────────────────────────
  for (const svcKey of Object.keys(SERVICES)) {
    result.push(`${svcKey}-cost`);
    for (const loc of ALL_LOCATION_SLUGS) {
      result.push(`${svcKey}-cost-in-${loc}`);
    }
  }

  // ── Service pages: service × location (hire intent) ─────────────────────
  for (const svcKey of Object.keys(SERVICES)) {
    for (const loc of ALL_LOCATION_SLUGS) {
      result.push(`${svcKey}-engineer-in-${loc}`);
    }
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

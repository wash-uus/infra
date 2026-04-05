/**
 * SEO Matrix Configuration
 *
 * Defines the dimension taxonomy for programmatic SEO page generation.
 * Combined with LOCATIONS from seo-slugs.ts this produces 21,000+ unique URLs:
 *
 *   JOB_SKILLS (25) × LOCATIONS (50+) × intents (hire / search / find)   ≈  3,750
 *   TOOL_CATEGORIES (15) × LOCATIONS            × intents (browse / find) ≈  1,500
 *   Existing disciplines (40+) × LOCATIONS (50+) × intents (3)            ≈ 18,000+
 *                                                             TOTAL        ≈ 23,250+
 */

// ── Job / trade skills ────────────────────────────────────────────────────────

export interface SkillConfig {
  slug: string;
  label: string;
  plural: string;
  description: string;
  avgDailyRate: string;
}

export const JOB_SKILLS: SkillConfig[] = [
  { slug: 'plumber',         label: 'Plumber',       plural: 'Plumbers',      description: 'pipe fitting, water supply, drainage and sanitary installations',      avgDailyRate: 'KES 2,500 – 6,000' },
  { slug: 'electrician',     label: 'Electrician',   plural: 'Electricians',  description: 'wiring, installations, fault diagnosis and electrical maintenance',    avgDailyRate: 'KES 2,500 – 8,000' },
  { slug: 'mason',           label: 'Mason',         plural: 'Masons',        description: 'brick-laying, block work, plastering and concrete finishing',          avgDailyRate: 'KES 1,500 – 4,500' },
  { slug: 'carpenter',       label: 'Carpenter',     plural: 'Carpenters',    description: 'formwork, roofing, furniture making and timber framing',               avgDailyRate: 'KES 2,000 – 5,000' },
  { slug: 'welder',          label: 'Welder',        plural: 'Welders',       description: 'arc welding, MIG/TIG welding, metal fabrication and structural steel', avgDailyRate: 'KES 2,000 – 6,000' },
  { slug: 'painter',         label: 'Painter',       plural: 'Painters',      description: 'interior and exterior painting, surface prep and waterproofing',       avgDailyRate: 'KES 1,500 – 4,000' },
  { slug: 'contractor',      label: 'Contractor',    plural: 'Contractors',   description: 'building construction, renovation, fit-out and project delivery',      avgDailyRate: 'KES 5,000 – 50,000' },
  { slug: 'fundi',           label: 'Fundi',         plural: 'Fundis',        description: 'general building work, artisan repairs and maintenance tasks',         avgDailyRate: 'KES 1,000 – 3,500' },
  { slug: 'tiler',           label: 'Tiler',         plural: 'Tilers',        description: 'floor and wall tiling, waterproofing and screeding',                   avgDailyRate: 'KES 1,500 – 4,000' },
  { slug: 'roofer',          label: 'Roofer',        plural: 'Roofers',       description: 'roofing installation, repairs, gutters and waterproofing',             avgDailyRate: 'KES 2,000 – 6,000' },
  { slug: 'glazier',         label: 'Glazier',       plural: 'Glaziers',      description: 'glass installation, aluminium windows, curtain walls and facades',     avgDailyRate: 'KES 2,500 – 7,000' },
  { slug: 'hvac-technician', label: 'HVAC Technician', plural: 'HVAC Technicians', description: 'air conditioning, ventilation and refrigeration installation and servicing', avgDailyRate: 'KES 3,000 – 10,000' },
  { slug: 'scaffolder',      label: 'Scaffolder',    plural: 'Scaffolders',   description: 'scaffolding erection, dismantling and safety inspection',             avgDailyRate: 'KES 2,000 – 5,000' },
  { slug: 'crane-operator',  label: 'Crane Operator', plural: 'Crane Operators', description: 'tower crane, mobile crane and lifting operations on construction sites', avgDailyRate: 'KES 4,000 – 12,000' },
  { slug: 'excavator-operator', label: 'Excavator Operator', plural: 'Excavator Operators', description: 'earthworks, trenching, site clearing and excavation',   avgDailyRate: 'KES 4,000 – 12,000' },
  { slug: 'site-supervisor', label: 'Site Supervisor', plural: 'Site Supervisors', description: 'construction site management, QA/QC and progress monitoring',    avgDailyRate: 'KES 3,000 – 10,000' },
  { slug: 'quantity-surveyor', label: 'Quantity Surveyor', plural: 'Quantity Surveyors', description: 'cost estimation, bills of quantities and contract administration', avgDailyRate: 'KES 4,000 – 15,000' },
  { slug: 'civil-engineer',  label: 'Civil Engineer', plural: 'Civil Engineers', description: 'roads, drainage, water supply, structural and infrastructure design', avgDailyRate: 'KES 5,000 – 25,000' },
  { slug: 'structural-engineer', label: 'Structural Engineer', plural: 'Structural Engineers', description: 'building frames, foundations, load analysis and structural design', avgDailyRate: 'KES 6,000 – 30,000' },
  { slug: 'plumbing-engineer', label: 'Plumbing Engineer', plural: 'Plumbing Engineers', description: 'commercial plumbing design, hot water systems and fire services', avgDailyRate: 'KES 5,000 – 20,000' },
  { slug: 'electrical-engineer', label: 'Electrical Engineer', plural: 'Electrical Engineers', description: 'power systems, lighting design, earthing and panel boards', avgDailyRate: 'KES 5,000 – 25,000' },
  { slug: 'draughtsman',     label: 'Draughtsman',   plural: 'Draughtsmen',   description: 'CAD drafting, architectural drawings, as-built plans',                avgDailyRate: 'KES 2,500 – 8,000' },
  { slug: 'land-surveyor',   label: 'Land Surveyor', plural: 'Land Surveyors', description: 'boundary surveys, topographic surveys and GPS mapping',              avgDailyRate: 'KES 4,000 – 15,000' },
  { slug: 'project-manager', label: 'Project Manager', plural: 'Project Managers', description: 'construction project delivery, scheduling and stakeholder management', avgDailyRate: 'KES 5,000 – 30,000' },
  { slug: 'interior-designer', label: 'Interior Designer', plural: 'Interior Designers', description: 'space planning, finishes, furniture and decorative design', avgDailyRate: 'KES 3,000 – 15,000' },
];

// ── Tool / equipment categories ───────────────────────────────────────────────

export interface ToolCategoryConfig {
  slug: string;
  label: string;
  description: string;
  schemaType: 'Product' | 'SoftwareApplication';
}

export const TOOL_CATEGORIES: ToolCategoryConfig[] = [
  { slug: 'construction-software',    label: 'Construction Software',    description: 'project management, estimating and scheduling software for construction',  schemaType: 'SoftwareApplication' },
  { slug: 'project-management-tools', label: 'Project Management Tools', description: 'tools and software for managing construction projects and teams',          schemaType: 'SoftwareApplication' },
  { slug: 'surveying-tools',          label: 'Surveying Tools',          description: 'total stations, GPS equipment, levels and theodolites for rent or sale',   schemaType: 'Product' },
  { slug: 'cad-software',             label: 'CAD Software',             description: 'AutoCAD, Revit, ArchiCAD and BIM tools for engineering drawings',          schemaType: 'SoftwareApplication' },
  { slug: 'excavators',               label: 'Excavators',               description: 'mini excavators, standard excavators and long reach excavators for hire',  schemaType: 'Product' },
  { slug: 'scaffolding',              label: 'Scaffolding',              description: 'ringlock, kwikstage and tube-and-coupler scaffolding systems for rent',     schemaType: 'Product' },
  { slug: 'concrete-mixers',          label: 'Concrete Mixers',          description: 'drum mixers, forced action mixers and concrete pumps for construction',    schemaType: 'Product' },
  { slug: 'generators',               label: 'Generators',               description: 'diesel and petrol generators for construction sites and events',            schemaType: 'Product' },
  { slug: 'compactors',               label: 'Compactors',               description: 'vibratory plate compactors, rammers and rollers for earthworks',           schemaType: 'Product' },
  { slug: 'levelling-equipment',      label: 'Levelling Equipment',      description: 'auto levels, laser levels and staff levels for surveying and setting out',  schemaType: 'Product' },
  { slug: 'power-tools',              label: 'Power Tools',              description: 'drills, grinders, saws and impact drivers for construction work',           schemaType: 'Product' },
  { slug: 'formwork',                 label: 'Formwork',                 description: 'timber, steel and aluminium formwork systems for concrete construction',    schemaType: 'Product' },
  { slug: 'safety-equipment',         label: 'Safety Equipment',         description: 'PPE, harnesses, helmets and safety nets for construction sites',            schemaType: 'Product' },
  { slug: 'testing-equipment',        label: 'Testing Equipment',        description: 'concrete testers, moisture meters, GPS and geotechnical equipment',        schemaType: 'Product' },
  { slug: 'cranes',                   label: 'Cranes',                   description: 'tower cranes, mobile cranes and mini cranes for hire on construction projects', schemaType: 'Product' },
];

// ── Priority locations (Kenya-first, expandable) ─────────────────────────────

export const PRIORITY_LOCATIONS = [
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret',
  'thika', 'nyeri', 'malindi',
  'lagos', 'abuja', 'johannesburg', 'cape-town',
  'kampala', 'dar-es-salaam', 'kigali',
  'kenya', 'nigeria', 'south-africa', 'uganda', 'tanzania',
] as const;

export type PriorityLocation = (typeof PRIORITY_LOCATIONS)[number];

// ── URL builders ──────────────────────────────────────────────────────────────

/** /hire/plumber-in-nairobi */
export function buildHireSlug(skill: string, location: string): string {
  return `${skill}-in-${location}`;
}

/** /jobs/search/electrician-in-nairobi */
export function buildJobSearchSlug(skill: string, location: string): string {
  return `${skill}-in-${location}`;
}

/** /tools/browse/surveying-tools-in-nairobi */
export function buildToolBrowseSlug(category: string, location: string): string {
  return `${category}-in-${location}`;
}

// ── Matrix URL generators (for sitemap) ──────────────────────────────────────

export function generateHireSlugs(): string[] {
  const slugs: string[] = [];
  for (const skill of JOB_SKILLS) {
    slugs.push(skill.slug); // /hire/plumber (no location)
    for (const loc of PRIORITY_LOCATIONS) {
      slugs.push(buildHireSlug(skill.slug, loc));
    }
  }
  return slugs;
}

export function generateJobSearchSlugs(): string[] {
  const slugs: string[] = [];
  for (const skill of JOB_SKILLS) {
    slugs.push(skill.slug);
    for (const loc of PRIORITY_LOCATIONS) {
      slugs.push(buildJobSearchSlug(skill.slug, loc));
    }
  }
  return slugs;
}

export function generateToolBrowseSlugs(): string[] {
  const slugs: string[] = [];
  for (const cat of TOOL_CATEGORIES) {
    slugs.push(cat.slug);
    for (const loc of PRIORITY_LOCATIONS) {
      slugs.push(buildToolBrowseSlug(cat.slug, loc));
    }
  }
  return slugs;
}

/**
 * Approximate total SEO page count across all dimensions.
 *
 *  Hire pages:            25 skills × 21 locs = 525   (+25 no-location)
 *  Job Search pages:      25 skills × 21 locs = 525   (+25 no-location)
 *  Tool Browse pages:     15 cats   × 21 locs = 315   (+15 no-location)
 *  Find (professionals):  40 disc   × 50 locs × 3 intents = 6,000+
 *  Service / cost pages:  20 svcs   × 50 locs × 2 = 2,000+
 *  Specialty combos:      30 specs  × 50 locs × 3 = 4,500+
 *                                         TOTAL    ≈ 14,000+   (grows with locations)
 */
export const SEO_PAGE_ESTIMATE = 14_000;

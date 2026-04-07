/**
 * INFRA Match Scoring Engine
 *
 * Computes a 0–100 match score between a professional's profile and a job posting.
 * Scores are stored on job applications and exposed in the admin panel + job owner UI.
 *
 * Scoring breakdown (total = 100 pts):
 *   - Skills/disciplines match:  35 pts
 *   - Location relevance:        20 pts
 *   - Experience weighting:      20 pts
 *   - Specialties overlap:       15 pts
 *   - Rating/reputation signal:  10 pts
 *
 * Each dimension receives a score explanation so users and admins can see WHY
 * a candidate scored the way they did (transparent matching).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchDimension {
  score: number;       // 0–max for this dimension
  max:   number;       // max points for this dimension
  pct:   number;       // 0–100 percentage for display
  label: string;       // human-readable label
  reason: string;      // explanation text
}

export interface MatchResult {
  totalScore:  number;               // 0–100
  breakdown:   MatchDimension[];     // per-dimension scores + explanations
  matchGrade:  'A+' | 'A' | 'B' | 'C' | 'D';  // for UI badges
  topStrength: string;               // "3/4 required disciplines match"
  mainGap:     string | null;        // "Missing: Geotechnical Engineering"
}

interface ProfessionalProfile {
  disciplines?:    string[];
  specialties?:    string[];
  country?:        string;
  city?:           string;
  yearsExperience?: number;
  averageRating?:  number;
  totalReviews?:   number;
  verificationStatus?: string;
}

interface JobPosting {
  requiredDisciplines?: string[];
  requiredSpecialties?: string[];
  minExperience?:       number;
  country?:             string;
  city?:                string;
  isRemote?:            boolean;
  disciplines?:         string[];  // alias
  category?:            string;
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}

function overlap(a: string[], b: string[]): { matched: string[]; missing: string[] } {
  const normA = a.map(normalize);
  const normB = b.map(normalize);
  const matched = normA.filter((x) => normB.includes(x));
  const missing = normB.filter((x) => !normA.includes(x));
  return { matched, missing };
}

// ── Dimension scorers ─────────────────────────────────────────────────────────

function scoreDisciplines(prof: ProfessionalProfile, job: JobPosting): MatchDimension {
  const MAX = 35;
  const required = (job.requiredDisciplines ?? job.disciplines ?? []).filter(Boolean);
  const profDisc = (prof.disciplines ?? []).filter(Boolean);

  if (required.length === 0) {
    return { score: MAX, max: MAX, pct: 100, label: 'Skills Match', reason: 'No specific disciplines required for this role.' };
  }

  if (profDisc.length === 0) {
    return { score: 0, max: MAX, pct: 0, label: 'Skills Match', reason: 'Missing: Add your engineering disciplines to your profile.' };
  }

  const { matched, missing } = overlap(profDisc, required);
  const ratio = matched.length / required.length;
  const score = Math.round(MAX * ratio);

  const reason = matched.length === required.length
    ? `All ${required.length} required discipline${required.length > 1 ? 's' : ''} match.`
    : matched.length > 0
      ? `${matched.length}/${required.length} disciplines match. Missing: ${missing.slice(0, 2).join(', ')}.`
      : `None of the required disciplines match (${required.slice(0, 2).join(', ')}).`;

  return { score, max: MAX, pct: Math.round(ratio * 100), label: 'Skills Match', reason };
}

function scoreLocation(prof: ProfessionalProfile, job: JobPosting): MatchDimension {
  const MAX = 20;

  if (job.isRemote) {
    return { score: MAX, max: MAX, pct: 100, label: 'Location', reason: 'Remote role — location is not a factor.' };
  }

  if (!job.country) {
    return { score: MAX * 0.8 | 0, max: MAX, pct: 80, label: 'Location', reason: 'No location specified in job posting.' };
  }

  const profCountry = normalize(prof.country ?? '');
  const jobCountry  = normalize(job.country);

  if (!profCountry) {
    return { score: 0, max: MAX, pct: 0, label: 'Location', reason: 'Set your country on your profile to improve location matching.' };
  }

  if (profCountry !== jobCountry) {
    return { score: 5, max: MAX, pct: 25, label: 'Location', reason: `Cross-border role: job in ${job.country}, you are based in ${prof.country}.` };
  }

  // Same country — check city
  const profCity = normalize(prof.city ?? '');
  const jobCity  = normalize(job.city ?? '');

  if (!jobCity || !profCity || profCity === jobCity) {
    return { score: MAX, max: MAX, pct: 100, label: 'Location', reason: `Same ${job.city ? 'city' : 'country'} — strong location match.` };
  }

  return { score: 14, max: MAX, pct: 70, label: 'Location', reason: `Same country, different city. Job: ${job.city}, You: ${prof.city}.` };
}

function scoreExperience(prof: ProfessionalProfile, job: JobPosting): MatchDimension {
  const MAX = 20;
  const profYears = prof.yearsExperience ?? 0;
  const minYears  = job.minExperience ?? 0;

  if (minYears === 0) {
    return { score: MAX, max: MAX, pct: 100, label: 'Experience', reason: 'No minimum experience required.' };
  }

  if (profYears >= minYears * 1.5) {
    return { score: MAX, max: MAX, pct: 100, label: 'Experience', reason: `${profYears} yrs experience — exceeds requirement (${minYears} yrs).` };
  }

  if (profYears >= minYears) {
    return { score: Math.round(MAX * 0.85), max: MAX, pct: 85, label: 'Experience', reason: `${profYears} yrs experience meets the ${minYears} yr minimum.` };
  }

  if (profYears >= minYears * 0.7) {
    return { score: Math.round(MAX * 0.5), max: MAX, pct: 50, label: 'Experience', reason: `${profYears} yrs is slightly below the ${minYears} yr requirement.` };
  }

  return { score: Math.round(MAX * 0.2), max: MAX, pct: 20, label: 'Experience', reason: `${profYears} yrs experience is significantly below the ${minYears} yr requirement.` };
}

function scoreSpecialties(prof: ProfessionalProfile, job: JobPosting): MatchDimension {
  const MAX = 15;
  const required = (job.requiredSpecialties ?? []).filter(Boolean);
  const profSpec  = (prof.specialties ?? []).filter(Boolean);

  if (required.length === 0) {
    return { score: MAX, max: MAX, pct: 100, label: 'Specialties', reason: 'No specific specialties required.' };
  }

  if (profSpec.length === 0) {
    return { score: Math.round(MAX * 0.3), max: MAX, pct: 30, label: 'Specialties', reason: 'Adding specialties to your profile improves match quality.' };
  }

  const { matched, missing } = overlap(profSpec, required);
  const ratio = matched.length / required.length;
  const score = Math.round(MAX * ratio);

  const reason = matched.length === required.length
    ? `All required specialties match.`
    : `${matched.length}/${required.length} specialties match.${missing.length > 0 ? ` Missing: ${missing.slice(0, 2).join(', ')}.` : ''}`;

  return { score, max: MAX, pct: Math.round(ratio * 100), label: 'Specialties', reason };
}

function scoreReputation(prof: ProfessionalProfile): MatchDimension {
  const MAX = 10;
  const rating  = prof.averageRating ?? 0;
  const reviews = prof.totalReviews  ?? 0;
  const isVerified = prof.verificationStatus === 'verified';

  let score  = 0;
  let reason = '';

  if (rating >= 4.5 && reviews >= 5) {
    score  = MAX;
    reason = `Highly rated (${rating}★ from ${reviews} reviews)${isVerified ? ' — Verified ✓' : ''}.`;
  } else if (rating >= 4.0 && reviews >= 2) {
    score  = Math.round(MAX * 0.8);
    reason = `Good rating (${rating}★ from ${reviews} reviews).`;
  } else if (reviews >= 1) {
    score  = Math.round(MAX * 0.5);
    reason = `${reviews} review${reviews > 1 ? 's' : ''} — building reputation.`;
  } else {
    score  = Math.round(MAX * 0.2);
    reason = 'No reviews yet. Complete a project to build your reputation score.';
  }

  if (isVerified && score < MAX) {
    score  = Math.min(score + 2, MAX);
    reason += ' Verified account.';
  }

  return { score, max: MAX, pct: Math.round((score / MAX) * 100), label: 'Reputation', reason };
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function computeMatchScore(
  professional: ProfessionalProfile,
  job: JobPosting,
): MatchResult {
  const dimensions: MatchDimension[] = [
    scoreDisciplines(professional, job),
    scoreLocation(professional, job),
    scoreExperience(professional, job),
    scoreSpecialties(professional, job),
    scoreReputation(professional),
  ];

  const totalScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0));

  const matchGrade: MatchResult['matchGrade'] =
    totalScore >= 90 ? 'A+' :
    totalScore >= 75 ? 'A'  :
    totalScore >= 60 ? 'B'  :
    totalScore >= 45 ? 'C'  : 'D';

  // Top strength = highest-scoring dimension
  const topDim    = [...dimensions].sort((a, b) => (b.score / b.max) - (a.score / a.max))[0];
  const topStrength = topDim.reason;

  // Main gap = lowest-scoring dimension that has room to improve
  const gapDims = dimensions.filter((d) => d.score < d.max).sort((a, b) => a.pct - b.pct);
  const mainGap = gapDims.length > 0 ? gapDims[0].reason : null;

  return { totalScore, breakdown: dimensions, matchGrade, topStrength, mainGap };
}

// ── Score and store a job application ────────────────────────────────────────
// Call this after an application is created.

export async function scoreApplication(
  applicationId: string,
  professional: ProfessionalProfile,
  job: JobPosting,
  db: FirebaseFirestore.Firestore,
): Promise<MatchResult> {
  const result = computeMatchScore(professional, job);

  // Persist to application doc for fast querying
  await db.collection('jobApplications').doc(applicationId).set(
    {
      matchScore:     result.totalScore,
      matchGrade:     result.matchGrade,
      matchBreakdown: result.breakdown.map((d) => ({
        label:  d.label,
        score:  d.score,
        max:    d.max,
        pct:    d.pct,
        reason: d.reason,
      })),
      matchScoredAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return result;
}

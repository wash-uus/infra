/**
 * Match scoring utility (jobs-service internal copy)
 *
 * Computes 0–100 fit score between a job posting and a professional profile.
 * Keeps the jobs-service independently deployable — no monolith imports.
 */

export interface MatchDimension {
  score: number;
  max:   number;
  pct:   number;
  label: string;
  reason: string;
}

export interface MatchResult {
  totalScore:  number;
  breakdown:   MatchDimension[];
  matchGrade:  'A+' | 'A' | 'B' | 'C' | 'D';
  topStrength: string;
  mainGap:     string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}

function overlap(a: string[], b: string[]): { matched: string[]; missing: string[] } {
  const normA = a.map(normalize);
  const normB = b.map(normalize);
  return {
    matched: normA.filter((x) => normB.includes(x)),
    missing: normB.filter((x) => !normA.includes(x)),
  };
}

function scoreDisciplines(prof: Record<string, any>, job: Record<string, any>): MatchDimension {
  const MAX = 35;
  const required = ((job.requiredDisciplines ?? job.disciplines ?? []) as string[]).filter(Boolean);
  const profDisc = ((prof.disciplines ?? []) as string[]).filter(Boolean);
  if (!required.length) return { score: MAX, max: MAX, pct: 100, label: 'Skills Match', reason: 'No specific disciplines required.' };
  if (!profDisc.length) return { score: 0, max: MAX, pct: 0, label: 'Skills Match', reason: 'Add your disciplines to your profile.' };
  const { matched, missing } = overlap(profDisc, required);
  const ratio = matched.length / required.length;
  const reason = matched.length === required.length
    ? `All ${required.length} required discipline${required.length > 1 ? 's' : ''} match.`
    : `${matched.length}/${required.length} disciplines match.${missing.length ? ` Missing: ${missing.slice(0, 2).join(', ')}.` : ''}`;
  return { score: Math.round(MAX * ratio), max: MAX, pct: Math.round(ratio * 100), label: 'Skills Match', reason };
}

function scoreLocation(prof: Record<string, any>, job: Record<string, any>): MatchDimension {
  const MAX = 20;
  if (job.isRemote) return { score: MAX, max: MAX, pct: 100, label: 'Location', reason: 'Remote role — location is not a factor.' };
  if (!job.country) return { score: 16, max: MAX, pct: 80, label: 'Location', reason: 'No location specified.' };
  const profCountry = normalize(prof.country ?? '');
  const jobCountry  = normalize(job.country);
  if (!profCountry) return { score: 0, max: MAX, pct: 0, label: 'Location', reason: 'Set your country on your profile.' };
  if (profCountry !== jobCountry) return { score: 5, max: MAX, pct: 25, label: 'Location', reason: `Cross-border: job in ${job.country}, you in ${prof.country}.` };
  const sameCity = prof.city && job.city && normalize(prof.city) === normalize(job.city);
  return sameCity
    ? { score: MAX, max: MAX, pct: 100, label: 'Location', reason: `Same city (${job.city}).` }
    : { score: 14, max: MAX, pct: 70, label: 'Location', reason: 'Same country, different city.' };
}

function scoreExperience(prof: Record<string, any>, job: Record<string, any>): MatchDimension {
  const MAX = 20;
  const yrs = prof.yearsExperience ?? 0;
  const min = job.minExperience ?? 0;
  if (!min) return { score: MAX, max: MAX, pct: 100, label: 'Experience', reason: 'No minimum experience required.' };
  if (yrs >= min * 1.5) return { score: MAX, max: MAX, pct: 100, label: 'Experience', reason: `${yrs} yrs exceeds requirement (${min} yrs).` };
  if (yrs >= min)       return { score: Math.round(MAX * 0.85), max: MAX, pct: 85, label: 'Experience', reason: `${yrs} yrs meets the ${min} yr minimum.` };
  if (yrs >= min * 0.7) return { score: Math.round(MAX * 0.5),  max: MAX, pct: 50, label: 'Experience', reason: `${yrs} yrs slightly below ${min} yr requirement.` };
  return { score: Math.round(MAX * 0.2), max: MAX, pct: 20, label: 'Experience', reason: `${yrs} yrs well below ${min} yr requirement.` };
}

function scoreSpecialties(prof: Record<string, any>, job: Record<string, any>): MatchDimension {
  const MAX = 15;
  const required = ((job.requiredSpecialties ?? []) as string[]).filter(Boolean);
  const profSpec  = ((prof.specialties ?? []) as string[]).filter(Boolean);
  if (!required.length) return { score: MAX, max: MAX, pct: 100, label: 'Specialties', reason: 'No specialties required.' };
  if (!profSpec.length)  return { score: Math.round(MAX * 0.3), max: MAX, pct: 30, label: 'Specialties', reason: 'Add specialties to your profile.' };
  const { matched, missing } = overlap(profSpec, required);
  const ratio = matched.length / required.length;
  const reason = matched.length === required.length
    ? 'All specialties match.'
    : `${matched.length}/${required.length} specialties match.${missing.length ? ` Missing: ${missing.slice(0, 2).join(', ')}.` : ''}`;
  return { score: Math.round(MAX * ratio), max: MAX, pct: Math.round(ratio * 100), label: 'Specialties', reason };
}

function scoreReputation(prof: Record<string, any>): MatchDimension {
  const MAX = 10;
  const rating  = prof.averageRating ?? 0;
  const reviews = prof.totalReviews  ?? 0;
  const verified = prof.verificationStatus === 'verified';
  let score = 0;
  let reason = '';
  if (rating >= 4.5 && reviews >= 5) { score = MAX; reason = `Highly rated (${rating}★ from ${reviews} reviews).`; }
  else if (rating >= 4.0 && reviews >= 2) { score = Math.round(MAX * 0.8); reason = `Good rating (${rating}★).`; }
  else if (reviews >= 1) { score = Math.round(MAX * 0.5); reason = `${reviews} review${reviews > 1 ? 's' : ''}.`; }
  else { score = Math.round(MAX * 0.2); reason = 'No reviews yet.'; }
  if (verified && score < MAX) { score = Math.min(score + 2, MAX); reason += ' Verified ✓'; }
  return { score, max: MAX, pct: Math.round((score / MAX) * 100), label: 'Reputation', reason };
}

export function computeMatchScore(
  professional: Record<string, any>,
  job: Record<string, any>,
): MatchResult {
  const dimensions = [
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

  const topDim    = [...dimensions].sort((a, b) => (b.score / b.max) - (a.score / a.max))[0];
  const gapDims   = dimensions.filter((d) => d.score < d.max).sort((a, b) => a.pct - b.pct);

  return {
    totalScore,
    breakdown:   dimensions,
    matchGrade,
    topStrength: topDim.reason,
    mainGap:     gapDims.length > 0 ? gapDims[0].reason : null,
  };
}

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors';

// ── Reusable primitives ──────────────────────────────────────────────────────

const nonEmptyString = z.string().trim().min(1, 'Must not be empty');
const positiveNumber = z.number().positive('Must be a positive number').finite('Must be a finite number');

// ── Transaction schemas ──────────────────────────────────────────────────────

export const createTransactionSchema = z.object({
  jobId: z.string().optional(),
  toolId: z.string().optional(),
  professionalId: nonEmptyString,
  amount: z.union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(positiveNumber),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP']).default('KES'),
  paymentMethod: z.enum(['mpesa', 'paypal', 'stripe', 'bank_transfer']),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.jobId || data.toolId,
  { message: 'Either jobId or toolId must be provided' },
);

export const mpesaStkPushSchema = z.object({
  amount: z.union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(positiveNumber),
  phone: z.string().regex(/^(?:\+?254|0)\d{9}$/, 'Invalid Kenyan phone number'),
  transactionId: nonEmptyString,
});

export const paypalCreateOrderSchema = z.object({
  amount: z.union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(positiveNumber),
  currency: z.enum(['USD', 'EUR', 'GBP', 'KES']).default('USD'),
  transactionId: nonEmptyString,
});

export const paypalCaptureOrderSchema = z.object({
  orderId: nonEmptyString,
  transactionId: nonEmptyString,
});

// ── Job schemas ──────────────────────────────────────────────────────────────

export const createJobSchema = z.object({
  listingType: z.enum(['hiring', 'offering', 'seeking']).default('hiring'),
  title: nonEmptyString.max(200),
  description: nonEmptyString.max(5000),
  category: z.string().max(100).default(''),
  disciplineId: z.string().optional(),
  specialtyId: z.string().optional(),
  location: z.string().max(200).default(''),
  country: z.string().max(100).optional(),
  isRemote: z.boolean().default(false),
  budget: positiveNumber.optional(),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP']).default('KES'),
  deadline: z.string().optional(),
  professionalId: z.string().optional(),
  serviceType: z.string().max(100).optional(),
  requirements: z.array(z.string().max(500)).max(20).default([]),
});

// Applied to POST /:id/apply — enforces body size limits and type safety.
export const applyToJobSchema = z.object({
  coverLetter: z.string().max(3000).optional(),
  proposedRate: z.union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .pipe(positiveNumber)
    .optional(),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP']).optional(),
});

export const updateJobSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  description: nonEmptyString.max(5000).optional(),
  category: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  isRemote: z.boolean().optional(),
  budget: positiveNumber.optional(),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP']).optional(),
  deadline: z.string().optional(),
  status: z.enum(['posted', 'accepted', 'in_progress', 'submitted', 'approved', 'completed', 'cancelled', 'archived']).optional(),
  requirements: z.array(z.string().max(500)).max(20).optional(),
  professionalId: z.string().optional(),
  serviceType: z.string().max(100).optional(),
  disciplineId: z.string().optional(),
  specialtyId: z.string().optional(),
});

// ── Tool schemas ─────────────────────────────────────────────────────────────

export const createToolSchema = z.object({
  listingType: z.enum(['selling', 'renting', 'wanted']).default('renting'),
  title: nonEmptyString.max(200),
  description: nonEmptyString.max(5000),
  category: z.enum([
    'surveying', 'construction', 'testing', 'software',
    'drone', 'safety', 'electrical', 'plumbing', 'other',
  ]).default('other'),
  location: z.string().max(200).default(''),
  country: z.string().max(100).optional(),
  price: positiveNumber.optional(),
  dailyRate: positiveNumber.optional(),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP']).default('KES'),
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().max(200).optional(),
    order: z.number().int().min(0),
  })).max(10).default([]),
  condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor']).optional(),
});

export const updateToolSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  description: nonEmptyString.max(5000).optional(),
  category: z.enum([
    'surveying', 'construction', 'testing', 'software',
    'drone', 'safety', 'electrical', 'plumbing', 'other',
  ]).optional(),
  location: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  price: positiveNumber.optional(),
  dailyRate: positiveNumber.optional(),
  currency: z.enum(['KES', 'USD', 'EUR', 'GBP']).optional(),
  isAvailable: z.boolean().optional(),
  condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor']).optional(),
});

// ── User profile schemas ─────────────────────────────────────────────────────

const ALLOWED_SELF_ROLES = ['client', 'professional', 'vendor'] as const;

export const upsertProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  role: z.enum(ALLOWED_SELF_ROLES).optional(),
  companyName: z.string().max(200).optional(),
  jobTitle: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  hourlyRate: positiveNumber.optional(),
  availabilityStatus: z.enum(['available', 'busy', 'unavailable']).optional(),
  disciplines: z.array(z.string()).max(10).optional(),
  specialties: z.array(z.string()).max(20).optional(),
  equipment: z.array(z.string()).max(50).optional(),
  // Professional profile links
  portfolioUrl: z.string().url('portfolioUrl must be a valid URL').max(500).optional().or(z.literal('')),
  linkedinUrl:  z.string().url('linkedinUrl must be a valid URL').max(500).optional().or(z.literal('')),
  // Location detail from map picker
  continent: z.string().max(100).optional(),
  lat:        z.number().optional(),
  lng:        z.number().optional(),
  town:       z.string().max(200).optional(),
  location:   z.string().max(500).optional(),
  // Viral growth: referral attribution (only consumed on first profile creation)
  referredBy: z.string().min(6).max(20).optional(),
});

// ── File upload validation ───────────────────────────────────────────────────

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;    // 5 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Detect the true MIME type from the first 12 bytes of a file buffer.
 * Returns null when the signature matches nothing on the allowlist.
 *
 * Supported signatures:
 *   JPEG   — FF D8 FF
 *   PNG    — 89 50 4E 47 0D 0A 1A 0A
 *   GIF    — 47 49 46 38 (GIF87a / GIF89a)
 *   WebP   — 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  (RIFF....WEBP)
 *   PDF    — 25 50 44 46  (%PDF)
 */
function detectMagicMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';

  // GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return 'image/gif';
  }

  // WebP — RIFF container with WEBP fourcc at offset 8
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';

  // PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'application/pdf';
  }

  return null;
}

export function validateImageUpload(file: Express.Multer.File): void {
  // Verify actual file content via magic bytes — rejects MIME-spoofed uploads.
  // file.buffer is populated by multer memoryStorage (used in all upload routes).
  const detected = detectMagicMime(file.buffer);
  if (!detected || !IMAGE_MIME_TYPES.has(detected)) {
    throw new ValidationError({
      file: [`Invalid file content. Allowed types: JPEG, PNG, GIF, WebP.`],
    });
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new ValidationError({
      file: [`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 5 MB.`],
    });
  }
}

export function validateDocumentUpload(file: Express.Multer.File): void {
  const detected = detectMagicMime(file.buffer);
  if (!detected || !DOCUMENT_MIME_TYPES.has(detected)) {
    throw new ValidationError({
      file: [`Invalid file content. Allowed types: JPEG, PNG, GIF, WebP, PDF.`],
    });
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new ValidationError({
      file: [`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 10 MB.`],
    });
  }
}

// ── Subscription schemas ─────────────────────────────────────────────────────

export const initiateSubscriptionSchema = z.object({
  tier: z.enum(['pro', 'elite']),
  currency: z.enum(['KES', 'USD']).default('KES'),
  paymentMethod: z.enum(['mpesa', 'paypal']),
});

export const subscriptionMpesaSchema = z.object({
  subscriptionId: nonEmptyString,
  phone: z.string().regex(/^(?:\+?254|0)\d{9}$/, 'Invalid Kenyan phone number'),
});

export const subscriptionPaypalCreateSchema = z.object({
  subscriptionId: nonEmptyString,
});

export const subscriptionPaypalCaptureSchema = z.object({
  subscriptionId: nonEmptyString,
  orderId: nonEmptyString,
});

// ── Review schemas ────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  reviewedUserId: nonEmptyString,
  jobId: z.string().optional(),
  toolId: z.string().optional(),
  transactionId: z.string().optional(),
  reviewType: z.enum(['client', 'professional', 'general']).default('general'),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: nonEmptyString.max(2000),
  communicationRating: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  timelinessRating: z.number().int().min(1).max(5).optional(),
});

export const respondToReviewSchema = z.object({
  response: nonEmptyString.max(1000),
});

export const flagReviewSchema = z.object({
  reason: nonEmptyString.max(500),
});

// ── Notification schemas ──────────────────────────────────────────────────────

export const saveFcmTokenSchema = z.object({
  fcmToken: nonEmptyString.max(512),
});

// ── Middleware helper ─────────────────────────────────────────────────────────

/**
 * Creates Express middleware that validates req.body against a Zod schema.
 * On success, replaces req.body with the parsed (and sanitized) output.
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '_root';
        (errors[path] ??= []).push(issue.message);
      }
      next(new ValidationError(errors));
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Share event schema ────────────────────────────────────────────────────────
export const logShareEventSchema = z.object({
  type: z.enum(['job', 'tool', 'profile']),
  entityId: z.string().min(1).max(100),
  channel: z.enum(['whatsapp', 'copy', 'twitter']),
});

// ── Shared Enums ─────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'professional' | 'vendor' | 'admin';
export type VerificationStatus = 'unverified' | 'identity_verified' | 'license_verified';
export type SubscriptionTier = 'free' | 'pro' | 'elite' | 'unlimited';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type DocumentType =
  | 'national_id'
  | 'passport'
  | 'license'
  | 'certificate'
  | 'portfolio'
  | 'other';

export type JobListingType = 'hiring' | 'offering' | 'seeking';
export type JobStatus = 'posted' | 'accepted' | 'in_progress' | 'submitted' | 'approved' | 'completed' | 'cancelled' | 'archived';
export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';

export type ToolListingType = 'selling' | 'renting' | 'wanted';
export type ToolCategory =
  | 'surveying'
  | 'construction'
  | 'testing'
  | 'software'
  | 'drone'
  | 'safety'
  | 'electrical'
  | 'plumbing'
  | 'other';

export type TransactionStatus = 'pending' | 'deposited' | 'in_progress' | 'completed' | 'released' | 'disputed' | 'refunded';
export type PaymentMethod = 'mpesa' | 'paypal' | 'stripe';

export type MicrotransactionType =
  | 'applicant_unlock'
  | 'application_boost'
  | 'profile_highlight'
  | 'job_boost';
export type MicrotransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type NotificationType =
  | 'message'
  | 'job_update'
  | 'tool_update'
  | 'transaction'
  | 'application'
  | 'connection'
  | 'review'
  | 'system';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type ContactType = 'phone' | 'whatsapp' | 'email';
export type VisibilityLevel = 'private' | 'connection_only' | 'public';

// ── User / Profile ────────────────────────────────────────────────────────────

/**
 * Embedded subscription record on the user document.
 * This is the ONLY place subscription state lives — the legacy
 * `subscriptionTier`, `subscriptionTierExpiry`, and `planExpiresAt`
 * fields have been removed. Always read via getEffectiveTier().
 */
export interface UserSubscription {
  tier: SubscriptionTier;
  /** null = free tier (no expiry). Paid tiers always have an expiresAt. */
  expiresAt: FirebaseFirestore.Timestamp | null;
}

export interface UserProfile {
  uid: string;                         // Firebase Auth UID
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  /** Authoritative subscription state. Read tier via getEffectiveTier(), never directly. */
  subscription: UserSubscription;

  // Professional info
  companyName?: string;
  jobTitle?: string;
  bio?: string;
  country?: string;
  city?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';

  // Linked data (stored as subcollection or array of IDs)
  disciplines?: string[];              // IDs
  specialties?: string[];              // IDs
  certifications?: UserCertification[];
  equipment?: string[];                // IDs

  // Stats (denormalized for fast reads)
  averageRating: number;
  totalReviews: number;
  completedProjects: number;
  totalJobs: number;
  totalTools: number;
  /** Denormalized unread notification count for O(1) badge updates */
  unreadNotificationCount: number;

  // Location (extended)
  continent?: string;
  lat?: number;
  lng?: number;
  town?: string;
  location?: string;

  // Portfolio
  portfolioUrl?: string;
  linkedinUrl?: string;

  // Verification
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;

  // Subscription metadata
  stripeCustomerId?: string;
  referralCode?: string;
  referralCount?: number;
  bonusListings?: number;
  referredBy?: string;

  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UserCertification {
  certificationId: string;
  certificationName: string;
  licenseNumber?: string;
  issuedAt?: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp;
  isVerified: boolean;
}

export interface Document {
  id: string;
  userId: string;
  documentType: DocumentType;
  title: string;
  fileUrl: string;
  storagePath?: string;  // GCS path for URL regeneration
  fileSize?: number;
  mimeType?: string;
  status: DocumentStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ── Reference Data ────────────────────────────────────────────────────────────

export interface Discipline {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
}

export interface Specialty {
  id: string;
  name: string;
  disciplineId: string;
}

export interface Certification {
  id: string;
  name: string;
  issuingAuthority: string;
  category?: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: ToolCategory;
  description?: string;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  listingType: JobListingType;
  title: string;
  description: string;
  category: string;
  disciplineId?: string;
  specialtyId?: string;
  location: string;
  country?: string;
  isRemote: boolean;
  budget?: number;
  currency: string;
  deadline?: FirebaseFirestore.Timestamp;
  postedBy: string;                    // UID
  postedByName: string;
  postedByPhoto?: string;

  // Status
  status: JobStatus;
  isVerified: boolean;
  isAvailable: boolean;

  // Professional-posted fields
  professionalId?: string;
  serviceType?: string;
  requirements?: string[];

  // Stats
  applicationsCount: number;
  viewsCount: number;
  bookmarksCount: number;
  images?: ToolImage[];

  // Boost / featured
  isFeatured: boolean;
  boostScore?: number;                 // Higher = ranks higher in sort
  tierScore?: number;                  // Denormalized poster tier weight at creation time
  featuredExpiresAt?: FirebaseFirestore.Timestamp | null;

  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  acceptedAt?: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantId: string;
  applicantName: string;
  applicantPhoto?: string;
  coverLetter?: string;
  proposedRate?: number;
  currency?: string;
  status: ApplicationStatus;
  reviewNotes?: string;
  appliedDateKey?: string;           // YYYY-MM-DD UTC, used for daily quota
  isApplicationBoosted?: boolean;    // Professional paid to boost this application
  applicationBoostScore?: number;    // Timestamp-based sort key (Date.now() at boost time)
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ── Tools ────────────────────────────────────────────────────────────────────

export interface Tool {
  id: string;
  listingType: ToolListingType;
  title: string;
  description: string;
  category: ToolCategory;
  location: string;
  country?: string;
  price?: number;                      // sale price
  dailyRate?: number;                  // rental rate
  currency: string;
  images: ToolImage[];
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  condition?: 'new' | 'excellent' | 'good' | 'fair' | 'poor';
  boostScore?: number;
  featuredExpiresAt?: FirebaseFirestore.Timestamp | null;
  viewsCount: number;
  bookmarksCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface ToolImage {
  url: string;
  caption?: string;
  order: number;
}

// ── Transactions (Escrow) ─────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  jobId?: string;
  jobTitle?: string;
  toolId?: string;
  toolTitle?: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;

  // M-Pesa
  mpesaCheckoutRequestId?: string;
  mpesaMerchantRequestId?: string;
  mpesaReceiptNumber?: string;
  mpesaPhone?: string;
  mpesaCallbackProcessed?: boolean;

  // PayPal
  paypalOrderId?: string;
  paypalCaptureId?: string;

  // Stripe
  stripePaymentIntentId?: string;

  notes?: string;
  disputeReason?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  releasedAt?: FirebaseFirestore.Timestamp;
}

// ── Microtransactions (pay-as-you-go unlocks) ────────────────────────────────

export interface Microtransaction {
  id: string;
  type: MicrotransactionType;
  userId: string;                      // buyer
  targetId: string;                    // applicationId | profileId | jobId
  targetContextId: string;             // jobId (for applicant_unlock / application_boost)
  amountKES: number;
  amountUSD: number;
  paymentMethod: PaymentMethod;
  mpesaCheckoutRequestId?: string;
  mpesaCallbackProcessed?: boolean;
  status: MicrotransactionStatus;
  createdAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

/** Tracks per-employer individual applicant unlocks (pay-per-view). */
export interface UnlockedApplication {
  id: string;
  employerId: string;
  applicationId: string;
  jobId: string;
  microtransactionId: string;
  unlockedAt: FirebaseFirestore.Timestamp;
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  reviewedUserId: string;
  jobId?: string;
  toolId?: string;
  transactionId?: string;
  reviewType: 'job' | 'tool' | 'general';
  rating: number;                      // 1–5
  title?: string;
  comment: string;
  communicationRating?: number;
  qualityRating?: number;
  timelinessRating?: number;
  isVerified: boolean;
  isFlagged: boolean;
  response?: string;
  responseDate?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participants: string[];              // UIDs
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  jobId?: string;
  toolId?: string;
  lastMessage?: string;
  lastMessageAt?: FirebaseFirestore.Timestamp;
  lastMessageBy?: string;
  unreadCounts: Record<string, number>;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isRead: boolean;
  readBy: string[];
  createdAt: FirebaseFirestore.Timestamp;
}

// ── Notifications ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderPhoto?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

// ── Communications (Connections) ───────────────────────────────────────────────

export interface Connection {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  status: ConnectionStatus;
  contactUnlocked: boolean;
  contactUnlockedAt?: FirebaseFirestore.Timestamp;
  projectRef?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UserContact {
  id: string;
  userId: string;
  contactType: ContactType;
  value: string;
  isVerified: boolean;
  visibilityLevel: VisibilityLevel;
  createdAt: FirebaseFirestore.Timestamp;
}

// ── Request Extensions ────────────────────────────────────────────────────────

import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Global Express Request augmentation.
 * Adds fields that our middleware attaches at runtime so they are type-safe
 * everywhere — no more `(req as any).id` or `(req as any).user`.
 */
declare global {
  namespace Express {
    interface Request {
      /** Correlation ID injected by requestId middleware */
      id?: string;
      /** Raw body buffer (UTF-8 string) for webhook signature verification */
      rawBody?: string;
      /** Decoded Firebase ID token — set by requireAuth / optionalAuth */
      user?: DecodedIdToken;
      /** Hydrated user profile — set by optional profile-loading middleware */
      userProfile?: UserProfile;
    }
  }
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  userProfile?: UserProfile;
  /** Canonical DB role resolved by requireRole() RBAC middleware. */
  dbRole?: 'CLIENT' | 'PROFESSIONAL' | 'VENDOR' | 'ADMIN';
}

// ── API Response Helpers ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

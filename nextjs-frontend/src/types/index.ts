// ── Shared TypeScript types (mirrors nodejs-backend/src/types/index.ts) ───────

// ── Location ──────────────────────────────────────────────────────────────────

export interface LocationResult {
  lat: number;
  lng: number;
  placeName: string;
  town: string;
  city: string;
  county: string;
  country: string;
  countryCode: string;
  continent: string;
  formattedAddress: string;
}

export type UserRole = 'client' | 'professional' | 'vendor' | 'admin';
export type VerificationStatus = 'unverified' | 'identity_verified' | 'license_verified';
export type SubscriptionTier = 'free' | 'pro' | 'elite' | 'unlimited';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type JobListingType = 'hiring' | 'offering' | 'seeking';
export type JobStatus =
  | 'posted'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'completed'
  | 'cancelled'
  | 'archived';
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

export type TransactionStatus =
  | 'pending'
  | 'deposited'
  | 'in_progress'
  | 'completed'
  | 'released'
  | 'disputed'
  | 'refunded';

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

// ── User / Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  subscriptionTier: SubscriptionTier; // legacy flat field (kept for migration compat)
  /** Computed effective tier injected by GET /users/me — always accurate. */
  effectiveTier?: SubscriptionTier;
  subscription?: {
    tier: SubscriptionTier;
    expiresAt?: string;
  };
  companyName?: string;
  jobTitle?: string;
  bio?: string;
  country?: string;
  city?: string;
  cityLat?: number;
  cityLng?: number;
  yearsExperience?: number;
  hourlyRate?: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  portfolioUrl?: string;
  linkedinUrl?: string;
  // Viral growth
  referralCode?: string;
  referralCount?: number;
  disciplines?: string[];
  specialties?: string[];
  equipment?: string[];
  certifications?: UserCertification[];
  averageRating: number;
  totalReviews: number;
  completedProjects: number;
  totalJobs: number;
  totalTools: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  subscriptionTierExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCertification {
  certificationId: string;
  certificationName: string;
  licenseNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  isVerified: boolean;
}

export interface Discipline {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Specialty {
  id: string;
  name: string;
  disciplineId: string;
}

// ── Jobs ───────────────────────────────────────────────────────────────────────

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
  deadline?: string;
  postedBy: string;
  postedByName: string;
  postedByPhoto?: string;
  status: JobStatus;
  isFeatured: boolean;
  isVerified: boolean;
  isAvailable: boolean;
  requirements?: string[];
  applicationsCount: number;
  viewsCount: number;
  bookmarksCount: number;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

// ── Tools ──────────────────────────────────────────────────────────────────────

export interface Tool {
  id: string;
  listingType: ToolListingType;
  title: string;
  description: string;
  category: ToolCategory;
  location: string;
  country?: string;
  price?: number;
  dailyRate?: number;
  currency: string;
  images: { url: string; caption?: string; order: number }[];
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  ownerTier?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  condition?: 'new' | 'excellent' | 'good' | 'fair' | 'poor';
  viewsCount: number;
  bookmarksCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Transactions ───────────────────────────────────────────────────────────────

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
  paymentMethod: string;
  status: TransactionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  releasedAt?: string;
}

// ── Reviews ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  reviewedUserId: string;
  jobId?: string;
  toolId?: string;
  reviewType: 'job' | 'tool' | 'general';
  rating: number;
  title?: string;
  comment: string;
  communicationRating?: number;
  qualityRating?: number;
  timelinessRating?: number;
  isVerified: boolean;
  response?: string;
  responseDate?: string;
  createdAt: string;
}

// ── Messaging ──────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  jobId?: string;
  toolId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageBy?: string;
  unreadCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  attachmentUrl?: string;
  isRead: boolean;
  readBy: string[];
  createdAt: string;
}

// ── Notifications ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

// ── Connections ────────────────────────────────────────────────────────────────

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
  createdAt: string;
}

// ── API ────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  hasMore?: boolean;
  nextCursor?: string;
}

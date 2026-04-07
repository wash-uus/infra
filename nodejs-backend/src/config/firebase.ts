import * as admin from 'firebase-admin';
import { env } from './env';

const isPlaceholderKey = !env.FIREBASE_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY.includes('PLACEHOLDER');

if (!admin.apps.length) {
  if (isPlaceholderKey) {
    console.warn('[Firebase] Skipping Firebase Admin init — placeholder credentials detected. Auth and Firestore will not work until real credentials are provided in .env');
    // Initialize with no credential so the process doesn't crash
    admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID || 'placeholder' });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
      }),
      storageBucket: env.FIREBASE_STORAGE_BUCKET,
    });
  }
}

export const db = admin.firestore();
// Removed ignoreUndefinedProperties:true — that setting silently drops undefined
// fields on writes, hiding bugs where required data is accidentally omitted.
// Controllers must now explicitly guard against undefined before writing to Firestore.
export const authAdmin = admin.auth();
export const storage = admin.storage();
export const fcm = admin.messaging();

// ── Firestore Collection References ─────────────────────────────────────────
export const col = {
  users: db.collection('users'),
  jobs: db.collection('jobs'),
  tools: db.collection('tools'),
  transactions: db.collection('transactions'),
  reviews: db.collection('reviews'),
  conversations: db.collection('conversations'),
  notifications: db.collection('notifications'),
  connections: db.collection('connections'),
  jobApplications: db.collection('jobApplications'),
  bookmarks: db.collection('bookmarks'),
  disciplines: db.collection('disciplines'),
  specialties: db.collection('specialties'),
  equipment: db.collection('equipment'),
  certifications: db.collection('certifications'),
  callLogs: db.collection('callLogs'),
  smsLogs: db.collection('smsLogs'),
  abuseReports: db.collection('abuseReports'),
  subscriptions: db.collection('subscriptions'),
  adminLogs: db.collection('admin_logs'),
  shareEvents: db.collection('shareEvents'),
  conversionEvents: db.collection('conversionEvents'),
  commissions: db.collection('commissions'),
  microtransactions: db.collection('microtransactions'),
  unlockedApplications: db.collection('unlockedApplications'),
  referrals: db.collection('referrals'),
  inviteRewards: db.collection('inviteRewards'),
  abTests: db.collection('abTests'),
  abTestAssignments: db.collection('abTestAssignments'),
  churnSignals: db.collection('churnSignals'),
  winBackOffers: db.collection('winBackOffers'),
  disputes: db.collection('disputes'),
  fraudScores: db.collection('fraudScores'),
  verifiedBadges: db.collection('verifiedBadges'),
  revenueMetrics: db.collection('revenueMetrics'),
} as const;

export default admin;

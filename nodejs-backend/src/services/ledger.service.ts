/**
 * Financial Ledger Service
 *
 * Implements a double-entry ledger stored in Firestore `financialLedger`.
 * Every credit/debit pair is recorded atomically.  Running balance is maintained
 * as a denormalized field on a singleton `ledger_meta/balance` document so that
 * the current platform balance is O(1) reads.
 *
 * Entry types:
 *   payment_received   — Stripe / M-Pesa successful payment
 *   refund_issued      — Admin-initiated refund paid out
 *   subscription_fee   — Subscription plan payment
 *   platform_fee       — Platform commission taken from a transaction
 *   withdrawal         — Payout to professional
 *   adjustment         — Manual correction (superadmin only)
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';

export type LedgerEntryType =
  | 'payment_received'
  | 'refund_issued'
  | 'subscription_fee'
  | 'platform_fee'
  | 'withdrawal'
  | 'adjustment';

export interface LedgerEntry {
  type: LedgerEntryType;
  /** Amount debited from the platform (money out).  Zero for credit-only entries. */
  debit: number;
  /** Amount credited to the platform (money in).  Zero for debit-only entries. */
  credit: number;
  /** Currency code, e.g. 'KES', 'USD' */
  currency: string;
  /** External reference: Stripe payment_intent id, M-Pesa checkout request id, etc. */
  referenceId?: string;
  /** Additional context for audit trail */
  metadata?: Record<string, unknown>;
  /** Admin or system actor that triggered this entry */
  actorId?: string;
}

const LEDGER_COLL  = 'financialLedger';
const BALANCE_DOC  = db.collection('ledger_meta').doc('balance');

/**
 * Record a double-entry ledger event.
 * Updates the running balance atomically via Firestore transaction.
 * Fire-and-forget variant available via `recordLedgerEntryAsync`.
 */
export async function recordLedgerEntry(entry: LedgerEntry): Promise<string> {
  let entryId = '';

  await db.runTransaction(async (txn) => {
    // Read current balance (initialise to 0 if missing)
    const balanceSnap = await txn.get(BALANCE_DOC);
    const currentBalance: number = balanceSnap.exists
      ? (balanceSnap.data()!.balance as number ?? 0)
      : 0;

    const balanceAfter = currentBalance + entry.credit - entry.debit;

    // New ledger document
    const entryRef = db.collection(LEDGER_COLL).doc();
    entryId = entryRef.id;

    txn.set(entryRef, {
      id:           entryId,
      type:         entry.type,
      debit:        entry.debit,
      credit:       entry.credit,
      currency:     entry.currency,
      balanceAfter: Math.round(balanceAfter * 100) / 100,
      referenceId:  entry.referenceId ?? null,
      metadata:     entry.metadata ?? {},
      actorId:      entry.actorId ?? 'system',
      createdAt:    FieldValue.serverTimestamp(),
    });

    // Upsert running balance
    txn.set(BALANCE_DOC, {
      balance:     Math.round(balanceAfter * 100) / 100,
      updatedAt:   FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  logger.info('Ledger entry recorded', {
    id: entryId,
    type: entry.type,
    credit: entry.credit,
    debit: entry.debit,
    currency: entry.currency,
    referenceId: entry.referenceId,
  });

  return entryId;
}

/**
 * Fire-and-forget wrapper — never throws.
 * Use from payment webhooks / admin handlers where the ledger write must not
 * fail the primary operation.
 */
export function recordLedgerEntryAsync(entry: LedgerEntry): void {
  recordLedgerEntry(entry).catch((err: Error) => {
    logger.error('Failed to record ledger entry', {
      type: entry.type,
      referenceId: entry.referenceId,
      error: err.message,
    });
  });
}

/**
 * Retrieve the current platform balance.
 */
export async function getLedgerBalance(): Promise<{ balance: number; updatedAt: Timestamp | null }> {
  const snap = await BALANCE_DOC.get();
  if (!snap.exists) return { balance: 0, updatedAt: null };
  const data = snap.data()!;
  return {
    balance:   data.balance as number ?? 0,
    updatedAt: data.updatedAt as Timestamp | null ?? null,
  };
}

/**
 * Fetch recent ledger entries for reconciliation / admin view.
 */
export async function getLedgerEntries(opts: {
  limit?: number;
  cursor?: string;
  type?: LedgerEntryType;
  since?: Date;
}): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const { limit = 50, cursor, type, since } = opts;

  let query: FirebaseFirestore.Query = db
    .collection(LEDGER_COLL)
    .orderBy('createdAt', 'desc');

  if (type)  query = query.where('type', '==', type);
  if (since) query = query.where('createdAt', '>=', since);

  if (cursor) {
    const cursorDoc = await db.collection(LEDGER_COLL).doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snap = await query.limit(limit).get();
  return snap.docs;
}

/**
 * Sum ledger credits/debits for a given time window.
 * Used by the daily reconciliation worker.
 */
export async function sumLedgerWindow(since: Date, until: Date): Promise<{
  totalCredits: number;
  totalDebits: number;
  net: number;
  entriesCount: number;
}> {
  const snap = await db
    .collection(LEDGER_COLL)
    .where('createdAt', '>=', since)
    .where('createdAt', '<', until)
    .get();

  let totalCredits = 0;
  let totalDebits  = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    totalCredits += (data.credit as number ?? 0);
    totalDebits  += (data.debit  as number ?? 0);
  });

  return {
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits:  Math.round(totalDebits  * 100) / 100,
    net:          Math.round((totalCredits - totalDebits) * 100) / 100,
    entriesCount: snap.size,
  };
}

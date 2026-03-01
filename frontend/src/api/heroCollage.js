/**
 * Hero Collage API helpers.
 *
 * Endpoints:
 *   GET  /api/hero-collage/          — approved images (public)
 *   GET  /api/hero-collage/queue/    — pending moderation queue (moderator+)
 *   POST /api/user-photos/           — submit user photo (authenticated)
 *   POST /api/user-photos/{id}/approve/  — approve user photo (moderator+)
 *   POST /api/user-photos/{id}/reject/   — reject  user photo (moderator+)
 *   POST /api/fetched-photos/{id}/approve/  — approve fetched photo (moderator+)
 *   POST /api/fetched-photos/{id}/reject/   — reject  fetched photo (moderator+)
 */

import api from "./client";

// ── Public ────────────────────────────────────────────────────────────────────

/** Fetch all approved images for the live hero collage. */
export const getHeroCollage = (params) =>
  api.get("/hero-collage/", { params });

// ── User photo submission ─────────────────────────────────────────────────────

/**
 * Submit a user photo for moderation.
 * @param {FormData} formData  — must contain `image`, optional `caption`, `testimony`
 * @param {function}  onProgress  — (percentComplete: number) => void
 */
export const submitUserPhoto = (formData, onProgress) =>
  api.post("/user-photos/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

// ── Moderation queue ──────────────────────────────────────────────────────────

/** Get pending photos awaiting moderation. Moderator+ only. */
export const getModerationQueue = () =>
  api.get("/hero-collage/queue/");

/** Approve a user-submitted photo. */
export const approveUserPhoto = (id) =>
  api.post(`/user-photos/${id}/approve/`);

/** Reject a user-submitted photo. */
export const rejectUserPhoto = (id) =>
  api.post(`/user-photos/${id}/reject/`);

/** Approve an auto-fetched photo. */
export const approveFetchedPhoto = (id) =>
  api.post(`/fetched-photos/${id}/approve/`);

/** Reject an auto-fetched photo. */
export const rejectFetchedPhoto = (id) =>
  api.post(`/fetched-photos/${id}/reject/`);

/** Bulk approve fetched photos by IDs. */
export const bulkApproveFetched = (ids) =>
  api.post("/fetched-photos/bulk_approve/", { ids });

/** Bulk reject fetched photos by IDs. */
export const bulkRejectFetched = (ids) =>
  api.post("/fetched-photos/bulk_reject/", { ids });

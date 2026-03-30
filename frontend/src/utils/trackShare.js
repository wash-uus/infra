import api from "../api/client";

/**
 * Fire-and-forget share analytics tracking.
 * Never throws, never blocks the UI.
 *
 * @param {"story"|"prayer"} contentType
 * @param {number} objectId
 * @param {"whatsapp"|"twitter"|"facebook"|"copy"|"native"} platform
 */
export async function trackShare(contentType, objectId, platform) {
  try {
    await api.post("/analytics/share/", {
      content_type: contentType,
      object_id: objectId,
      platform,
    });
  } catch {
    // Analytics must never crash the UI — silent fail
  }
}

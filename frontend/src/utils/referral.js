/**
 * Referral utilities — capture ?ref= from URL and wire up the referral loop.
 * All methods fail silently if localStorage is unavailable.
 */

const REF_KEY = "sra_ref";
const CLAIMED_KEY = "sra_ref_claimed";

/** Call once on app mount to capture ?ref= from the landing URL. */
export function captureReferralParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && !localStorage.getItem(REF_KEY)) {
      localStorage.setItem(REF_KEY, String(ref));
    }
  } catch {
    // localStorage unavailable — ignore
  }
}

/** Returns the stored referrer id string, or null. */
export function getStoredRef() {
  try {
    return localStorage.getItem(REF_KEY) || null;
  } catch {
    return null;
  }
}

/** Marks the referral as claimed so we don't POST it again. */
export function markReferralClaimed() {
  try {
    localStorage.removeItem(REF_KEY);
    localStorage.setItem(CLAIMED_KEY, "1");
  } catch {
    // ignore
  }
}

/** Returns true if referral was already claimed. */
export function isReferralClaimed() {
  try {
    return localStorage.getItem(CLAIMED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Reads the current user's ID from the stored JWT access token.
 * Returns the ID as a string, or "anon".
 */
export function getCurrentUserId() {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return "anon";
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return String(payload.user_id || payload.sub || "anon");
  } catch {
    return "anon";
  }
}

/**
 * Appends ?ref={userId} to a share URL.
 * Does not modify other existing query params.
 */
export function appendRef(url) {
  if (!url) return url;
  try {
    const uid = getCurrentUserId();
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}ref=${uid}`;
  } catch {
    return url;
  }
}

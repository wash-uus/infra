import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const api = axios.create({ baseURL: BASE_URL });

function getTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = getTokenPayload(token);
  return !payload?.exp || payload.exp * 1000 <= Date.now();
}

function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

function redirectToLogin() {
  clearSession();
  if (window.location.pathname !== "/login") {
    // Fire a custom event so the in-app React Router can handle the redirect
    // without a full page reload, preserving any unsaved form data in other
    // components. Layout.jsx listens for this event.
    window.dispatchEvent(new CustomEvent("auth:login-required"));
  }
}

// Attempt a silent token refresh. Returns the new access token or null.
let refreshPromise = null;
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh || isTokenExpired(refresh)) return null;
    try {
      const { data } = await axios.post(`${BASE_URL}/accounts/token/refresh/`, { refresh });
      localStorage.setItem("access_token", data.access);
      return data.access;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// ── Request interceptor: attach access token ──────────────────────────────
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("access_token");

  if (token && isTokenExpired(token)) {
    // Try silent refresh before the request goes out
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
    } else {
      redirectToLogin();
      return config;
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: retry once on 401 with refreshed token ──────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    // Attempt one silent refresh on 401, but not for the refresh endpoint itself
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("token/refresh")
    ) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

/**
 * Resolve a media path returned by the API to a full absolute URL.
 * DRF returns absolute URLs when the serializer has request context, but
 * this helper handles the edge cases where a relative path slips through.
 */
export function resolveMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const mediaBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
  return `${mediaBase}/media/${path.replace(/^\//, "")}`;
}

export default api;

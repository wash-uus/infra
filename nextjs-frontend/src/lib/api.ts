import axios, { AxiosError } from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Firebase ID token + correlation ID ────────────
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Correlation ID — allows matching frontend call to backend log entry
  config.headers['X-Request-ID'] = crypto.randomUUID();

  // Let the browser set Content-Type automatically for FormData
  // so the multipart boundary is included (multer requires this)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// ── Response interceptor: normalise + log errors ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; requestId?: string }>) => {
    const status    = error.response?.status;
    const message   = error.response?.data?.message ?? error.message ?? 'An unexpected error occurred';
    const requestId = error.response?.data?.requestId;
    const url       = error.config?.url;

    if (process.env.NODE_ENV !== 'production') {
      // Network errors (e.g. backend not running) are expected in local dev —
      // log them as a brief warning instead of a full JSON error blob.
      if (!error.response) {
        console.warn(`[api] Network error: ${error.config?.method?.toUpperCase()} ${url} — ${message}`);
      } else {
        console.error(
          JSON.stringify({
            type: 'api_error', status, message, url,
            requestId: requestId ?? null,
            ts: new Date().toISOString(),
          }),
        );
      }
    }

    const enriched = new Error(message) as Error & { status?: number; requestId?: string };
    enriched.status    = status;
    enriched.requestId = requestId;
    return Promise.reject(enriched);
  },
);

export default api;

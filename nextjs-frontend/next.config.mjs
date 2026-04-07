/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // Required for Docker standalone build (copies only needed files)
  output: 'standalone',

  async headers() {
    return [
      // ── Security headers applied to every route ────────────────────────
      {
        source: '/(.*)',
        headers: [
          // Required for Firebase signInWithPopup to communicate with the
          // auth popup window across origins.
          { key: 'Cross-Origin-Opener-Policy',  value: 'same-origin-allow-popups' },

          // Prevent MIME-type sniffing — browsers must respect Content-Type.
          { key: 'X-Content-Type-Options',       value: 'nosniff' },

          // Stop the page from being framed by other sites (clickjacking).
          { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },

          // Tell browsers not to send full URL in the Referer header to 3rd parties.
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },

          // Disable browser features not needed by the app.
          { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), payment=(self), geolocation=(self)' },

          // Force HTTPS for 2 years once first visited over HTTPS.
          { key: 'Strict-Transport-Security',    value: 'max-age=63072000; includeSubDomains; preload' },

          // Legacy XSS filter (still respected by older browsers).
          { key: 'X-XSS-Protection',             value: '1; mode=block' },

          // Content Security Policy — restrict resource origins to reduce XSS blast radius.
          // 'unsafe-inline' is needed for Next.js inline styles/scripts; tighten with nonces
          // once a CSP nonce solution is integrated (e.g., via Next.js middleware).
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.firebase.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com https://*.tile.openstreetmap.org https://*.openstreetmap.org",
              [
                "connect-src 'self'",
                "https://*.googleapis.com",
                "https://*.firebaseio.com",
                "wss://*.firebaseio.com",
                "https://*.cloudfunctions.net",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://nominatim.openstreetmap.org",
                // Allow local backend and messaging socket in development
                ...(isDev ? ["http://localhost:*", "ws://localhost:*"] : []),
                // Production API and messaging endpoints
                ...(!isDev ? ["https://api.infrasells.com", "wss://messages.infrasells.com"] : []),
              ].join(' '),
              "frame-src https://accounts.google.com https://*.firebaseapp.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },

      // ── Long-lived cache for immutable Next.js static assets ──────────
      // Next.js appends a content hash to every filename under /_next/static/,
      // so it's safe to cache them forever. This slashes repeat-visit load.
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // ── Short cache for HTML / API routes ─────────────────────────────
      // Stale-while-revalidate gives a fast first-byte while keeping content fresh.
      {
        source: '/((?!_next/static|_next/image|icon\\.svg|favicon\\.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  reactStrictMode: true,

  // Reduce bundle size — don't ship source maps to the browser in production,
  // and let Next.js aggressively optimise the React runtime.
  productionBrowserSourceMaps: false,

  // Compress output with gzip during the build so the CDN/edge serves smaller files.
  compress: true,
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps to Sentry during CI builds only
  silent:             !process.env.CI,
  widenClientFileUpload: true,

  // Tree-shake Sentry logger to reduce bundle size
  disableLogger: true,

  // Automatically instrument Next.js data fetching methods and API routes
  autoInstrumentServerFunctions: true,
});


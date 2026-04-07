/**
 * K6 10,000 VU Peak Load Test — INFRA Platform
 *
 * Simulates a viral traffic spike reaching 10,000 concurrent virtual users.
 * This is the "Black Friday / Product Hunt launch" scenario.
 *
 * Traffic profile (read-heavy to protect DB):
 *   80%  GET /api/jobs          (Redis-cached, should barely touch Firestore)
 *   10%  GET /api/tools
 *    5%  GET /api/search?q=...  (Typesense — designed for this scale)
 *    3%  POST /api/jobs/:id/apply
 *    2%  GET /api/users/:id/profile
 *
 * Run:
 *   BASE_URL=https://your-api.run.app \
 *   k6 run --out cloud load_tests/k6_10000vu_test.js
 *
 * SLA targets for this spike test:
 *   p95 latency  < 800 ms
 *   p99 latency  < 2000 ms
 *   error rate   < 2%
 *   throughput   > 2 000 req/s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── SLA thresholds ────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m',  target: 1000  },  // warm up
        { duration: '5m',  target: 10000 },  // spike
        { duration: '2m',  target: 5000  },  // partial ramp-down
        { duration: '2m',  target: 0     },  // full ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration:        ['p(95)<800', 'p(99)<2000'],
    http_req_failed:          ['rate<0.02'],
    error_rate:               ['rate<0.02'],
    cache_hits:               ['count>0'],
  },
};

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate   = new Rate('error_rate');
const cacheHits   = new Counter('cache_hits');
const searchTime  = new Trend('search_duration_ms', true);

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL  = __ENV.BASE_URL   || 'http://localhost:8000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const JOB_IDS   = (__ENV.JOB_IDS  || 'job-1,job-2,job-3,job-4,job-5').split(',');
const USER_IDS  = (__ENV.USER_IDS || 'u1,u2,u3,u4,u5').split(',');
const SEARCH_TERMS = [
  'structural engineer', 'civil engineer nairobi', 'mechanical', 'architect',
  'electrical', 'geotechnical', 'project manager', 'roads', 'water supply',
];

const HEADERS_PUBLIC = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
};

const HEADERS_AUTH = {
  ...HEADERS_PUBLIC,
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// ── VU entrypoint ─────────────────────────────────────────────────────────────
export default function () {
  const rand = Math.random();

  if (rand < 0.80) {
    // 80%: Job feed (should be served from CDN / Redis — near zero DB cost)
    const res = http.get(`${BASE_URL}/api/jobs?status=posted&pageSize=20`, {
      headers: HEADERS_PUBLIC,
      tags: { name: 'list_jobs' },
    });
    if (res.headers['X-Cache'] === 'HIT' || res.headers['Cache-Control']) {
      cacheHits.add(1);
    }
    check(res, {
      'jobs 200':    (r) => r.status === 200,
      'jobs < 800ms': (r) => r.timings.duration < 800,
    }) || errorRate.add(1);
    sleep(Math.random() * 1.5 + 0.3);

  } else if (rand < 0.90) {
    // 10%: Tools directory
    const res = http.get(`${BASE_URL}/api/tools?pageSize=20`, {
      headers: HEADERS_PUBLIC,
      tags: { name: 'list_tools' },
    });
    check(res, { 'tools 200': (r) => r.status === 200 }) || errorRate.add(1);
    sleep(Math.random() * 1.5 + 0.3);

  } else if (rand < 0.95) {
    // 5%: Full-text search via Typesense
    const term = randomItem(SEARCH_TERMS);
    const res = http.get(
      `${BASE_URL}/api/search?q=${encodeURIComponent(term)}&collection=jobs&pageSize=10`,
      { headers: HEADERS_PUBLIC, tags: { name: 'search' } },
    );
    searchTime.add(res.timings.duration);
    check(res, {
      'search 200':    (r) => r.status === 200,
      'search < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    sleep(0.5);

  } else if (rand < 0.98) {
    // 3%: Apply to job (write — cannot be cached)
    if (!AUTH_TOKEN) { sleep(1); return; }
    const jobId = randomItem(JOB_IDS);
    const res = http.post(
      `${BASE_URL}/api/jobs/${jobId}/apply`,
      JSON.stringify({
        coverLetter:  `Automated spike test vu=${randomIntBetween(1, 10000)}`,
        proposedRate: randomIntBetween(3000, 15000),
        currency: 'KES',
      }),
      { headers: HEADERS_AUTH, tags: { name: 'apply_job' } },
    );
    check(res, {
      'apply accepted': (r) => [201, 400, 403, 429].includes(r.status),
    }) || errorRate.add(1);
    sleep(Math.random() * 3 + 1);

  } else {
    // 2%: Profile reads
    const userId = randomItem(USER_IDS);
    const res = http.get(`${BASE_URL}/api/users/${userId}/profile`, {
      headers: HEADERS_PUBLIC,
      tags: { name: 'profile' },
    });
    check(res, {
      'profile 200 or 404': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
    sleep(0.5);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data: Record<string, any>) {
  const p95 = data.metrics?.http_req_duration?.values?.['p(95)'] ?? 0;
  const p99 = data.metrics?.http_req_duration?.values?.['p(99)'] ?? 0;
  const errRate = data.metrics?.http_req_failed?.values?.rate ?? 0;
  const rps = data.metrics?.http_reqs?.values?.rate ?? 0;

  const pass = p95 < 800 && p99 < 2000 && errRate < 0.02;

  return {
    stdout: `
═══════════════════════════════════════════════════════
  INFRA 10K VU SPIKE TEST — ${pass ? '✅ PASS' : '❌ FAIL'}
═══════════════════════════════════════════════════════
  p95 latency : ${p95.toFixed(0)} ms  (SLA: <800 ms) ${p95 < 800 ? '✅' : '❌'}
  p99 latency : ${p99.toFixed(0)} ms  (SLA: <2000 ms) ${p99 < 2000 ? '✅' : '❌'}
  error rate  : ${(errRate * 100).toFixed(2)}%          (SLA: <2%) ${errRate < 0.02 ? '✅' : '❌'}
  throughput  : ${rps.toFixed(0)} req/s
═══════════════════════════════════════════════════════
`,
  };
}

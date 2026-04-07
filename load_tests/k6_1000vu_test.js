/**
 * K6 1,000 VU API Load Test
 *
 * Simulates steady-state load of 1,000 concurrent virtual users hitting the
 * INFRA backend API — covering the most common production traffic patterns:
 *   70%  GET /api/jobs          (public feed — should hit Redis cache most of the time)
 *   15%  GET /api/tools         (public directory)
 *   10%  POST /api/jobs/:id/apply  (authenticated write — bypasses cache)
 *    5%  GET /api/subscriptions/status  (authenticated read)
 *
 * Run:  BASE_URL=https://your-api.run.app k6 run load_tests/k6_1000vu_test.js
 *
 * SLA targets (all must PASS):
 *   p95 latency < 500 ms
 *   p99 latency < 1500 ms
 *   error rate  < 1%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── SLA thresholds ────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '2m',  target: 200  },   // ramp up
    { duration: '5m',  target: 1000 },   // sustain
    { duration: '1m',  target: 0    },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed:   ['rate<0.01'],
    error_rate:        ['rate<0.01'],
  },
};

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate        = new Rate('error_rate');
const jobListDuration  = new Trend('job_list_duration',  true);
const applyDuration    = new Trend('apply_duration',     true);

// ── Test data ─────────────────────────────────────────────────────────────────
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:8000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';   // a valid Firebase ID token for write tests

const JOB_IDS = (__ENV.JOB_IDS || 'job-1,job-2,job-3,job-4,job-5').split(',');

const HEADERS_PUBLIC = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
};

const HEADERS_AUTH = {
  ...HEADERS_PUBLIC,
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// ── Virtual user entrypoint ───────────────────────────────────────────────────
export default function () {
  const rand = Math.random();

  if (rand < 0.70) {
    // ── 70%: Browse jobs ──────────────────────────────────────────────────────
    const res = http.get(`${BASE_URL}/api/jobs?status=posted&pageSize=20`, {
      headers: HEADERS_PUBLIC,
      tags: { name: 'list_jobs' },
    });
    jobListDuration.add(res.timings.duration);
    check(res, {
      'jobs list status 200':         (r) => r.status === 200,
      'jobs list has data':           (r) => (r.json() as any)?.data !== undefined,
      'jobs list cache-control set':  (r) => !!r.headers['Cache-Control'],
    }) || errorRate.add(1);
    sleep(Math.random() * 2 + 0.5);

  } else if (rand < 0.85) {
    // ── 15%: Browse tools ─────────────────────────────────────────────────────
    const res = http.get(`${BASE_URL}/api/tools?pageSize=20`, {
      headers: HEADERS_PUBLIC,
      tags: { name: 'list_tools' },
    });
    check(res, {
      'tools list status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    sleep(Math.random() * 1.5 + 0.5);

  } else if (rand < 0.95) {
    // ── 10%: Apply to a random job ────────────────────────────────────────────
    if (!AUTH_TOKEN) { sleep(1); return; }

    const jobId = randomItem(JOB_IDS);
    const res = http.post(
      `${BASE_URL}/api/jobs/${jobId}/apply`,
      JSON.stringify({
        coverLetter:  'K6 load test application — automated.',
        proposedRate: 5000,
        currency:     'KES',
      }),
      { headers: HEADERS_AUTH, tags: { name: 'apply_job' } },
    );
    applyDuration.add(res.timings.duration);
    // Accept 201 (success) or 400 (already applied) — both are valid in a load test
    check(res, {
      'apply to job accepted': (r) => r.status === 201 || r.status === 400 || r.status === 429,
    }) || errorRate.add(1);
    sleep(Math.random() * 3 + 1);

  } else {
    // ── 5%: Check subscription status ────────────────────────────────────────
    if (!AUTH_TOKEN) { sleep(1); return; }
    const res = http.get(`${BASE_URL}/api/subscriptions/status`, {
      headers: HEADERS_AUTH,
      tags: { name: 'subscription_status' },
    });
    check(res, {
      'subscription status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    sleep(1);
  }
}

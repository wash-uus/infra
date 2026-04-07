import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Returns 200 only when both Next.js AND the backend are reachable.
 * Returns 503 when NEXT_PUBLIC_API_URL is not configured.
 * Returns 500 when the backend cannot be reached.
 */
export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBase) {
    return NextResponse.json(
      { status: 'error', service: 'infrasells-frontend', message: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let backendStatus: 'ok' | 'unreachable' = 'unreachable';
  let backendUptime: number | null = null;

  try {
    const res = await fetch(`${apiBase}/health`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const json = await res.json();
      backendStatus = 'ok';
      backendUptime = json.uptime ?? null;
    }
  } catch {
    // backend unreachable — fall through to return 500
  }

  if (backendStatus !== 'ok') {
    return NextResponse.json(
      {
        status: 'error',
        service: 'infrasells-frontend',
        timestamp: new Date().toISOString(),
        backend: { status: backendStatus, uptime: null },
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      status: 'ok',
      service: 'infrasells-frontend',
      timestamp: new Date().toISOString(),
      backend: { status: backendStatus, uptime: backendUptime },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}


import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('middleware');

const allowedOrigins = new Set([
  'https://www.l3modz.com',
  'https://l3modz.com',
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean),
]);

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const allowedHeaders = 'Content-Type,Authorization';

function getAllowedOrigin(origin: string) {
  return allowedOrigins.has(origin) ? origin : '';
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const origin = req.headers.get('origin') || '';
  const allowOrigin = getAllowedOrigin(origin);

  if (origin && !allowOrigin) {
    logger.warn('cors_blocked_origin', {
      origin,
      method: req.method,
      path: req.nextUrl.pathname,
    });
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    const headers = new Headers();
    if (allowOrigin) {
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Vary', 'Origin');
    }
    headers.set('Access-Control-Allow-Methods', allowedMethods);
    headers.set('Access-Control-Allow-Headers', allowedHeaders);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400');
    logger.info('cors_preflight', {
      origin: origin || '(no-origin)',
      allowOrigin: allowOrigin || '(none)',
      method: req.method,
      path: req.nextUrl.pathname,
    });
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  if (allowOrigin) {
    res.headers.set('Access-Control-Allow-Origin', allowOrigin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', allowedMethods);
  res.headers.set('Access-Control-Allow-Headers', allowedHeaders);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};

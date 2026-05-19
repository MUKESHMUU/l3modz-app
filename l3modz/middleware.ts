import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedFromEnv = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const origin = req.headers.get('origin') || '';
  const allowed = allowedFromEnv.length ? allowedFromEnv : ['*'];
  const allowOrigin = allowed.includes(origin) ? origin : (allowedFromEnv.length ? allowedFromEnv[0] : '*');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Allow-Credentials', 'true');
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', allowOrigin);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Vary', 'Origin');
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};

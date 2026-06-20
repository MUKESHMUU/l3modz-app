import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, getAuthCookieOptions, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { requireEnv } from '@/lib/env';
import { adminLoginLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { logAdminLoginAttempt, logRateLimitViolation } from '@/lib/securityLogger';

function normalizeEmail(raw: string) {
  return (raw || '').toLowerCase().trim();
}

export async function POST(req: Request) {
  try {
    // Get client identifier for rate limiting
    const clientIp = getClientIdentifier(req);
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email || '');
    const password = String(body.password || '');

    // Rate limit by email and IP combined
    const rateLimitKey = `${email}:${clientIp}`;
    const rateLimitResult = adminLoginLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      logRateLimitViolation(rateLimitKey, 'admin_login', rateLimitResult.resetAt);
      return NextResponse.json(
        {
          message: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
      );
    }

    if (!email || !password) {
      logAdminLoginAttempt(email, clientIp, false, 'Missing email or password');
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Require environment variables in production, allow override in dev/test
    const ADMIN_EMAIL = requireEnv('ADMIN_EMAIL');
    const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');
    const authorizedEmail = normalizeEmail(ADMIN_EMAIL);

    await dbConnect();

    // Check credentials first before database lookup
    if (email !== authorizedEmail || password !== ADMIN_PASSWORD) {
      logAdminLoginAttempt(email, clientIp, false, 'Invalid credentials');
      return NextResponse.json({ message: 'Invalid admin credentials' }, { status: 401 });
    }

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      logAdminLoginAttempt(email, clientIp, false, 'Admin user not found');
      return NextResponse.json({ message: 'Admin account not configured' }, { status: 404 });
    }

    const token = signToken({ id: adminUser._id, role: adminUser.role });

    const cookieStore = await cookies();
    const cookieOptions = getAuthCookieOptions();
    cookieStore.set('token', token, cookieOptions);

    logAdminLoginAttempt(email, clientIp, true);
    adminLoginLimiter.reset(rateLimitKey);

    return NextResponse.json({
      message: 'Admin login successful',
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    const message = String(error?.message || 'Server error');
    if (message.includes('is not configured')) {
      return NextResponse.json({ message }, { status: 503 });
    }
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

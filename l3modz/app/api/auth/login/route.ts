import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, getAuthCookieOptions, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { userLoginLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { logUserLoginAttempt, logRateLimitViolation } from '@/lib/securityLogger';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIdentifier(req);
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Missing email or password' }, { status: 400 });
    }

    // Rate limit by email and IP combined
    const rateLimitKey = `${email.toLowerCase()}:${clientIp}`;
    const rateLimitResult = userLoginLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      logRateLimitViolation(rateLimitKey, 'user_login', rateLimitResult.resetAt);
      return NextResponse.json(
        {
          message: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      logUserLoginAttempt(email, clientIp, false, 'User not found or no password set');
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      logUserLoginAttempt(email, clientIp, false, 'Password mismatch');
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ id: user._id, role: user.role });

    const cookieStore = await cookies();
    const cookieOptions = getAuthCookieOptions();
    cookieStore.set('token', token, cookieOptions);

    logUserLoginAttempt(email, clientIp, true);
    userLoginLimiter.reset(rateLimitKey);

    return NextResponse.json({
      message: 'Logged in successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

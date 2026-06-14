import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { registrationLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { logRateLimitViolation } from '@/lib/securityLogger';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIdentifier(req);
    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Rate limit by email and IP combined
    const rateLimitKey = `${email.toLowerCase()}:${clientIp}`;
    const rateLimitResult = registrationLimiter.check(rateLimitKey);

    if (!rateLimitResult.allowed) {
      logRateLimitViolation(rateLimitKey, 'registration', rateLimitResult.resetAt);
      return NextResponse.json(
        {
          message: 'Too many registration attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)) } }
      );
    }

    await dbConnect();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const token = signToken({ id: user._id, role: user.role });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    registrationLimiter.reset(rateLimitKey);

    return NextResponse.json({
      message: 'Registered successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

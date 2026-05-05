import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, hashPassword, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@l3modz.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'l3modz@admin2022';

function normalizeEmail(raw: string) {
  return (raw || '').toLowerCase().trim();
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email || '');
    const password = String(body.password || '');
    const authorizedEmail = normalizeEmail(ADMIN_EMAIL);

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return NextResponse.json({ message: 'Admin account not configured' }, { status: 404 });
    }

    // Keep admin identity pinned to the configured email.
    if (normalizeEmail(adminUser.email) !== authorizedEmail) {
      adminUser.email = authorizedEmail;
      await adminUser.save();
    }

    let isMatch = false;
    if (adminUser.password) {
      isMatch = await comparePassword(password, adminUser.password);
    }

    // Allow configured admin fallback password and persist as hash for subsequent logins.
    if (!isMatch && password === ADMIN_PASSWORD) {
      if (!adminUser.password || !(await comparePassword(ADMIN_PASSWORD, adminUser.password))) {
        adminUser.password = await hashPassword(ADMIN_PASSWORD);
        await adminUser.save();
      }
      isMatch = true;
    }

    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid admin credentials' }, { status: 401 });
    }

    const token = signToken({ id: adminUser._id, role: adminUser.role });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

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
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

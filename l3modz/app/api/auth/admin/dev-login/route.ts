import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthCookieOptions, signToken } from '@/lib/auth';

const ADMIN_PHONE = process.env.ADMIN_LOGIN_PHONE || '7708969064';

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Direct login is disabled in production.' }, { status: 403 });
    }

    await dbConnect();

    const adminUser = await User.findOne({ role: 'admin', phone: ADMIN_PHONE });
    if (!adminUser) {
      return NextResponse.json({ message: 'Admin account not found for configured phone.' }, { status: 404 });
    }

    const token = signToken({ id: adminUser._id, role: adminUser.role });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      ...getAuthCookieOptions(),
      secure: false,
    });

    return NextResponse.json({
      message: 'Direct admin login successful',
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

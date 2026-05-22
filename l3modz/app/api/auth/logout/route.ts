import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set('token', '', {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

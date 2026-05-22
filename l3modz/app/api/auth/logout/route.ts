import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();

    const cookieOptions = getAuthCookieOptions();
    cookieStore.set('token', '', {
      ...getAuthCookieOptions(),
      maxAge: 0,
    });
    console.info('[Auth] logout cookie cleared', {
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

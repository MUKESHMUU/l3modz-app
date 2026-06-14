import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthCookieOptions } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-logout');

export async function POST() {
  try {
    const cookieStore = await cookies();
    const cookieOptions = getAuthCookieOptions();

    cookieStore.set('token', '', {
      ...cookieOptions,
      maxAge: 0,
    });
    logger.info('Logout completed', {
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout route error', { message: error.message });
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

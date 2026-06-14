import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-session');

export async function GET() {
  try {
    const { getUserFromToken } = await import('@/lib/checkAuth');

    const user = await getUserFromToken();
    logger.debug('Auth session checked', { hasUser: Boolean(user) });

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
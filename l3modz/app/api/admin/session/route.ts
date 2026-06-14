import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/checkAuth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-admin-session');

export async function GET() {
  try {
    const user = await getUserFromToken();
    logger.debug('Admin session check completed', { hasUser: Boolean(user) });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    logger.error('Admin session route error', { message: error.message });
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

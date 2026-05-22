import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/checkAuth';

export async function GET() {
  try {
    const user = await getUserFromToken();
    console.info('[Auth] admin session check', { hasUser: Boolean(user), role: user?.role || null });

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
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}

import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import dbConnect from './mongodb';
import User from '@/models/User';

export async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  console.info('[Auth] token cookie read', { hasToken: Boolean(token), tokenLength: token?.length || 0 });

  if (!token) return null;

  const decoded: any = verifyToken(token);
  if (!decoded) {
    console.info('[Auth] token verification failed');
    return null;
  }

  await dbConnect();
  const user = await User.findById(decoded.id).select('-password');
  console.info('[Auth] token resolved user', { hasUser: Boolean(user), role: user?.role || null });
  return user;
}

export async function checkAdmin() {
  const user = await getUserFromToken();
  if (!user || user.role !== 'admin') {
    return false;
  }
  return true;
}

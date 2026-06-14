import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import dbConnect from './mongodb';
import User from '@/models/User';
import { createLogger } from './logger';

const logger = createLogger('auth');

export async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  logger.debug('Authentication token read', { hasToken: Boolean(token) });

  if (!token) return null;

  const decoded: any = verifyToken(token);
  if (!decoded) {
    logger.debug('Token verification failed');
    return null;
  }

  await dbConnect();
  const user = await User.findById(decoded.id).select('-password');
  logger.debug('User lookup completed', { found: Boolean(user) });
  return user;
}

export async function checkAdmin() {
  const user = await getUserFromToken();
  if (!user || user.role !== 'admin') {
    return false;
  }
  return true;
}

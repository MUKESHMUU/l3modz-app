import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validateProductionEnv, requireEnv } from './env';

validateProductionEnv();

const JWT_SECRET = requireEnv('JWT_SECRET');

export const signToken = (payload: object, expiresIn: jwt.SignOptions['expiresIn'] = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

function normalizeCookieDomain(hostname: string) {
  const trimmed = hostname.trim().toLowerCase();
  if (!trimmed || trimmed === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) {
    return '';
  }

  if (trimmed.startsWith('www.')) {
    return `.${trimmed.slice(4)}`;
  }

  return `.${trimmed}`;
}

export function getAuthCookieDomain() {
  const source = process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || '';

  if (!source) {
    return '';
  }

  try {
    return normalizeCookieDomain(new URL(source).hostname);
  } catch {
    return normalizeCookieDomain(source.replace(/^https?:\/\//i, '').split('/')[0] || '');
  }
}

export function getAuthCookieOptions(options: { localDev?: boolean } = {}) {
  if (options.localDev && process.env.NODE_ENV !== 'production') {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    };
  }

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none' as const,
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  };
}

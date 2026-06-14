/**
 * Rate limiting utility for protecting against brute-force attacks
 * Supports both IP-based and email/identifier-based limiting
 */

import { createLogger } from './logger';

const logger = createLogger('rate-limit');

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

/**
 * In-memory rate limit store
 * In production, consider using Redis for distributed systems
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval = 60000; // Cleanup every 60 seconds

  constructor() {
    // Periodic cleanup to prevent memory leaks
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.store.delete(key));
  }

  isLimited(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || current.resetAt <= now) {
      // Reset window
      this.store.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.maxAttempts - 1, resetAt: now + config.windowMs };
    }

    current.count += 1;
    this.store.set(key, current);

    const allowed = current.count <= config.maxAttempts;
    const remaining = Math.max(0, config.maxAttempts - current.count);

    return { allowed, remaining, resetAt: current.resetAt };
  }

  reset(key: string) {
    this.store.delete(key);
  }
}

const store = new RateLimitStore();

/**
 * Rate limiter for admin login attempts
 * Limit: 5 attempts per 15 minutes per IP/email
 */
export const adminLoginLimiter = {
  check: (identifier: string) => {
    const config: RateLimitConfig = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };
    const result = store.isLimited(`admin_login:${identifier}`, config);
    
    if (!result.allowed) {
      logger.warn('rate_limit_exceeded', {
        type: 'admin_login',
        identifier,
        resetAt: new Date(result.resetAt).toISOString(),
      });
    }
    
    return result;
  },
  reset: (identifier: string) => store.reset(`admin_login:${identifier}`),
};

/**
 * Rate limiter for user login attempts
 * Limit: 10 attempts per 15 minutes per IP/email
 */
export const userLoginLimiter = {
  check: (identifier: string) => {
    const config: RateLimitConfig = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };
    const result = store.isLimited(`user_login:${identifier}`, config);
    
    if (!result.allowed) {
      logger.warn('rate_limit_exceeded', {
        type: 'user_login',
        identifier,
        resetAt: new Date(result.resetAt).toISOString(),
      });
    }
    
    return result;
  },
  reset: (identifier: string) => store.reset(`user_login:${identifier}`),
};

/**
 * Rate limiter for registration attempts
 * Limit: 5 attempts per hour per IP/email
 */
export const registrationLimiter = {
  check: (identifier: string) => {
    const config: RateLimitConfig = { maxAttempts: 5, windowMs: 60 * 60 * 1000 };
    const result = store.isLimited(`registration:${identifier}`, config);
    
    if (!result.allowed) {
      logger.warn('rate_limit_exceeded', {
        type: 'registration',
        identifier,
        resetAt: new Date(result.resetAt).toISOString(),
      });
    }
    
    return result;
  },
  reset: (identifier: string) => store.reset(`registration:${identifier}`),
};

export function getClientIdentifier(req: Request): string {
  // Try to get IP from common proxy headers
  const forwarded = req.headers.get('x-forwarded-for') || '';
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

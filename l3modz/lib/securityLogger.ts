/**
 * Security audit logger
 * Logs security-related events without exposing sensitive information
 */

import { createLogger } from './logger';

const securityLogger = createLogger('security-audit');

interface SecurityEvent {
  event: string;
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  action: string;
  status: 'success' | 'failure';
  reason?: string;
  ip?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Log admin login attempt (success or failure)
 * NEVER logs password or token
 */
export function logAdminLoginAttempt(email: string, ip: string, success: boolean, reason?: string) {
  const event: SecurityEvent = {
    event: 'admin_login_attempt',
    action: success ? 'login' : 'failed_login',
    status: success ? 'success' : 'failure',
    ip,
    timestamp: new Date().toISOString(),
    reason: reason || (success ? 'Credentials matched' : 'Invalid credentials'),
    metadata: {
      email: email.toLowerCase(),
    },
  };

  if (success) {
    securityLogger.info(JSON.stringify(event));
  } else {
    securityLogger.warn(JSON.stringify(event));
  }
}

/**
 * Log user login attempt (success or failure)
 * NEVER logs password or token
 */
export function logUserLoginAttempt(email: string, ip: string, success: boolean, reason?: string) {
  const event: SecurityEvent = {
    event: 'user_login_attempt',
    action: success ? 'login' : 'failed_login',
    status: success ? 'success' : 'failure',
    ip,
    timestamp: new Date().toISOString(),
    reason: reason || (success ? 'Credentials matched' : 'Invalid credentials'),
    metadata: {
      email: email.toLowerCase(),
    },
  };

  if (success) {
    securityLogger.info(JSON.stringify(event));
  } else {
    securityLogger.warn(JSON.stringify(event));
  }
}

/**
 * Log unauthorized admin access attempt
 */
export function logUnauthorizedAdminAccess(userId: string | null, endpoint: string, method: string, ip: string) {
  const event: SecurityEvent = {
    event: 'unauthorized_admin_access',
    action: 'access_denied',
    status: 'failure',
    user: userId ? { id: userId } : undefined,
    ip,
    timestamp: new Date().toISOString(),
    reason: 'User is not admin',
    metadata: {
      endpoint,
      method,
    },
  };

  securityLogger.warn(JSON.stringify(event));
}

/**
 * Log password change or reset
 * NEVER logs old or new password
 */
export function logPasswordChange(userId: string, action: 'change' | 'reset', success: boolean, reason?: string) {
  const event: SecurityEvent = {
    event: 'password_change',
    action,
    status: success ? 'success' : 'failure',
    user: { id: userId },
    timestamp: new Date().toISOString(),
    reason: reason || (success ? 'Password updated' : 'Password change failed'),
  };

  if (success) {
    securityLogger.info(JSON.stringify(event));
  } else {
    securityLogger.warn(JSON.stringify(event));
  }
}

/**
 * Log rate limit violations
 */
export function logRateLimitViolation(identifier: string, type: 'admin_login' | 'user_login' | 'registration', resetAt: number) {
  const event: SecurityEvent = {
    event: 'rate_limit_violation',
    action: 'rate_limit_exceeded',
    status: 'failure',
    timestamp: new Date().toISOString(),
    reason: `Too many ${type} attempts`,
    metadata: {
      type,
      identifier,
      resetAt: new Date(resetAt).toISOString(),
    },
  };

  securityLogger.warn(JSON.stringify(event));
}

/**
 * Log configuration errors
 */
export function logConfigurationError(component: string, issue: string, severity: 'warning' | 'error') {
  const event = {
    event: 'configuration_error',
    component,
    issue,
    severity,
    timestamp: new Date().toISOString(),
  };

  if (severity === 'error') {
    securityLogger.error(JSON.stringify(event));
  } else {
    securityLogger.warn(JSON.stringify(event));
  }
}

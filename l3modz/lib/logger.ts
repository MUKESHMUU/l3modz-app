type LogMeta = Record<string, unknown>;

const REDACTED_KEYS = /password|secret|token|signature|authorization|cookie|email|phone/i;
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === 'undefined') return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as LogMeta)
        .slice(0, 50)
        .map(([key, item]) => [key, REDACTED_KEYS.test(key) ? '[REDACTED]' : sanitizeValue(item)])
    );
  }
  return String(value);
}

function write(scope: string, level: 'debug' | 'info' | 'warn' | 'error', event: string, meta?: LogMeta) {
  if (level === 'debug' && !IS_DEVELOPMENT) return;

  const sanitizedMeta = (meta ? sanitizeValue(meta) : {}) as Record<string, unknown>;
  const payload = {
    scope,
    event,
    ...sanitizedMeta,
    timestamp: new Date().toISOString(),
  };
  const message = `[${scope}] ${event}`;

  if (level === 'error') {
    console.error(message, payload);
    return;
  }
  if (level === 'warn') {
    console.warn(message, payload);
    return;
  }
  if (level === 'info') {
    console.info(message, payload);
    return;
  }
  console.debug(message, payload);
}

export function createLogger(scope: string) {
  return {
    debug(event: string, meta?: LogMeta) {
      write(scope, 'debug', event, meta);
    },
    info(event: string, meta?: LogMeta) {
      write(scope, 'info', event, meta);
    },
    warn(event: string, meta?: LogMeta) {
      write(scope, 'warn', event, meta);
    },
    error(event: string, meta?: LogMeta) {
      write(scope, 'error', event, meta);
    },
  };
}

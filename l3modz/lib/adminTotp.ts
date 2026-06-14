import crypto from 'crypto';
import { getEnvValue } from './env';

function normalizeBase32(input: string) {
  return (input || '').replace(/\s+/g, '').toUpperCase();
}

function base32ToBuffer(base32: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = normalizeBase32(base32).replace(/=+$/g, '');

  let bits = '';
  for (const ch of cleaned) {
    const val = alphabet.indexOf(ch);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number, digits = 6) {
  const key = base32ToBuffer(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 10 ** digits).padStart(digits, '0');
}

export function getAdminTotpSecret() {
  const configured = getEnvValue('ADMIN_TOTP_SECRET');
  if (!configured) {
    throw new Error('ADMIN_TOTP_SECRET is required');
  }
  return normalizeBase32(configured);
}

export function verifyAdminTotp(code: string, window = 1) {
  const secret = getAdminTotpSecret();
  const nowStep = Math.floor(Date.now() / 30000);
  const normalizedCode = String(code || '').replace(/\D/g, '').slice(0, 6);

  for (let w = -window; w <= window; w += 1) {
    const expected = hotp(secret, nowStep + w, 6);
    if (expected === normalizedCode) {
      return true;
    }
  }

  return false;
}

export function getAdminTotpSetup() {
  const secret = getAdminTotpSecret();
  const issuer = 'L3Modz';
  const label = 'Admin';
  const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

  return { secret, uri };
}

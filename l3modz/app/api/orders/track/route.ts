import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { buildPublicTrackingSnapshot } from '@/lib/tracking';
import { createLogger } from '@/lib/logger';

const logger = createLogger('public-tracking');
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  attempts.set(key, current);
  return current.count > RATE_LIMIT_MAX;
}

function sanitizeInput(value: unknown) {
  return String(value || '').replace(/[<>"'`\\]/g, '').trim();
}

function hashContact(value: string) {
  return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 12);
}

export async function POST(req: Request) {
  try {
    const key = getClientKey(req);
    if (isRateLimited(key)) {
      return NextResponse.json({ message: 'Too many tracking attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = sanitizeInput(body?.orderId);
    const email = sanitizeInput(body?.email);
    const phone = sanitizeInput(body?.phone);

    if (orderId.length > 32 || email.length > 128 || phone.length > 24) {
      return NextResponse.json({ message: 'Invalid tracking reference' }, { status: 400 });
    }

    if (!/^[a-fA-F0-9]{24}$/.test(orderId)) {
      return NextResponse.json({ message: 'Invalid tracking reference' }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json({ message: 'Email or phone is required' }, { status: 400 });
    }

    const emailMatch = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false;
    const phoneMatch = phone ? /^\+?[0-9\-\s]{8,15}$/.test(phone) : false;
    if (!emailMatch && !phoneMatch) {
      return NextResponse.json({ message: 'Provide a valid email or phone number' }, { status: 400 });
    }

    await dbConnect();
    const order = await Order.findById(orderId);
    const isEmailMatch = Boolean(email && ((order?.guestInfo?.email || '').trim().toLowerCase() === email.toLowerCase()));
    const isPhoneMatch = Boolean(phone && ((order?.guestInfo?.phone || '').trim().replace(/\s+/g, '') === phone.replace(/\s+/g, '')));

    if (!order || (!isEmailMatch && !isPhoneMatch)) {
      logger.warn('tracking_lookup_denied', {
        orderId,
        contactHash: email ? hashContact(email) : phone ? hashContact(phone) : null,
        ip: key,
      });
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    logger.info('tracking_lookup_success', {
      orderId: String(order._id),
      ip: key,
    });

    return NextResponse.json(buildPublicTrackingSnapshot(order as any));
  } catch (error: any) {
    logger.error('tracking_lookup_failed', {
      error: error?.message || String(error),
    });
    return NextResponse.json({ message: error.message || 'Failed to track order' }, { status: 500 });
  }
}

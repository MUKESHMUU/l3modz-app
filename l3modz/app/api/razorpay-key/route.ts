import { NextResponse } from 'next/server';
import { getEnvValue, validateProductionEnv } from '@/lib/env';

const allowedOrigins = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);

export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
  headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return new NextResponse(null, { status: 204, headers });
}

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      validateProductionEnv();
    }

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
    headers.set('Access-Control-Allow-Credentials', 'true');

    const key = getEnvValue('RAZORPAY_KEY_ID') || getEnvValue('NEXT_PUBLIC_RAZORPAY_KEY_ID');
    console.info('[API] /api/razorpay-key called. key present:', Boolean(key));

    if (!key) {
      return NextResponse.json({ message: 'Razorpay is not configured' }, { status: 503, headers });
    }

    return NextResponse.json({ key }, { status: 200, headers });
  } catch (error: any) {
    console.error('[API] /api/razorpay-key error:', error);
    return NextResponse.json({ message: 'Failed to load Razorpay configuration' }, { status: 500 });
  }
}

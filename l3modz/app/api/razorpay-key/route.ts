import { NextResponse } from 'next/server';

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
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
    headers.set('Access-Control-Allow-Credentials', 'true');

    const key = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    console.info('[API] /api/razorpay-key called. key present:', Boolean(key));

    return NextResponse.json({ key }, { status: 200, headers });
  } catch (error: any) {
    console.error('[API] /api/razorpay-key error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

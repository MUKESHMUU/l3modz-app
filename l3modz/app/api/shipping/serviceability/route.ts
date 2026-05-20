import { NextResponse } from 'next/server';
import { checkPincodeServiceability } from '@/lib/shiprocket';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pincode = String(body?.pincode || '').trim();

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ message: 'Valid 6-digit pincode is required' }, { status: 400 });
    }

    const result = await checkPincodeServiceability({
      deliveryPincode: pincode,
      cod: false,
      weightKg: Number(body?.weightKg || process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || 0.5),
    });

    console.info('[API] /api/shipping/serviceability checked', { pincode, serviceable: result.serviceable, message: result.message });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to check pincode serviceability' }, { status: 500 });
  }
}

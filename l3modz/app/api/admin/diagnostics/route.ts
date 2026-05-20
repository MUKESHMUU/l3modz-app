import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/checkAuth';
import { getShiprocketDiagnostics } from '@/lib/shiprocket';

export async function GET(_: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    const shiprocket = await getShiprocketDiagnostics();

    return NextResponse.json({ shiprocket });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to get diagnostics' }, { status: 500 });
  }
}

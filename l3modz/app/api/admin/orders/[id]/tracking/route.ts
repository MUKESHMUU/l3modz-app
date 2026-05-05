import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/checkAuth';
import { refreshTracking } from '@/lib/orderFulfillment';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const id = (await params).id;
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const result = await refreshTracking(order as any);
    await order.save();

    return NextResponse.json({
      message: result.ok ? 'Tracking refreshed' : result.error,
      order,
      ok: result.ok,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to refresh tracking' }, { status: 500 });
  }
}

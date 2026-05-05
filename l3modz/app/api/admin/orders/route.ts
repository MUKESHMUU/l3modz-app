import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/checkAuth';
import { refreshTracking, shouldAutoRefreshTracking } from '@/lib/orderFulfillment';

export async function GET(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const orders = await Order.find({}).populate('user', 'name email phone').sort({ createdAt: -1 });

    const activeOrdersToSync = orders
      .filter((order: any) => shouldAutoRefreshTracking(order))
      .slice(0, 15);

    for (const order of activeOrdersToSync) {
      await refreshTracking(order as any);
      await order.save();
    }
    
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

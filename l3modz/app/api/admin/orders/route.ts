import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/checkAuth';
import { refreshTracking, shouldAutoRefreshTracking } from '@/lib/orderFulfillment';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-orders');

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

    const syncResults = await Promise.allSettled(
      activeOrdersToSync.map(async (order) => {
        const result = await refreshTracking(order as any);
        return { order, result };
      })
    );

    await Promise.allSettled(activeOrdersToSync.map((order) => order.save()));

    syncResults.forEach((settled) => {
      if (settled.status === 'rejected') {
        logger.warn('order_tracking_sync_failed', { error: String(settled.reason) });
      } else if (!settled.value.result.ok) {
        logger.warn('order_tracking_sync_unavailable', {
          error: settled.value.result.error,
          orderId: String(settled.value.order._id),
        });
      }
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

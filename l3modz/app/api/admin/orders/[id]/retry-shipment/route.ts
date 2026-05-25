import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/checkAuth';
import { syncOrderToShiprocket } from '@/lib/orderFulfillment';
import { sendOrderShipmentNotifications } from '@/lib/notifications';

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

    if (order.deliveryPartner && order.deliveryPartner !== 'Shiprocket') {
      return NextResponse.json({ message: 'Retry shipment is only available for Shiprocket orders.' }, { status: 400 });
    }

    if (!order.isPaid) {
      return NextResponse.json({ message: 'Order must be paid before retrying shipment creation.' }, { status: 400 });
    }

    order.deliveryPartner = 'Shiprocket';
    const result = await syncOrderToShiprocket(order as any);
    await order.save();

    if (result.ok && !order.shippingNotificationSentAt && (order.AWB_number || order.tracking_url)) {
      await sendOrderShipmentNotifications(order as any);
      order.shippingNotificationSentAt = new Date();
      await order.save();
    }

    return NextResponse.json({
      message: result.ok ? 'Shipment retried successfully' : result.error,
      order,
      ok: result.ok,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to retry shipment' }, { status: 500 });
  }
}

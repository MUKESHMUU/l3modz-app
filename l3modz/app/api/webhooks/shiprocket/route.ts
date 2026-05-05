import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';

function mapDeliveryStatus(rawStatus: string) {
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized.includes('delivered')) return { delivery_status: 'delivered', status: 'Delivered' };
  if (normalized.includes('out for delivery')) return { delivery_status: 'out_for_delivery', status: 'Shipped' };
  if (normalized.includes('shipped') || normalized.includes('in transit')) return { delivery_status: 'shipped', status: 'Shipped' };
  if (normalized.includes('rto') || normalized.includes('returned')) return { delivery_status: 'returned', status: 'Cancelled' };
  if (normalized.includes('cancel')) return { delivery_status: 'cancelled', status: 'Cancelled' };
  return { delivery_status: normalized || 'updated', status: undefined };
}

export async function POST(req: Request) {
  try {
    const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    const incomingSecret = req.headers.get('x-shiprocket-secret') || req.headers.get('x-webhook-secret') || '';
    if (secret && incomingSecret !== secret) {
      return NextResponse.json({ message: 'Invalid webhook secret' }, { status: 401 });
    }

    const body = await req.json();

    const awb = body?.awb || body?.awb_code || body?.data?.awb || body?.data?.awb_code;
    const shipmentId = body?.shipment_id || body?.data?.shipment_id;
    const statusRaw = body?.current_status || body?.status || body?.shipment_status || body?.data?.current_status || body?.data?.status;
    const trackingUrl = body?.tracking_url || body?.track_url || body?.data?.tracking_url || body?.data?.track_url;

    await dbConnect();

    const orFilters: Record<string, string>[] = [];
    if (awb) orFilters.push({ AWB_number: String(awb) });
    if (shipmentId) orFilters.push({ shipment_id: String(shipmentId) });

    if (orFilters.length === 0) {
      return NextResponse.json({ message: 'No AWB or shipment id in webhook payload' }, { status: 400 });
    }

    const order = await Order.findOne({ $or: orFilters } as any);

    if (!order) {
      return NextResponse.json({ message: 'Order not found for webhook payload' }, { status: 404 });
    }

    const mapped = mapDeliveryStatus(String(statusRaw || ''));
    order.deliveryPartner = 'Shiprocket';
    order.delivery_status = mapped.delivery_status;
    if (mapped.status) {
      order.status = mapped.status as any;
      if (mapped.status === 'Delivered') {
        order.deliveredAt = new Date();
      }
    }

    if (trackingUrl) {
      order.tracking_url = String(trackingUrl);
    }

    order.shiprocketLastSyncAt = new Date();
    await order.save();

    return NextResponse.json({ message: 'Webhook processed', orderId: String(order._id) });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to process webhook' }, { status: 500 });
  }
}

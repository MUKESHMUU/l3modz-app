import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin, getUserFromToken } from '@/lib/checkAuth';
import { refreshTracking, syncOrderToShiprocket } from '@/lib/orderFulfillment';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const id = (await params).id;
    const user = await getUserFromToken();
    const isAdmin = await checkAdmin();

    const order = await Order.findById(id).populate('user', 'name email phone');

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const ownerId = order.user && typeof order.user === 'object' && '_id' in order.user ? String(order.user._id) : String(order.user || '');
    if (!isAdmin && (!user || ownerId !== String(user._id))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const id = (await params).id;
    const body = await req.json();
    const {
      status,
      deliveryPartner,
      courierPartner,
      shippingPartner,
      partner,
      courierName,
      awbNumber,
      trackingUrl,
    } = body;

    console.info('[orders.put] body', {
      id,
      status,
      deliveryPartner,
      courierPartner,
      shippingPartner,
      partner,
      courierName,
      awbNumber,
      trackingUrl,
    });

    const requestedPartner =
      typeof deliveryPartner === 'string'
        ? deliveryPartner
        : typeof courierPartner === 'string'
          ? courierPartner
          : typeof shippingPartner === 'string'
            ? shippingPartner
          : typeof partner === 'string'
            ? partner
            : undefined;

    const normalizedPartner =
      requestedPartner === 'India Post' || requestedPartner === 'Shiprocket' || requestedPartner === 'Other' || requestedPartner === 'Custom Courier'
        ? (requestedPartner === 'Custom Courier' ? 'Other' : requestedPartner)
        : undefined;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const previousStatus = order.status;

    if (normalizedPartner) {
      order.deliveryPartner = normalizedPartner;
    }

    if (typeof courierName === 'string') {
      order.courier_name = courierName.trim();
    }
    if (typeof awbNumber === 'string') {
      order.AWB_number = awbNumber.trim();
    }
    if (typeof trackingUrl === 'string') {
      order.tracking_url = trackingUrl.trim();
    }

    if (typeof status === 'string' && status.trim()) {
      order.status = status;
    }

    if (order.status === 'Shipped') {
      const activePartner = (order.deliveryPartner || 'Shiprocket') as 'Shiprocket' | 'India Post' | 'Other';
      order.deliveryPartner = activePartner;

      // Only create or refresh Shiprocket data when the order transitions into Shipped.
      // Partner-only edits on an already shipped order should not retrigger fulfillment.
      if (previousStatus !== 'Shipped') {
        if (activePartner === 'Shiprocket') {
          if (!order.shipment_id || !order.AWB_number) {
            const syncResult = await syncOrderToShiprocket(order as any);
            if (!syncResult.ok) {
              return NextResponse.json({ message: syncResult.error || 'Failed to create Shiprocket shipment' }, { status: 400 });
            }
          }

          await refreshTracking(order as any);
        } else {
          const finalAwb = order.AWB_number?.trim();
          if (!finalAwb) {
            return NextResponse.json({ message: 'Custom courier shipments require a tracking/AWB number before marking as shipped.' }, { status: 400 });
          }

          order.AWB_number = finalAwb;
          if (activePartner === 'India Post') {
            order.courier_name = order.courier_name || 'India Post';
          } else if (!order.courier_name?.trim()) {
            return NextResponse.json({ message: 'Custom courier shipments require a courier name.' }, { status: 400 });
          }
          order.delivery_status = order.delivery_status || 'shipped';
          order.shiprocketSyncError = '';
        }
      }
    }

    if (order.status === 'Delivered') {
      order.deliveredAt = new Date();
      order.delivery_status = 'delivered';
    }

    await order.save();
    console.info('[orders.put] updatedOrder', {
      id: String(order._id),
      status: order.status,
      deliveryPartner: order.deliveryPartner,
      courier_name: order.courier_name,
      AWB_number: order.AWB_number,
      tracking_url: order.tracking_url,
    });
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

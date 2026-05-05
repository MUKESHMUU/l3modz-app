import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { checkAdmin } from '@/lib/checkAuth';
import { createReturnShipment } from '@/lib/shiprocket';

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
      return NextResponse.json(
        { message: 'Return pickup is only available for Shiprocket shipments.' },
        { status: 400 }
      );
    }

    const result = await createReturnShipment(order as any);

    if (result.returnShipmentId) order.return_shipment_id = result.returnShipmentId;
    if (result.returnAwbCode) order.return_awb_number = result.returnAwbCode;
    if (result.returnTrackingUrl) order.return_tracking_url = result.returnTrackingUrl;
    order.return_shipment_status = result.returnStatus || 'return_requested';
    order.shiprocketLastSyncAt = new Date();

    await order.save();

    return NextResponse.json({
      message: 'Return pickup created successfully',
      order,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to create return pickup' }, { status: 500 });
  }
}

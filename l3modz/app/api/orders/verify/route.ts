import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { markBillSent, refreshTracking, syncOrderToShiprocket } from '@/lib/orderFulfillment';
import { sendOrderPaidNotifications, sendOrderShipmentNotifications } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return NextResponse.json({ message: 'Transaction not legit!' }, { status: 400 });
    }

    // Find the order and update status
    const order = await Order.findOne({ 'paymentResult.razorpay_order_id': razorpay_order_id });
    
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (order.isPaid && order.paymentResult?.razorpay_payment_id === razorpay_payment_id && order.paymentResult?.status === 'paid') {
      return NextResponse.json({
        message: 'Payment already verified',
        orderId: order._id,
        shipmentSynced: Boolean(order.shipment_id || order.AWB_number),
      });
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.status = 'Confirmed';
    markBillSent(order);
    
    if (!order.paymentResult) {
      order.paymentResult = { razorpay_order_id: razorpay_order_id, razorpay_payment_id: '', razorpay_signature: '', status: '' };
    }
    order.paymentResult.razorpay_payment_id = razorpay_payment_id;
    order.paymentResult.razorpay_signature = razorpay_signature;
    order.paymentResult.status = 'paid';

    let syncResult: { ok: boolean; error?: string } = { ok: false };
    const autoShiprocketOnPayment = process.env.AUTO_SHIPROCKET_ON_PAYMENT === 'true';
    if (autoShiprocketOnPayment) {
      syncResult = await syncOrderToShiprocket(order as any);
      if (syncResult.ok) {
        await refreshTracking(order as any);
      }
    }

    await order.save();
    await sendOrderPaidNotifications(order as any);

    if (syncResult.ok && !order.shippingNotificationSentAt) {
      await sendOrderShipmentNotifications(order as any);
      order.shippingNotificationSentAt = new Date();
      await order.save();
    }

    return NextResponse.json({
      message: 'Payment verified successfully',
      orderId: order._id,
      shipmentSynced: autoShiprocketOnPayment ? syncResult.ok : false,
      shipmentError: autoShiprocketOnPayment && !syncResult.ok ? syncResult.error : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

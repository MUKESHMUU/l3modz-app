import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { getRazorpayClient } from '@/lib/razorpay';
import { getUserFromToken } from '@/lib/checkAuth';
import { checkPincodeServiceability } from '@/lib/shiprocket';
import { refreshTracking, shouldAutoRefreshTracking } from '@/lib/orderFulfillment';
import { sendOrderBillNotifications } from '@/lib/notifications';
import { createLogger } from '@/lib/logger';

const logger = createLogger('orders');

export async function GET() {
  try {
    await dbConnect();
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json([], { status: 200 });
    }

    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });

    const activeOrdersToSync = orders
      .filter((order: any) => shouldAutoRefreshTracking(order, 10))
      .slice(0, 8);

    for (const order of activeOrdersToSync) {
      await refreshTracking(order as any);
      await order.save();
    }

    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to load orders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getUserFromToken();
    const body = await req.json();

    const { orderItems, shippingAddress, paymentMethod, guestInfo } = body;

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ message: 'No order items' }, { status: 400 });
    }

    const normalizedShippingAddress = {
      addressLine1: shippingAddress?.addressLine1 || shippingAddress?.street || '',
      addressLine2: shippingAddress?.addressLine2 || '',
      landmark: shippingAddress?.landmark || '',
      locality: shippingAddress?.locality || '',
      street: shippingAddress?.street || shippingAddress?.addressLine1 || '',
      city: shippingAddress?.city || '',
      state: shippingAddress?.state || '',
      pincode: shippingAddress?.pincode || '',
    };

    if (!normalizedShippingAddress.addressLine1 || !normalizedShippingAddress.landmark || !normalizedShippingAddress.locality || !normalizedShippingAddress.city || !normalizedShippingAddress.state || !normalizedShippingAddress.pincode) {
      return NextResponse.json({ message: 'Incomplete shipping address' }, { status: 400 });
    }

    if (paymentMethod !== 'Razorpay') {
      return NextResponse.json({ message: 'Only online prepaid orders are allowed.' }, { status: 400 });
    }

    // Calculate prices
    const totalPrice = orderItems.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const totalUnits = orderItems.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0) || 1;
    const packageWeightKg = Number((Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || '0.5') * totalUnits).toFixed(2));
    const packageLengthCm = Number(process.env.SHIPROCKET_DEFAULT_LENGTH_CM || '20');
    const packageBreadthCm = Number(process.env.SHIPROCKET_DEFAULT_BREADTH_CM || '15');
    const packageHeightCm = Number(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM || '10');

    const razorpayConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID &&
      (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET)
    );
    logger.debug('razorpay_configuration_status', { configured: razorpayConfigured });

    if (!razorpayConfigured) {
      return NextResponse.json({ message: 'Razorpay is not configured yet. Add valid Razorpay keys to continue.' }, { status: 400 });
    }

    const serviceability = await checkPincodeServiceability({
      deliveryPincode: normalizedShippingAddress.pincode,
      cod: false,
      weightKg: packageWeightKg,
    });

    if (!serviceability.serviceable) {
      return NextResponse.json({ message: 'Delivery is currently unavailable for this pincode.' }, { status: 400 });
    }

    const order = new Order({
      orderItems,
      user: user ? user._id : undefined,
      guestInfo: !user ? guestInfo : undefined,
      shippingAddress: normalizedShippingAddress,
      paymentMethod,
      totalPrice,
      packageWeightKg,
      packageLengthCm,
      packageBreadthCm,
      packageHeightCm,
      delivery_status: 'payment_pending',
      isPaid: false,
    });

    await order.save();

    // Send bill notification to customer
    try {
      await sendOrderBillNotifications(order as any);
    } catch (notificationError) {
      // Log notification error but don't fail the order creation
      logger.error('order_bill_notification_failed', {
        orderId: order._id?.toString(),
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
      });
    }

    const options = {
      amount: Math.round(totalPrice * 100), // amount in paise
      currency: 'INR',
      receipt: order._id.toString(),
    };

    const rzpOrder = await getRazorpayClient().orders.create(options);
    logger.info('razorpay_order_created', {
      orderId: order._id?.toString(),
      razorpayOrderId: rzpOrder.id,
    });

    order.paymentResult = {
      razorpay_order_id: rzpOrder.id,
      razorpay_payment_id: '',
      razorpay_signature: '',
      status: 'created'
    };
    await order.save();

    return NextResponse.json({
      order,
      razorpayOrderId: rzpOrder.id,
      amount: options.amount,
      currency: options.currency
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to create order' }, { status: 500 });
  }
}

import type { IOrder } from '@/models/Order';

async function postNotification(endpointEnv: string, payload: Record<string, unknown>) {
  const endpoint = process.env[endpointEnv];
  if (!endpoint || endpoint.includes('your-') || endpoint === '') {
    // Silently skip if endpoint is not configured or is a placeholder
    return { success: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { success: true, reason: 'sent' };
  } catch (error: any) {
    return { success: false, reason: 'error', error: error.message };
  }
}

export async function sendOrderPaidNotifications(order: IOrder) {
  const customerName = order.guestInfo?.name || 'Customer';
  const customerEmail = order.guestInfo?.email || '';
  const customerPhone = order.guestInfo?.phone || '';

  const payload = {
    type: 'ORDER_PAID',
    orderId: String(order._id),
    invoiceNumber: order.invoiceNumber,
    amount: order.totalPrice,
    customerName,
    customerEmail,
    customerPhone,
    paymentMethod: order.paymentMethod,
    status: order.status,
    trackingUrl: order.tracking_url || null,
    awb: order.AWB_number || null,
  };

  const [emailResult, smsResult, whatsappResult] = await Promise.all([
    postNotification('NOTIFY_EMAIL_ENDPOINT', payload),
    postNotification('NOTIFY_SMS_ENDPOINT', payload),
    postNotification('NOTIFY_WHATSAPP_ENDPOINT', payload),
  ]);

  // Only log errors for actually configured services that failed
  const failedServices = [];
  if (emailResult.success === false && emailResult.reason === 'error') failedServices.push('email');
  if (smsResult.success === false && smsResult.reason === 'error') failedServices.push('sms');
  if (whatsappResult.success === false && whatsappResult.reason === 'error') failedServices.push('whatsapp');

  if (failedServices.length > 0) {
    console.error('[Notification] Failed to send notifications for configured services', {
      orderId: String(order._id),
      failedServices,
      emailResult,
      smsResult,
      whatsappResult,
    });
  }

  // Log successful sends for monitoring
  const sentServices = [];
  if (emailResult.success) sentServices.push('email');
  if (smsResult.success) sentServices.push('sms');
  if (whatsappResult.success) sentServices.push('whatsapp');

  if (sentServices.length > 0) {
    console.info('[Notification] Order paid notifications sent successfully', {
      orderId: String(order._id),
      sentServices,
    });
  }
}

export async function sendOrderBillNotifications(order: IOrder) {
  const customerName = order.guestInfo?.name || 'Customer';
  const customerEmail = order.guestInfo?.email || '';
  const customerPhone = order.guestInfo?.phone || '';

  // Generate invoice number if not already present
  const invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`;

  const orderItems = order.orderItems?.map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    total: item.price * item.quantity
  })) || [];

  const payload = {
    type: 'ORDER_BILL',
    orderId: String(order._id),
    invoiceNumber,
    amount: order.totalPrice,
    customerName,
    customerEmail,
    customerPhone,
    orderItems,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt,
    razorpayOrderId: order.paymentResult?.razorpay_order_id,
    paymentInstructions: 'Please complete your payment using the Razorpay payment link to confirm your order.',
  };

  const [emailResult, smsResult, whatsappResult] = await Promise.all([
    postNotification('NOTIFY_EMAIL_ENDPOINT', payload),
    postNotification('NOTIFY_SMS_ENDPOINT', payload),
    postNotification('NOTIFY_WHATSAPP_ENDPOINT', payload),
  ]);

  // Only log errors for actually configured services that failed
  const failedServices = [];
  if (emailResult.success === false && emailResult.reason === 'error') failedServices.push('email');
  if (smsResult.success === false && smsResult.reason === 'error') failedServices.push('sms');
  if (whatsappResult.success === false && whatsappResult.reason === 'error') failedServices.push('whatsapp');

  if (failedServices.length > 0) {
    console.error('[Notification] Failed to send bill notifications for configured services', {
      orderId: String(order._id),
      failedServices,
      emailResult,
      smsResult,
      whatsappResult,
    });
  }

  // Log successful sends for monitoring
  const sentServices = [];
  if (emailResult.success) sentServices.push('email');
  if (smsResult.success) sentServices.push('sms');
  if (whatsappResult.success) sentServices.push('whatsapp');

  if (sentServices.length > 0) {
    console.info('[Notification] Order bill notifications sent successfully', {
      orderId: String(order._id),
      sentServices,
    });
  }
}

export async function sendOrderShipmentNotifications(order: IOrder) {
  const customerName = order.guestInfo?.name || 'Customer';
  const customerEmail = order.guestInfo?.email || '';
  const customerPhone = order.guestInfo?.phone || '';

  const payload = {
    type: 'ORDER_SHIPPED',
    orderId: String(order._id),
    invoiceNumber: order.invoiceNumber,
    amount: order.totalPrice,
    customerName,
    customerEmail,
    customerPhone,
    status: order.status,
    deliveryStatus: order.delivery_status,
    deliveryPartner: order.deliveryPartner || 'Shiprocket',
    courierName: order.courier_name || null,
    awb: order.AWB_number || null,
    trackingUrl: order.tracking_url || null,
    shipmentId: order.shipment_id || null,
    estimatedDelivery: order.estimated_delivery || null,
  };

  const [emailResult, smsResult, whatsappResult] = await Promise.all([
    postNotification('NOTIFY_EMAIL_ENDPOINT', payload),
    postNotification('NOTIFY_SMS_ENDPOINT', payload),
    postNotification('NOTIFY_WHATSAPP_ENDPOINT', payload),
  ]);

  const failedServices = [];
  if (emailResult.success === false && emailResult.reason === 'error') failedServices.push('email');
  if (smsResult.success === false && smsResult.reason === 'error') failedServices.push('sms');
  if (whatsappResult.success === false && whatsappResult.reason === 'error') failedServices.push('whatsapp');

  if (failedServices.length > 0) {
    console.error('[Notification] Failed to send shipment notifications for configured services', {
      orderId: String(order._id),
      failedServices,
      emailResult,
      smsResult,
      whatsappResult,
    });
  }

  const sentServices = [];
  if (emailResult.success) sentServices.push('email');
  if (smsResult.success) sentServices.push('sms');
  if (whatsappResult.success) sentServices.push('whatsapp');

  if (sentServices.length > 0) {
    console.info('[Notification] Order shipment notifications sent successfully', {
      orderId: String(order._id),
      sentServices,
    });
  }
}

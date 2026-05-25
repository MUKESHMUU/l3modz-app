import type { IOrder } from '@/models/Order';
import nodemailer from 'nodemailer';

type NotificationPayload = Record<string, unknown> & {
  type?: string;
  customerEmail?: string;
  customerName?: string;
  orderId?: string;
  invoiceNumber?: string;
  trackingUrl?: string | null;
  awb?: string | null;
  deliveryPartner?: string | null;
  courierName?: string | null;
  status?: string;
  deliveryStatus?: string;
};

let smtpTransporter: nodemailer.Transporter | null = null;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_FROM));
}

function getSmtpTransporter() {
  if (!isSmtpConfigured()) return null;

  if (!smtpTransporter) {
    const port = Number(process.env.SMTP_PORT || '587');
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
          }
        : undefined,
    });
  }

  return smtpTransporter;
}

function buildEmailContent(payload: NotificationPayload) {
  const type = String(payload.type || 'NOTIFICATION').toUpperCase();
  const customerName = String(payload.customerName || 'Customer');
  const orderId = String(payload.orderId || '');
  const invoiceNumber = String(payload.invoiceNumber || '');
  const trackingUrl = String(payload.trackingUrl || '');
  const awb = String(payload.awb || '');
  const status = String(payload.status || payload.deliveryStatus || '');
  const deliveryPartner = String(payload.deliveryPartner || '');
  const courierName = String(payload.courierName || '');

  const subjectMap: Record<string, string> = {
    ORDER_PAID: `Payment confirmed${orderId ? ` • Order ${orderId.slice(-8)}` : ''}`,
    ORDER_BILL: `Your invoice is ready${invoiceNumber ? ` • ${invoiceNumber}` : ''}`,
    ORDER_SHIPPED: `Your order has shipped${orderId ? ` • ${orderId.slice(-8)}` : ''}`,
    ORDER_STATUS_UPDATE: `Order update${orderId ? ` • ${orderId.slice(-8)}` : ''}`,
  };

  const subject = subjectMap[type] || `L3 MODZ order update${orderId ? ` • ${orderId.slice(-8)}` : ''}`;
  const summaryLines = [
    `Hello ${customerName},`,
    '',
    `Order ID: ${orderId || '-'}`,
    invoiceNumber ? `Invoice: ${invoiceNumber}` : '',
    status ? `Status: ${status}` : '',
    deliveryPartner ? `Delivery Partner: ${deliveryPartner}` : '',
    courierName ? `Courier: ${courierName}` : '',
    awb ? `AWB: ${awb}` : '',
    trackingUrl ? `Tracking Link: ${trackingUrl}` : '',
    '',
    'Thank you for shopping with L3 MODZ.',
  ].filter(Boolean);

  const text = summaryLines.join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <p>Hello ${customerName},</p>
      <p>Your order update is ready.</p>
      <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse">
        ${orderId ? `<tr><td><strong>Order ID</strong></td><td>${orderId}</td></tr>` : ''}
        ${invoiceNumber ? `<tr><td><strong>Invoice</strong></td><td>${invoiceNumber}</td></tr>` : ''}
        ${status ? `<tr><td><strong>Status</strong></td><td>${status}</td></tr>` : ''}
        ${deliveryPartner ? `<tr><td><strong>Delivery Partner</strong></td><td>${deliveryPartner}</td></tr>` : ''}
        ${courierName ? `<tr><td><strong>Courier</strong></td><td>${courierName}</td></tr>` : ''}
        ${awb ? `<tr><td><strong>AWB</strong></td><td>${awb}</td></tr>` : ''}
      </table>
      ${trackingUrl ? `<p><a href="${trackingUrl}" target="_blank" rel="noreferrer">Track your shipment</a></p>` : ''}
      <p>Thank you for shopping with L3 MODZ.</p>
    </div>`;

  return { subject, text, html };
}

async function sendEmailWithSmtp(payload: NotificationPayload) {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    return { success: false, reason: 'not_configured' as const };
  }

  const recipient = String(payload.customerEmail || '').trim();
  if (!recipient) {
    return { success: false, reason: 'not_configured' as const };
  }

  const fromAddress = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  if (!fromAddress) {
    return { success: false, reason: 'not_configured' as const };
  }

  const { subject, text, html } = buildEmailContent(payload);
  const maxAttempts = 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.info('[Notification] SMTP send start', {
        attempt,
        recipient,
        subject,
        timestamp: new Date().toISOString(),
      });

      const result = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        text,
        html,
      });

      console.info('[Notification] SMTP send success', {
        attempt,
        messageId: result.messageId,
        recipient,
        timestamp: new Date().toISOString(),
      });

      return { success: true, reason: 'sent' as const };
    } catch (error: any) {
      lastError = error?.message || String(error);
      console.error('[Notification] SMTP send failed', {
        attempt,
        recipient,
        error: lastError,
        timestamp: new Date().toISOString(),
      });
      if (attempt < maxAttempts && /network|timeout|ETIMEDOUT|ECONN|rate/i.test(lastError || '')) {
        continue;
      }
    }
  }

  return { success: false, reason: 'error' as const, error: lastError || 'SMTP delivery failed' };
}

async function postNotification(endpointEnv: string, payload: Record<string, unknown>) {
  const endpoint = process.env[endpointEnv];
  if (!endpoint || endpoint.includes('your-') || endpoint === '') {
    // Silently skip if endpoint is not configured or is a placeholder
    return { success: false, reason: 'not_configured' };
  }

  if (endpointEnv === 'NOTIFY_EMAIL_ENDPOINT' && isSmtpConfigured()) {
    // Prefer direct SMTP for customer email notifications when it is configured.
    return sendEmailWithSmtp(payload as NotificationPayload);
  }

  const maxAttempts = 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.info('[Notification] Sending payload', {
        endpointEnv,
        attempt,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.info('[Notification] Response received', {
        endpointEnv,
        attempt,
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        lastError = `HTTP ${response.status}: ${response.statusText}${responseBody ? ` - ${responseBody}` : ''}`;
        console.error('[Notification] Send failed', {
          endpointEnv,
          attempt,
          status: response.status,
          responseBody,
          timestamp: new Date().toISOString(),
        });
        if (attempt < maxAttempts && response.status >= 500) {
          continue;
        }
        break;
      }

      return { success: true, reason: 'sent' };
    } catch (error: any) {
      lastError = error?.message || String(error);
      console.error('[Notification] Send exception', {
        endpointEnv,
        attempt,
        error: lastError,
        timestamp: new Date().toISOString(),
      });
      if (attempt < maxAttempts && /network|fetch|timeout|ECONN|ETIMEDOUT/i.test(lastError || '')) {
        continue;
      }
      break;
    }
  }

  return { success: false, reason: 'error', error: lastError || 'Notification delivery failed' };
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

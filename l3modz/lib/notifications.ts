import type { IOrder } from '@/models/Order';
import nodemailer from 'nodemailer';
import { generateInvoicePdfBuffer } from '@/lib/invoice';
import { createLogger } from '@/lib/logger';

const logger = createLogger('notifications');

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
  invoicePdfBase64?: string;
  invoiceFilename?: string;
  supportEmail?: string;
  supportPhone?: string;
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
  const supportEmail = String(payload.supportEmail || process.env.COMPANY_SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@l3modz.com');
  const supportPhone = String(payload.supportPhone || process.env.COMPANY_SUPPORT_PHONE || process.env.WHATSAPP_SUPPORT_NUMBER || '+91 98431 99393');

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
    `Support: ${supportEmail} / ${supportPhone}`,
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
      <p style="font-size:12px;color:#6b7280">Support: ${supportEmail} | ${supportPhone}</p>
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
  let attachments: nodemailer.SendMailOptions['attachments'];
  if (payload.invoicePdfBase64 && payload.invoiceFilename) {
    try {
      attachments = [
        {
          filename: payload.invoiceFilename,
          content: Buffer.from(String(payload.invoicePdfBase64), 'base64'),
          contentType: 'application/pdf',
        },
      ];
    } catch (error: any) {
      logger.warn('invoice_attachment_skipped', {
        recipient,
        subject,
        error: error?.message || String(error),
      });
    }
  }
  const maxAttempts = 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logger.info('smtp_send_start', {
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
        attachments,
      });

      logger.info('smtp_send_success', {
        attempt,
        messageId: result.messageId,
        recipient,
        timestamp: new Date().toISOString(),
      });

      return { success: true, reason: 'sent' as const };
    } catch (error: any) {
      lastError = error?.message || String(error);
      logger.error('smtp_send_failed', {
        attempt,
        recipient,
        subject,
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
      logger.info('notification_send_attempt', {
        endpointEnv,
        attempt,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      logger.info('notification_response_received', {
        endpointEnv,
        attempt,
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        lastError = `HTTP ${response.status}: ${response.statusText}${responseBody ? ` - ${responseBody}` : ''}`;
        logger.error('notification_send_failed', {
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
      logger.error('notification_send_exception', {
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

async function buildInvoiceAttachment(order: IOrder) {
  try {
    const invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`;
    const pdf = await generateInvoicePdfBuffer(order, { invoiceNumber });
    return {
      invoiceNumber,
      invoicePdfBase64: pdf.toString('base64'),
      invoiceFilename: `${invoiceNumber}.pdf`,
    };
  } catch (error: any) {
    logger.warn('invoice_pdf_generation_failed', {
      orderId: String(order._id),
      error: error?.message || String(error),
    });
    return {
      invoiceNumber: order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`,
    };
  }
}

async function persistNotificationRetry(order: IOrder, reason: string) {
  const nextAttempt = Number(order.notificationRetryAttempts || 0) + 1;
  order.notificationRetryAttempts = nextAttempt;
  order.retryCount = Number(order.retryCount || 0) + 1;
  order.lastRetryAt = new Date();
  order.retryStatus = nextAttempt >= 5 ? 'permanently_failed' : 'scheduled';
  const delayMinutes = Math.min(180, Math.max(15, 15 * Math.pow(2, Math.min(nextAttempt - 1, 4))));
  order.notificationRetryError = reason;
  order.notificationRetryNextAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  logger.warn('notification_retry_scheduled', {
    orderId: String(order._id),
    reason,
    attempts: nextAttempt,
    nextAt: order.notificationRetryNextAt?.toISOString() || null,
  });
  if (typeof (order as any).save === 'function') {
    await (order as any).save();
  }
}

export async function sendOrderPaidNotifications(order: IOrder) {
  const customerName = order.guestInfo?.name || 'Customer';
  const customerEmail = order.guestInfo?.email || '';
  const customerPhone = order.guestInfo?.phone || '';

  const payload: NotificationPayload = {
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
    supportEmail: process.env.COMPANY_SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@l3modz.com',
    supportPhone: process.env.COMPANY_SUPPORT_PHONE || process.env.WHATSAPP_SUPPORT_NUMBER || '+91 98431 99393',
  };

  const invoiceAttachment = await buildInvoiceAttachment(order);
  if (invoiceAttachment.invoicePdfBase64) {
    payload.invoicePdfBase64 = invoiceAttachment.invoicePdfBase64;
    payload.invoiceFilename = invoiceAttachment.invoiceFilename;
  }

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
    logger.error('payment_notifications_failed', {
      orderId: String(order._id),
      failedServices,
      emailResult,
      smsResult,
      whatsappResult,
    });
    await persistNotificationRetry(order, `payment_notifications_failed:${failedServices.join(',')}`);
  }

  // Log successful sends for monitoring
  const sentServices = [];
  if (emailResult.success) sentServices.push('email');
  if (smsResult.success) sentServices.push('sms');
  if (whatsappResult.success) sentServices.push('whatsapp');

  if (sentServices.length > 0) {
    logger.info('order_paid_notifications_sent', {
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

  const payload: NotificationPayload = {
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
    supportEmail: process.env.COMPANY_SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@l3modz.com',
    supportPhone: process.env.COMPANY_SUPPORT_PHONE || process.env.WHATSAPP_SUPPORT_NUMBER || '+91 98431 99393',
  };

  const invoiceAttachment = await buildInvoiceAttachment(order);
  if (invoiceAttachment.invoicePdfBase64) {
    payload.invoicePdfBase64 = invoiceAttachment.invoicePdfBase64;
    payload.invoiceFilename = invoiceAttachment.invoiceFilename;
  }

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
    logger.error('bill_notifications_failed', {
      orderId: String(order._id),
      failedServices,
      emailResult,
      smsResult,
      whatsappResult,
    });
    await persistNotificationRetry(order, `bill_notifications_failed:${failedServices.join(',')}`);
  }

  // Log successful sends for monitoring
  const sentServices = [];
  if (emailResult.success) sentServices.push('email');
  if (smsResult.success) sentServices.push('sms');
  if (whatsappResult.success) sentServices.push('whatsapp');

  if (sentServices.length > 0) {
    logger.info('order_bill_notifications_sent', {
      orderId: String(order._id),
      sentServices,
    });
  }
}

export async function sendOrderShipmentNotifications(order: IOrder) {
  const customerName = order.guestInfo?.name || 'Customer';
  const customerEmail = order.guestInfo?.email || '';
  const customerPhone = order.guestInfo?.phone || '';

  const payload: NotificationPayload = {
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
    supportEmail: process.env.COMPANY_SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@l3modz.com',
    supportPhone: process.env.COMPANY_SUPPORT_PHONE || process.env.WHATSAPP_SUPPORT_NUMBER || '+91 98431 99393',
  };

  const invoiceAttachment = await buildInvoiceAttachment(order);
  if (invoiceAttachment.invoicePdfBase64) {
    payload.invoicePdfBase64 = invoiceAttachment.invoicePdfBase64;
    payload.invoiceFilename = invoiceAttachment.invoiceFilename;
  }

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
    logger.error('shipment_notifications_failed', {
      orderId: String(order._id),
      failedServices,
      emailResult,
      smsResult,
      whatsappResult,
    });
    await persistNotificationRetry(order, `shipment_notifications_failed:${failedServices.join(',')}`);
  }

  const sentServices = [];
  if (emailResult.success) sentServices.push('email');
  if (smsResult.success) sentServices.push('sms');
  if (whatsappResult.success) sentServices.push('whatsapp');

  if (sentServices.length > 0) {
    logger.info('order_shipment_notifications_sent', {
      orderId: String(order._id),
      sentServices,
    });
  }
}

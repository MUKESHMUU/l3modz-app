import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { createLogger } from '@/lib/logger';
import { validateProductionEnv } from '@/lib/env';

const logger = createLogger('shiprocket-webhook');

function getStringValue(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function getNestedValue(source: any, path: string) {
  return path.split('.').reduce<any>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key];
    }
    return undefined;
  }, source);
}

function pickStringValue(source: any, paths: string[]) {
  for (const path of paths) {
    const value = getStringValue(getNestedValue(source, path));
    if (value) return value;
  }
  return '';
}

function mapDeliveryStatus(rawStatus: string) {
  const normalized = String(rawStatus || '').toLowerCase();
  if (normalized.includes('delivered')) return { delivery_status: 'delivered', status: 'Delivered' };
  if (normalized.includes('out for delivery')) return { delivery_status: 'out_for_delivery', status: 'Shipped' };
  if (normalized.includes('shipped') || normalized.includes('in transit')) return { delivery_status: 'shipped', status: 'Shipped' };
  if (normalized.includes('rto') || normalized.includes('returned')) return { delivery_status: 'returned', status: 'Cancelled' };
  if (normalized.includes('cancel')) return { delivery_status: 'cancelled', status: 'Cancelled' };
  return { delivery_status: normalized || 'updated', status: undefined };
}

function normalizeEventFingerprint(value: string) {
  return String(value || '').trim().toLowerCase();
}

function isDuplicateShipmentHistory(order: any, fingerprint: string) {
  const history = Array.isArray(order.shiprocketTrackingHistory) ? order.shiprocketTrackingHistory : [];
  const latest = history[history.length - 1];
  if (!latest) return false;
  const latestFingerprint = normalizeEventFingerprint([
    latest.status,
    latest.message,
    latest.trackingUrl,
    latest.awb,
    latest.shipmentId,
    latest.source,
  ].filter(Boolean).join('|'));
  return latestFingerprint === fingerprint;
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      validateProductionEnv();
    }

    const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    const signatureHeader = req.headers.get('x-shiprocket-signature') || req.headers.get('x-webhook-signature') || req.headers.get('x-signature') || '';
    const incomingSecret = req.headers.get('x-shiprocket-secret') || req.headers.get('x-webhook-secret') || '';
    const rawBody = await req.text();

    // Prefer an HMAC signature check; keep the old shared-secret header as a compatibility fallback.
    if (process.env.NODE_ENV === 'production' && !secret) {
      return NextResponse.json({ message: 'Webhook is not configured' }, { status: 503 });
    }

    if (secret) {
      const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const expectedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      const matchesHmac = Boolean(signatureHeader) && [expectedHex, expectedBase64].includes(signatureHeader.trim());
      const matchesLegacySecret = Boolean(incomingSecret) && incomingSecret === secret;

      if (!matchesHmac && !matchesLegacySecret) {
          logger.warn('signature_validation_failed', {
            hasSignatureHeader: Boolean(signatureHeader),
            hasLegacySecretHeader: Boolean(incomingSecret),
          });
        return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    logger.info('incoming_event', {
      hasAwb: Boolean(body?.awb || body?.awb_code || body?.data?.awb || body?.data?.awb_code),
      hasShipmentId: Boolean(body?.shipment_id || body?.data?.shipment_id),
      status: body?.current_status || body?.status || body?.shipment_status || body?.data?.current_status || body?.data?.status || null,
    });

    const awb = pickStringValue(body, ['awb', 'awb_code', 'data.awb', 'data.awb_code', 'response.awb', 'response.awb_code']);
    const shipmentId = pickStringValue(body, ['shipment_id', 'data.shipment_id', 'response.shipment_id']);
    const statusRaw = pickStringValue(body, [
      'current_status',
      'status',
      'shipment_status',
      'data.current_status',
      'data.status',
      'data.shipment_status',
    ]);
    const trackingUrl = pickStringValue(body, ['tracking_url', 'track_url', 'data.tracking_url', 'data.track_url', 'response.tracking_url']);
    const eventId = pickStringValue(body, ['event_id', 'webhook_id', 'id', 'data.event_id', 'data.webhook_id']) || `${awb || shipmentId || 'shiprocket'}:${statusRaw || 'update'}:${trackingUrl || 'no-url'}`;
    const eventFingerprint = normalizeEventFingerprint([eventId, awb, shipmentId, statusRaw, trackingUrl].filter(Boolean).join('|'));

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

    const processedEvents = Array.isArray(order.shiprocketWebhookEventIds) ? order.shiprocketWebhookEventIds : [];
    if (processedEvents.includes(eventId)) {
      logger.info('webhook_duplicate_ignored', { orderId: String(order._id), eventId });
      return NextResponse.json({ message: 'Webhook already processed', orderId: String(order._id) });
    }

    if (isDuplicateShipmentHistory(order, eventFingerprint)) {
      order.shiprocketWebhookEventIds = [...processedEvents, eventId].slice(-50);
      await order.save();
      logger.info('webhook_duplicate_history_ignored', { orderId: String(order._id), eventId });
      return NextResponse.json({ message: 'Webhook already applied', orderId: String(order._id) });
    }

    const mapped = mapDeliveryStatus(String(statusRaw || ''));
    order.deliveryPartner = 'Shiprocket';
    if (awb) {
      order.AWB_number = String(awb);
    }
    if (shipmentId) {
      order.shipment_id = String(shipmentId);
    }
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

    const trackingHistory = Array.isArray(order.shiprocketTrackingHistory) ? [...order.shiprocketTrackingHistory] : [];
    trackingHistory.push({
      at: new Date(),
      status: mapped.status || mapped.delivery_status || statusRaw || 'updated',
      message: statusRaw || 'Webhook update received',
      trackingUrl: trackingUrl || undefined,
      awb: awb || undefined,
      shipmentId: shipmentId || undefined,
      source: 'webhook',
    });
    order.shiprocketTrackingHistory = trackingHistory.slice(-25);
    order.shiprocketWebhookEventIds = [...processedEvents, eventId].slice(-50);

    order.shiprocketLastSyncAt = new Date();
    order.shiprocketShipmentUpdatedAt = new Date();
    await order.save();

    logger.info('webhook_processed', {
      orderId: String(order._id),
      eventId,
      shipmentId: shipmentId || null,
      awb: awb || null,
      status: mapped.status || mapped.delivery_status || statusRaw || null,
    });

    return NextResponse.json({ message: 'Webhook processed', orderId: String(order._id) });
  } catch (error: any) {
    logger.error('webhook_failed', {
      error: error?.message || String(error),
    });
    return NextResponse.json({ message: 'Failed to process webhook' }, { status: 500 });
  }
}

import type { IOrder } from '@/models/Order';
import {
  assignBestCourier,
  createShiprocketOrder,
  checkPincodeServiceability,
  generatePickup,
  generateShippingLabel,
  trackShipmentByAwb,
} from '@/lib/shiprocket';
import { createLogger } from '@/lib/logger';

const logger = createLogger('orderFulfillment');

type ShipmentHistorySource = 'sync' | 'refresh' | 'webhook' | 'retry';
const MAX_RETRIES = 5;

function appendShipmentHistory(
  order: IOrder,
  entry: {
    status: string;
    message?: string;
    trackingUrl?: string;
    awb?: string;
    shipmentId?: string;
    source?: ShipmentHistorySource;
  }
) {
  const history = Array.isArray(order.shiprocketTrackingHistory) ? [...order.shiprocketTrackingHistory] : [];
  const latest = history[history.length - 1];
  if (
    latest &&
    latest.status === entry.status &&
    latest.message === entry.message &&
    latest.trackingUrl === entry.trackingUrl &&
    latest.awb === entry.awb &&
    latest.shipmentId === entry.shipmentId &&
    latest.source === entry.source
  ) {
    return;
  }
  history.push({
    at: new Date(),
    status: entry.status,
    message: entry.message,
    trackingUrl: entry.trackingUrl,
    awb: entry.awb,
    shipmentId: entry.shipmentId,
    source: entry.source,
  });
  order.shiprocketTrackingHistory = history.slice(-25);
}

function scheduleRetry(order: IOrder, kind: 'shipment' | 'tracking', message: string, attempt: number) {
  const nextAttempt = attempt + 1;
  const cappedAttempt = Math.min(nextAttempt, MAX_RETRIES);
  order.retryCount = Number(order.retryCount || 0) + 1;
  order.lastRetryAt = new Date();

  if (nextAttempt >= MAX_RETRIES) {
    order.retryStatus = 'permanently_failed';
  } else {
    order.retryStatus = 'scheduled';
  }

  const delayMinutes = Math.min(180, Math.max(10, 10 * Math.pow(2, Math.min(attempt, 4))));
  const nextAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  if (kind === 'shipment') {
    order.shipmentCreationRetryAttempts = cappedAttempt;
    order.shipmentCreationRetryError = message;
    order.shipmentCreationRetryNextAt = nextAt;
    return;
  }

  order.trackingSyncRetryAttempts = cappedAttempt;
  order.trackingSyncRetryError = message;
  order.trackingSyncRetryNextAt = nextAt;
}

function clearRetryState(order: IOrder, kind: 'shipment' | 'tracking') {
  if (kind === 'shipment') {
    order.shipmentCreationRetryError = '';
    order.shipmentCreationRetryNextAt = null as any;
    order.retryStatus = 'succeeded';
    return;
  }

  order.trackingSyncRetryError = '';
  order.trackingSyncRetryNextAt = null as any;
  order.retryStatus = 'succeeded';
}

function isRetryDue(value?: Date | null) {
  if (!value) return true;
  return new Date(value).getTime() <= Date.now();
}

function normalizeCourierLabel(value: string) {
  return String(value || '').trim().toLowerCase();
}

function getPreferredCourierName() {
  return String(process.env.SHIPROCKET_PREFERRED_COURIER_NAME || '').trim();
}

async function resolveCourierFallback(order: IOrder) {
  const preferredName = getPreferredCourierName();
  const pincode = String(order.shippingAddress?.pincode || '').trim();
  if (!pincode) return preferredName || '';

  const serviceability = await checkPincodeServiceability({
    deliveryPincode: pincode,
    cod: !order.isPaid,
    weightKg: Number(order.packageWeightKg || 0.5),
  });

  const availableCouriers = Array.isArray(serviceability.couriers) ? serviceability.couriers : [];
  const preferredMatch = availableCouriers.find((courier: any) => {
    const name = courier?.courier_name || courier?.courier_company_name || courier?.company_name || '';
    return preferredName && normalizeCourierLabel(name) === normalizeCourierLabel(preferredName);
  });

  if (preferredMatch) {
    return String(preferredMatch.courier_name || preferredMatch.courier_company_name || preferredMatch.company_name || preferredName).trim();
  }

  const firstAvailable = availableCouriers[0];
  return String(firstAvailable?.courier_name || firstAvailable?.courier_company_name || firstAvailable?.company_name || preferredName || '').trim();
}

function applyDeliveryStateToOrder(order: IOrder, deliveryStatusRaw: string) {
  const normalized = String(deliveryStatusRaw || '').toLowerCase();
  order.delivery_status = normalized;

  if (normalized.includes('delivered')) {
    order.status = 'Delivered';
    order.deliveredAt = order.deliveredAt || new Date();
    return;
  }

  if (normalized.includes('out for delivery') || normalized.includes('shipped') || normalized.includes('in transit')) {
    order.status = 'Shipped';
    return;
  }

  if (normalized.includes('cancel') || normalized.includes('rto') || normalized.includes('return')) {
    order.status = 'Cancelled';
    return;
  }
}

export function shouldAutoRefreshTracking(order: IOrder, minMinutes = 8) {
  const partner = String(order.deliveryPartner || '').toLowerCase();
  const isShiprocketOrder = partner === 'shiprocket' || Boolean(order.shipment_id || order.shiprocket_order_id);
  if (!isShiprocketOrder) return false;
  if (!order.AWB_number) return false;
  const currentStatus = String(order.status || '').toLowerCase();
  if (currentStatus === 'delivered' || currentStatus === 'cancelled') return false;

  const lastSync = order.shiprocketLastSyncAt ? new Date(order.shiprocketLastSyncAt).getTime() : 0;
  const staleMs = minMinutes * 60 * 1000;
  return !lastSync || Date.now() - lastSync >= staleMs;
}

export function shouldRetryShipment(order: IOrder) {
  return !order.shipment_id && isRetryDue(order.shipmentCreationRetryNextAt) && Number(order.shipmentCreationRetryAttempts || 0) < MAX_RETRIES;
}

export function shouldRetryTracking(order: IOrder) {
  return Boolean(order.AWB_number) && isRetryDue(order.trackingSyncRetryNextAt) && Number(order.trackingSyncRetryAttempts || 0) < MAX_RETRIES;
}

export async function syncOrderToShiprocket(order: IOrder) {
  order.deliveryPartner = 'Shiprocket';
  const now = new Date();
  order.shiprocketSyncAttempts = Number(order.shiprocketSyncAttempts || 0) + 1;
  order.shiprocketLastSyncAt = now;

  try {
    if (!order.shipment_id) {
      const created = await createShiprocketOrder(order);
      if (created.shiprocketOrderId) {
        order.shiprocket_order_id = created.shiprocketOrderId;
      }
      if (created.shipmentId) {
        order.shipment_id = created.shipmentId;
      }
      if (!order.shipment_id) {
        throw new Error('Shiprocket did not return shipment_id');
      }
      order.shiprocketShipmentCreatedAt = order.shiprocketShipmentCreatedAt || now;
    }

    if (!order.AWB_number) {
      const awb = await assignBestCourier(order.shipment_id);
      if (awb.awbCode) {
        order.AWB_number = String(awb.awbCode);
      }
      if (awb.courierName) {
        order.courier_name = awb.courierName;
      } else {
        const fallbackCourier = await resolveCourierFallback(order);
        if (fallbackCourier) {
          order.courier_name = fallbackCourier;
          appendShipmentHistory(order, {
            status: 'courier_fallback_selected',
            message: `Fallback courier selected: ${fallbackCourier}`,
            awb: order.AWB_number,
            shipmentId: order.shipment_id,
            source: 'retry',
          });
        }
      }
    }

    if (!order.shipping_label_url) {
      const label = await generateShippingLabel(order.shipment_id);
      if (label.labelUrl) {
        order.shipping_label_url = label.labelUrl;
      }
    }

    if (!order.shiprocketPickupRequestedAt) {
      await generatePickup(order.shipment_id);
      order.shiprocketPickupRequestedAt = now;
    }

    if (order.AWB_number) {
      const tracking = await trackShipmentByAwb(order.AWB_number);
      if (tracking.trackingUrl) {
        order.tracking_url = tracking.trackingUrl;
      }
      if (tracking.deliveryStatus) {
        applyDeliveryStateToOrder(order, tracking.deliveryStatus);
      }
      if (tracking.estimatedDelivery) {
        const date = new Date(tracking.estimatedDelivery);
        if (!Number.isNaN(date.getTime())) {
          order.estimated_delivery = date;
        }
      }
      appendShipmentHistory(order, {
        status: order.delivery_status || order.status || 'shipment_created',
        trackingUrl: order.tracking_url,
        awb: order.AWB_number,
        shipmentId: order.shipment_id,
        source: 'sync',
      });
      order.shiprocketShipmentUpdatedAt = new Date();
    }

    order.delivery_status = order.delivery_status || 'shipment_created';
    order.shiprocketSyncError = '';
    order.shipmentCreationRetryAttempts = 0;
    clearRetryState(order, 'shipment');

    return {
      ok: true,
      shipmentId: order.shipment_id,
      awb: order.AWB_number,
    };
  } catch (error: any) {
    order.delivery_status = order.delivery_status || 'sync_failed';
    order.shiprocketSyncError = error?.message || 'Unknown Shiprocket sync error';
    scheduleRetry(order, 'shipment', order.shiprocketSyncError || 'Unknown Shiprocket sync error', Number(order.shipmentCreationRetryAttempts || 0));
    appendShipmentHistory(order, {
      status: 'sync_failed',
      message: order.shiprocketSyncError,
      awb: order.AWB_number,
      shipmentId: order.shipment_id,
      source: 'sync',
    });
    logger.error('shipment_sync_failed', {
      orderId: String(order._id),
      shipmentId: order.shipment_id || null,
      awb: order.AWB_number || null,
      error: order.shiprocketSyncError,
    });
    return {
      ok: false,
      error: order.shiprocketSyncError,
    };
  }
}

export async function refreshTracking(order: IOrder) {
  const partner = String(order.deliveryPartner || '').toLowerCase();
  const isShiprocketOrder = partner === 'shiprocket' || Boolean(order.shipment_id || order.shiprocket_order_id);
  if (!isShiprocketOrder) {
    return { ok: false, error: 'Tracking auto-refresh is available only for Shiprocket shipments' };
  }

  if (!order.AWB_number) {
    return { ok: false, error: 'AWB not available' };
  }

  try {
    const tracking = await trackShipmentByAwb(order.AWB_number);
    if (tracking.trackingUrl) {
      order.tracking_url = tracking.trackingUrl;
    }
    if (tracking.deliveryStatus) {
      applyDeliveryStateToOrder(order, tracking.deliveryStatus);
    }
    if (tracking.estimatedDelivery) {
      const date = new Date(tracking.estimatedDelivery);
      if (!Number.isNaN(date.getTime())) {
        order.estimated_delivery = date;
      }
    }
    order.shiprocketLastSyncAt = new Date();
    order.shiprocketSyncError = '';
    order.trackingSyncRetryAttempts = 0;
    clearRetryState(order, 'tracking');
    appendShipmentHistory(order, {
      status: order.delivery_status || order.status || 'tracking_refreshed',
      trackingUrl: order.tracking_url,
      awb: order.AWB_number,
      shipmentId: order.shipment_id,
      source: 'refresh',
    });
    order.shiprocketShipmentUpdatedAt = new Date();
    return { ok: true };
  } catch (error: any) {
    order.shiprocketSyncError = error?.message || 'Failed to refresh tracking';
    scheduleRetry(order, 'tracking', order.shiprocketSyncError || 'Failed to refresh tracking', Number(order.trackingSyncRetryAttempts || 0));
    appendShipmentHistory(order, {
      status: 'tracking_refresh_failed',
      message: order.shiprocketSyncError,
      awb: order.AWB_number,
      shipmentId: order.shipment_id,
      source: 'refresh',
    });
    logger.warn('tracking_refresh_failed', {
      orderId: String(order._id),
      shipmentId: order.shipment_id || null,
      awb: order.AWB_number || null,
      error: order.shiprocketSyncError,
    });
    return { ok: false, error: order.shiprocketSyncError };
  }
}

export function markBillSent(order: IOrder) {
  order.invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`;
  order.billSentAt = new Date();
}

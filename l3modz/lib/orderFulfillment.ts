import type { IOrder } from '@/models/Order';
import {
  assignBestCourier,
  createShiprocketOrder,
  generatePickup,
  generateShippingLabel,
  trackShipmentByAwb,
} from '@/lib/shiprocket';

type ShipmentHistorySource = 'sync' | 'refresh' | 'webhook' | 'retry';

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

    return {
      ok: true,
      shipmentId: order.shipment_id,
      awb: order.AWB_number,
    };
  } catch (error: any) {
    order.delivery_status = order.delivery_status || 'sync_failed';
    order.shiprocketSyncError = error?.message || 'Unknown Shiprocket sync error';
    appendShipmentHistory(order, {
      status: 'sync_failed',
      message: order.shiprocketSyncError,
      awb: order.AWB_number,
      shipmentId: order.shipment_id,
      source: 'sync',
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
    appendShipmentHistory(order, {
      status: 'tracking_refresh_failed',
      message: order.shiprocketSyncError,
      awb: order.AWB_number,
      shipmentId: order.shipment_id,
      source: 'refresh',
    });
    return { ok: false, error: order.shiprocketSyncError };
  }
}

export function markBillSent(order: IOrder) {
  order.invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`;
  order.billSentAt = new Date();
}

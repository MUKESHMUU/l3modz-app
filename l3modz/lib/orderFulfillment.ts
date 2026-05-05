import type { IOrder } from '@/models/Order';
import {
  assignBestCourier,
  createShiprocketOrder,
  generatePickup,
  generateShippingLabel,
  trackShipmentByAwb,
} from '@/lib/shiprocket';

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

    const awb = await assignBestCourier(order.shipment_id);
    if (awb.awbCode) {
      order.AWB_number = String(awb.awbCode);
    }
    if (awb.courierName) {
      order.courier_name = awb.courierName;
    }

    const label = await generateShippingLabel(order.shipment_id);
    if (label.labelUrl) {
      order.shipping_label_url = label.labelUrl;
    }

    await generatePickup(order.shipment_id);

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
    return { ok: true };
  } catch (error: any) {
    order.shiprocketSyncError = error?.message || 'Failed to refresh tracking';
    return { ok: false, error: order.shiprocketSyncError };
  }
}

export function markBillSent(order: IOrder) {
  order.invoiceNumber = order.invoiceNumber || `INV-${String(order._id).slice(-8).toUpperCase()}`;
  order.billSentAt = new Date();
}

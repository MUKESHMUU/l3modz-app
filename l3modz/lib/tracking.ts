import type { IOrder } from '@/models/Order';

export type ShipmentStepKey = 'ordered' | 'paid' | 'confirmed' | 'packed' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';

export type ShipmentStep = {
  key: ShipmentStepKey;
  label: string;
  timestamp?: Date | string | null;
  active: boolean;
  completed: boolean;
};

function normalizeStatus(value?: string) {
  return String(value || '').toLowerCase();
}

function findHistoryTimestamp(order: IOrder, matcher: RegExp) {
  const history = Array.isArray(order.shiprocketTrackingHistory) ? order.shiprocketTrackingHistory : [];
  const match = history.slice().reverse().find((entry) => matcher.test(normalizeStatus(entry.status)) || matcher.test(normalizeStatus(entry.message)));
  return match?.at || null;
}

function getActiveStepKey(order: IOrder): ShipmentStepKey {
  const deliveryStatus = normalizeStatus(order.delivery_status);
  const orderStatus = normalizeStatus(order.status);

  if (deliveryStatus.includes('delivered') || orderStatus === 'delivered') return 'delivered';
  if (deliveryStatus.includes('out for delivery')) return 'out_for_delivery';
  if (deliveryStatus.includes('in transit') || deliveryStatus.includes('shipped')) return 'in_transit';
  if (deliveryStatus.includes('picked')) return 'picked_up';
  if (deliveryStatus.includes('packed')) return 'packed';
  if (deliveryStatus.includes('confirmed') || orderStatus === 'confirmed') return 'confirmed';
  if (order.isPaid) return 'paid';
  return 'ordered';
}

export function buildShipmentTimeline(order: IOrder): ShipmentStep[] {
  const activeKey = getActiveStepKey(order);
  return [
    { key: 'ordered', label: 'Ordered', timestamp: order.createdAt || null, active: activeKey === 'ordered', completed: true },
    { key: 'paid', label: 'Paid', timestamp: order.paidAt || null, active: activeKey === 'paid', completed: ['paid', 'confirmed', 'packed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'confirmed', label: 'Confirmed', timestamp: order.status ? order.createdAt || null : null, active: activeKey === 'confirmed', completed: ['confirmed', 'packed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'packed', label: 'Packed', timestamp: order.shiprocketShipmentCreatedAt || findHistoryTimestamp(order, /packed|shipment created|courier assigned/), active: activeKey === 'packed', completed: ['packed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'picked_up', label: 'Picked Up', timestamp: order.shiprocketPickupRequestedAt || findHistoryTimestamp(order, /picked up|pickup/), active: activeKey === 'picked_up', completed: ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'in_transit', label: 'In Transit', timestamp: findHistoryTimestamp(order, /in transit|shipped/), active: activeKey === 'in_transit', completed: ['in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'out_for_delivery', label: 'Out For Delivery', timestamp: findHistoryTimestamp(order, /out for delivery/), active: activeKey === 'out_for_delivery', completed: ['out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'delivered', label: 'Delivered', timestamp: order.deliveredAt || findHistoryTimestamp(order, /delivered/), active: activeKey === 'delivered', completed: activeKey === 'delivered' },
  ];
}

export function buildPublicTrackingSnapshot(order: IOrder) {
  return {
    orderId: String(order._id),
    orderStatus: order.status,
    paymentStatus: order.isPaid ? 'Paid' : 'Pending',
    isPaid: order.isPaid,
    deliveryStatus: order.delivery_status || '',
    deliveryPartner: order.deliveryPartner || '',
    courierName: order.courier_name || '',
    awbNumber: order.AWB_number || '',
    trackingUrl: order.tracking_url || '',
    estimatedDelivery: order.estimated_delivery || null,
    createdAt: order.createdAt || null,
    paidAt: order.paidAt || null,
    deliveredAt: order.deliveredAt || null,
    shiprocketShipmentCreatedAt: order.shiprocketShipmentCreatedAt || null,
    shiprocketPickupRequestedAt: order.shiprocketPickupRequestedAt || null,
    status: order.status,
    shipmentTimeline: buildShipmentTimeline(order),
    shiprocketTrackingHistory: Array.isArray(order.shiprocketTrackingHistory) ? order.shiprocketTrackingHistory : [],
  };
}

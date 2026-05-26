import { CheckCircle2, Circle, Clock3 } from 'lucide-react';

type TimelineStep = {
  key: string;
  label: string;
  timestamp?: string | Date | null;
  active?: boolean;
  completed?: boolean;
};

type TimelineOrder = {
  status?: string;
  isPaid?: boolean;
  paidAt?: string | Date | null;
  createdAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  shiprocketShipmentCreatedAt?: string | Date | null;
  shiprocketPickupRequestedAt?: string | Date | null;
  shiprocketTrackingHistory?: Array<{ at: string | Date; status: string; message?: string }>;
  delivery_status?: string;
};

function normalize(value?: string) {
  return String(value || '').toLowerCase();
}

function findHistoryTimestamp(order: TimelineOrder, matcher: RegExp) {
  const history = Array.isArray(order.shiprocketTrackingHistory) ? order.shiprocketTrackingHistory : [];
  const match = history.slice().reverse().find((entry) => matcher.test(normalize(entry.status)) || matcher.test(normalize(entry.message)));
  return match?.at || null;
}

function getActiveStepKey(order: TimelineOrder) {
  const deliveryStatus = normalize(order.delivery_status);
  const status = normalize(order.status);

  if (deliveryStatus.includes('delivered') || status === 'delivered') return 'delivered';
  if (deliveryStatus.includes('out for delivery')) return 'out_for_delivery';
  if (deliveryStatus.includes('in transit') || deliveryStatus.includes('shipped')) return 'in_transit';
  if (deliveryStatus.includes('picked')) return 'picked_up';
  if (deliveryStatus.includes('packed')) return 'packed';
  if (deliveryStatus.includes('confirmed') || status === 'confirmed') return 'confirmed';
  if (order.isPaid) return 'paid';
  return 'ordered';
}

function formatTimestamp(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildTimeline(order: TimelineOrder): TimelineStep[] {
  const activeKey = getActiveStepKey(order);
  return [
    { key: 'ordered', label: 'Ordered', timestamp: order.createdAt || null, active: activeKey === 'ordered', completed: true },
    { key: 'paid', label: 'Paid', timestamp: order.paidAt || null, active: activeKey === 'paid', completed: ['paid', 'confirmed', 'packed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'confirmed', label: 'Confirmed', timestamp: order.createdAt || null, active: activeKey === 'confirmed', completed: ['confirmed', 'packed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'packed', label: 'Packed', timestamp: order.shiprocketShipmentCreatedAt || findHistoryTimestamp(order, /packed|shipment created|courier assigned/), active: activeKey === 'packed', completed: ['packed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'picked_up', label: 'Picked Up', timestamp: order.shiprocketPickupRequestedAt || findHistoryTimestamp(order, /picked up|pickup/), active: activeKey === 'picked_up', completed: ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'in_transit', label: 'In Transit', timestamp: findHistoryTimestamp(order, /in transit|shipped/), active: activeKey === 'in_transit', completed: ['in_transit', 'out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'out_for_delivery', label: 'Out For Delivery', timestamp: findHistoryTimestamp(order, /out for delivery/), active: activeKey === 'out_for_delivery', completed: ['out_for_delivery', 'delivered'].includes(activeKey) },
    { key: 'delivered', label: 'Delivered', timestamp: order.deliveredAt || findHistoryTimestamp(order, /delivered/), active: activeKey === 'delivered', completed: activeKey === 'delivered' },
  ];
}

export default function ShipmentTimeline({ order }: { order: TimelineOrder }) {
  const steps = buildTimeline(order);

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
        <h3 className="text-base font-bold text-brand-text">Shipment Timeline</h3>
        <p className="mt-1 text-sm text-gray-500">Track the latest visible movement of this order.</p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.completed ? CheckCircle2 : step.active ? Clock3 : Circle;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${step.active ? 'border-brand-primary bg-brand-primary text-white' : step.completed ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                    <Icon size={16} />
                  </span>
                  {index < steps.length - 1 ? <span className="mt-1 h-full min-h-6 w-px bg-gray-200" /> : null}
                </div>

                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className={`text-sm font-semibold ${step.active || step.completed ? 'text-brand-text' : 'text-gray-500'}`}>{step.label}</p>
                    {step.timestamp ? <p className="text-xs text-gray-500">{formatTimestamp(step.timestamp)}</p> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

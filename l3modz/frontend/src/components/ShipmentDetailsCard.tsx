import { Link } from 'react-router-dom';
import { Package, Truck, Hash, CalendarDays, CircleCheckBig, ArrowUpRight } from 'lucide-react';

type ShipmentHistoryEntry = {
  at: string | Date;
  status: string;
  message?: string;
  trackingUrl?: string;
  awb?: string;
  shipmentId?: string;
  source?: string;
};

export type ShipmentOrder = {
  _id?: string;
  status?: string;
  orderStatus?: string;
  isPaid?: boolean;
  paymentStatus?: string;
  paymentResult?: { status?: string };
  deliveryPartner?: string;
  courier_name?: string;
  courierName?: string;
  AWB_number?: string;
  awbNumber?: string;
  tracking_url?: string;
  trackingUrl?: string;
  delivery_status?: string;
  deliveryStatus?: string;
  estimated_delivery?: string | Date | null;
  estimatedDelivery?: string | Date | null;
  shiprocketTrackingHistory?: ShipmentHistoryEntry[];
};

type ShipmentDetailsCardProps = {
  order: ShipmentOrder;
  title?: string;
  compact?: boolean;
  showHistory?: boolean;
  className?: string;
  detailsHref?: string;
};

function formatDate(value?: string | Date | null) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStatusLabel(value?: string) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getToneClass(value?: string, kind: 'status' | 'delivery' | 'payment' = 'status') {
  const normalized = String(value || '').toLowerCase();

  if (kind === 'payment') {
    if (normalized.includes('paid')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (normalized.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }

  if (normalized.includes('delivered')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized.includes('in transit') || normalized.includes('shipped') || normalized.includes('out for delivery')) {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (normalized.includes('failed') || normalized.includes('rto') || normalized.includes('returned')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (kind === 'delivery' && normalized.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function Field({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-bg/60 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
        <Icon size={14} className="text-brand-primary" />
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-brand-text">{value}</div>
    </div>
  );
}

export default function ShipmentDetailsCard({ order, title = 'Shipment Details', compact = false, showHistory = true, className = '', detailsHref }: ShipmentDetailsCardProps) {
  const paymentStatus = String(order.paymentStatus || '').trim() || (order.isPaid || String(order.paymentResult?.status || '').toLowerCase() === 'paid' ? 'Paid' : 'Pending');
  const estimatedDelivery = formatDate(order.estimated_delivery || order.estimatedDelivery);
  const history = Array.isArray(order.shiprocketTrackingHistory) ? order.shiprocketTrackingHistory.slice().reverse() : [];
  const courierName = order.courier_name || order.courierName || '';
  const awbNumber = order.AWB_number || order.awbNumber || '';
  const trackingUrl = order.tracking_url || order.trackingUrl || '';
  const deliveryStatus = order.delivery_status || order.deliveryStatus || '';
  const deliveryPartner = order.deliveryPartner || '';
  const orderStatus = order.status || order.orderStatus || '';
  const fields = [
    { icon: CircleCheckBig, label: 'Order Status', value: orderStatus ? formatStatusLabel(orderStatus) : '' },
    { icon: CircleCheckBig, label: 'Payment Status', value: paymentStatus },
    { icon: Truck, label: 'Delivery Status', value: deliveryStatus ? formatStatusLabel(deliveryStatus) : '' },
    { icon: Package, label: 'Delivery Partner', value: deliveryPartner || '' },
    { icon: Truck, label: 'Courier Name', value: courierName || '' },
    { icon: Hash, label: 'AWB / Tracking Number', value: awbNumber || '' },
    { icon: CalendarDays, label: 'Estimated Delivery', value: estimatedDelivery },
  ].filter((field) => field.value);

  return (
    <section className={`overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-4 border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Order Tracking</p>
          <h3 className="mt-1 text-base font-bold text-brand-text sm:text-lg">{title}</h3>
        </div>
        {deliveryStatus ? (
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getToneClass(deliveryStatus, 'delivery')}`}>
            {formatStatusLabel(deliveryStatus)}
          </span>
        ) : null}
      </div>

      <div className={`grid gap-3 p-4 sm:p-5 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {fields.map((field) => (
          <Field key={field.label} icon={field.icon} label={field.label} value={field.value} />
        ))}
      </div>

      <div className="border-t border-brand-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getToneClass(paymentStatus, 'payment')}`}>
              {paymentStatus}
            </span>
            {deliveryPartner ? <span className="font-medium text-brand-text">{deliveryPartner}</span> : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {detailsHref ? (
              <Link
                to={detailsHref}
                className="inline-flex items-center justify-center rounded-full border-2 border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
              >
                View details
              </Link>
            ) : null}
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
              >
                Track Shipment <ArrowUpRight size={16} className="ml-2" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {showHistory && history.length > 0 ? (
        <div className="border-t border-brand-border bg-brand-bg/40 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-brand-text">Tracking Updates</h4>
            <span className="text-xs text-gray-500">Latest {Math.min(history.length, compact ? 2 : 4)} update{history.length > 1 ? 's' : ''}</span>
          </div>

          <div className="mt-3 space-y-3">
            {history.slice(0, compact ? 2 : 4).map((entry, index) => (
              <div key={`${String(entry.at)}-${index}`} className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-brand-text">{formatStatusLabel(entry.status)}</p>
                  <p className="text-xs text-gray-500">{formatDate(entry.at) || new Date(entry.at).toLocaleString()}</p>
                </div>
                {entry.message ? <p className="mt-1 text-sm text-gray-600">{entry.message}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showHistory && history.length === 0 && !compact ? (
        <div className="border-t border-brand-border px-4 py-4 sm:px-5">
          <p className="text-sm text-gray-500">Tracking updates will appear here once the courier status changes.</p>
        </div>
      ) : null}
    </section>
  );
}
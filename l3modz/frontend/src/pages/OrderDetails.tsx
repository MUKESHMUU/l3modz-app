import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import ShipmentDetailsCard from '@/components/ShipmentDetailsCard';
import ShipmentTimeline from '@/components/ShipmentTimeline';
import { apiFetch } from '@/lib/api';

function formatDateTime(value?: string | Date) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoadedOrderRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrder() {
      if (!id) return;

      if (!hasLoadedOrderRef.current) {
        setLoading(true);
      }
      try {
        const res = await apiFetch(`/api/orders/${id}`, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) {
            setOrder(null);
            setError('Unable to load this order. It may not exist or you may not have access.');
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setOrder(data);
          setError('');
        }
        hasLoadedOrderRef.current = true;
      } catch (fetchError) {
        console.error(fetchError);
        if (!cancelled) {
          setError('Unable to load this order right now. Please try again.');
        }
      } finally {
        if (!cancelled && !hasLoadedOrderRef.current) setLoading(false);
      }
    }

    fetchOrder();

    const intervalId = window.setInterval(fetchOrder, 30000);
    const handleRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      fetchOrder();
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [id]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Loading order details...</div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-brand-text">Order unavailable</h1>
        <p className="mt-2 text-gray-600">{error || 'This order could not be found.'}</p>
        <button
          onClick={() => navigate('/profile')}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-800"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to My Orders
        </button>
      </div>
    );
  }

  const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Customer Order Details</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-text sm:text-3xl">Order #{String(order._id).slice(-8)}</h1>
          <p className="mt-1 text-sm text-gray-500">Placed on {formatDateTime(order.createdAt)}</p>
        </div>

        <Link to="/profile" className="inline-flex items-center justify-center rounded-full border-2 border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white">
          <ArrowLeft size={16} className="mr-2" /> Back to My Orders
        </Link>
        <a href={`/api/orders/${order._id}/invoice`} className="inline-flex items-center justify-center rounded-full border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary">
          Download Invoice
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <ShipmentDetailsCard order={order} title="Tracking & Delivery" />
          <ShipmentTimeline order={order} />

          <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
            <div className="border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-brand-text">
                <Package size={18} className="text-brand-primary" /> Items in this order
              </h2>
            </div>
            <div className="divide-y divide-brand-border">
              {orderItems.length > 0 ? (
                orderItems.map((item: any, index: number) => (
                  <div key={`${item.name}-${index}`} className="flex gap-4 p-4 sm:p-5">
                    {item.image ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-brand-border bg-brand-bg">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-text">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-600">Qty: {item.quantity}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-700">₹{Number(item.price || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5 text-sm text-gray-500">No item details available for this order.</div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
            <div className="border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
              <h2 className="text-base font-bold text-brand-text">Order Summary</h2>
            </div>
            <div className="space-y-3 p-4 text-sm text-gray-700 sm:p-5">
              <p><span className="font-semibold text-brand-text">Order Status:</span> {order.status || '-'}</p>
              <p><span className="font-semibold text-brand-text">Payment Status:</span> {order.isPaid ? 'Paid' : 'Pending'}</p>
              <p><span className="font-semibold text-brand-text">Payment Method:</span> {order.paymentMethod || '-'}</p>
              <p><span className="font-semibold text-brand-text">Total:</span> ₹{Number(order.totalPrice || 0).toLocaleString('en-IN')}</p>
              <p><span className="font-semibold text-brand-text">Delivered At:</span> {formatDateTime(order.deliveredAt)}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
            <div className="border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-4 py-4 sm:px-5">
              <h2 className="text-base font-bold text-brand-text">Shipping Address</h2>
            </div>
            <div className="space-y-2 p-4 text-sm text-gray-700 sm:p-5">
              <p>{order.shippingAddress?.addressLine1 || order.shippingAddress?.street || '-'}</p>
              {order.shippingAddress?.addressLine2 ? <p>{order.shippingAddress.addressLine2}</p> : null}
              <p>
                {order.shippingAddress?.locality || ''}
                {order.shippingAddress?.city ? `, ${order.shippingAddress.city}` : ''}
                {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''}
              </p>
              <p>{order.shippingAddress?.pincode || '-'}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
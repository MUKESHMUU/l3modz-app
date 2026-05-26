import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, PackageSearch } from 'lucide-react';
import Button from '@/components/Button';
import ShipmentDetailsCard from '@/components/ShipmentDetailsCard';
import ShipmentTimeline from '@/components/ShipmentTimeline';
import { apiFetch } from '@/lib/api';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await apiFetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim(), phone: phone.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Unable to find this order.');
        return;
      }

      setResult(data);
    } catch (submitError) {
      console.error(submitError);
      setError('Unable to track this order right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <section className="overflow-hidden rounded-3xl border border-brand-border bg-gradient-to-br from-brand-bg via-white to-brand-bg shadow-sm">
        <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Order Tracking</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-text sm:text-4xl">Track your order shipment</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Enter your order ID together with the email address or phone number used at checkout. You’ll see the order status, courier partner, AWB, estimated delivery, and shipment timeline.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/profile" className="inline-flex items-center justify-center rounded-full border-2 border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white">
                Go to My Orders
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-text">Order ID</label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="507f1f77bcf86cd799439011"
                  className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-text">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-text">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <Button type="submit" size="lg" fullWidth disabled={loading}>
                <Search size={16} className="mr-2" /> {loading ? 'Tracking...' : 'Track Order'}
              </Button>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            </form>
          </div>
        </div>
      </section>

      {result ? (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ShipmentDetailsCard order={result} title="Tracking Details" showHistory={true} />
          <ShipmentTimeline order={result} />
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-brand-border bg-white px-6 py-10 text-center text-gray-500 shadow-sm">
          <PackageSearch size={32} className="mx-auto text-brand-primary" />
          <p className="mt-3 font-medium text-brand-text">No tracking result yet</p>
          <p className="mt-1 text-sm text-gray-500">Use the form above to view shipment details and timeline.</p>
        </section>
      )}
    </div>
  );
}

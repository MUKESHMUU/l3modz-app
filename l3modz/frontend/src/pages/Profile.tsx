import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import ShipmentDetailsCard from '@/components/ShipmentDetailsCard';
import { apiFetch } from '@/lib/api';
import { LogOut, Package } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const hasLoadedOrdersRef = useRef(false);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.dispatchEvent(new Event('l3-auth-changed'));
    navigate('/login');
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      if (!hasLoadedOrdersRef.current) {
        setLoadingOrders(true);
      }
      try {
        const sessionRes = await apiFetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (!cancelled) {
            setUser(sessionData?.user ? { name: sessionData.user.name, email: sessionData.user.email } : null);
          }
        }

        const res = await apiFetch('/api/orders', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : []);
        }
        hasLoadedOrdersRef.current = true;
      } catch (error) {
        console.error('[Profile] Failed to refresh orders', error);
      } finally {
        if (!cancelled && !hasLoadedOrdersRef.current) {
          setLoadingOrders(false);
        }
      }
    }

    fetchOrders();

    const intervalId = window.setInterval(() => {
      fetchOrders();
    }, 30000);

    const handleRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      fetchOrders();
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-1">
        <div className="bg-white border border-brand-border rounded-2xl p-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-brand-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <h2 className="font-bold text-brand-text mb-1">{user?.name || 'User'}</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">{user?.email || '-'}</p>
          <Button variant="outline" size="sm" fullWidth onClick={handleLogout} className="border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="md:col-span-3 space-y-8">
        <div className="bg-white border border-brand-border rounded-2xl p-6">
          <h3 className="font-bold text-xl mb-6 flex items-center">
            <Package size={20} className="mr-2 text-brand-primary" /> Order History
          </h3>
          {loadingOrders ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-brand-border">
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-brand-border">
              <p className="text-gray-500">No orders found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order._id} className="rounded-xl border border-brand-border bg-gray-50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">Order #{String(order._id).slice(-8)}</p>
                      <p className="text-xs text-gray-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-text">₹{(order.totalPrice || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500">{order.status || 'Pending'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ShipmentDetailsCard
                      order={order}
                      title="Shipment Snapshot"
                      compact
                      showHistory={false}
                      detailsHref={`/orders/${order._id}`}
                      className="shadow-none"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex items-center justify-center rounded-full border-2 border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                    >
                      View order details
                    </Link>
                    <a
                      href={`/api/orders/${order._id}/invoice`}
                      className="inline-flex items-center justify-center rounded-full border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
                    >
                      Download Invoice
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-6">
          <h3 className="font-bold text-xl mb-6">Saved Addresses</h3>
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-brand-border">
            <p className="text-gray-500">No saved addresses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

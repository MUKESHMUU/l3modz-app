import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import { apiFetch } from '@/lib/api';
import { LogOut, Package } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.dispatchEvent(new Event('l3-auth-changed'));
    navigate('/login');
  };

  useEffect(() => {
    async function fetchOrders() {
      setLoadingOrders(true);
      try {
        const sessionRes = await apiFetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setUser(sessionData?.user ? { name: sessionData.user.name, email: sessionData.user.email } : null);
        }

        const res = await apiFetch('/api/orders', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } finally {
        setLoadingOrders(false);
      }
    }

    fetchOrders();

    const intervalId = window.setInterval(() => {
      fetchOrders();
    }, 60000);

    return () => window.clearInterval(intervalId);
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
                <div key={order._id} className="rounded-xl border border-brand-border bg-gray-50 p-4">
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

                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Delivery:</span> {order.delivery_status || '-'}</p>
                    <p><span className="font-semibold">Courier:</span> {order.courier_name || '-'}</p>
                    <p><span className="font-semibold">AWB:</span> {order.AWB_number || '-'}</p>
                    <p><span className="font-semibold">Estimated Delivery:</span> {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : '-'}</p>
                  </div>

                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-brand-primary hover:underline">
                      Track Shipment
                    </a>
                  )}
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

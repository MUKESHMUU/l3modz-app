import { useState, useEffect } from 'react';
import { clearBuyNowItem, getBuyNowItem, useCart } from '@/hooks/useCart';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

export default function CheckoutPage() {
  const { items, clearCart, isLoaded } = useCart();
  const navigate = useNavigate();
  const buyNowItem = getBuyNowItem();
  const checkoutItems = buyNowItem ? [buyNowItem] : items;
  const [razorpayConfigured, setRazorpayConfigured] = useState<boolean>(Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID));

  // At runtime, prefer fetching the public key from backend so production builds don't rely on local .env
  useEffect(() => {
    let mounted = true;
    const checkKey = async () => {
      try {
        // Use apiFetch which respects VITE_API_URL when configured
        const res = await apiFetch('/api/razorpay-key');
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (mounted && data?.key) setRazorpayConfigured(true);
      } catch {
      }
    };
    checkKey();
    return () => { mounted = false; };
  }, []);
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    addressLine1: '', addressLine2: '', landmark: '', locality: '', city: '', state: '', pincode: ''
  });
  const [paymentMethod] = useState<'Razorpay'>('Razorpay');
  const [loading, setLoading] = useState(false);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState('');
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoaded && checkoutItems.length === 0) {
      navigate('/cart');
    }
  }, [checkoutItems.length, isLoaded, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const checkPincode = async () => {
    const pincode = formData.pincode.trim();
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeServiceable(false);
      setPincodeMessage('Enter a valid 6-digit pincode');
      return false;
    }

    setPincodeChecking(true);
    setPincodeMessage('Checking serviceability...');
    try {
      const res = await apiFetch('/api/shipping/serviceability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Pincode check failed');
      setPincodeServiceable(!!data.serviceable);
      setPincodeMessage(data.message || (data.serviceable ? 'Delivery available' : 'Delivery unavailable'));
      return !!data.serviceable;
    } catch (error: any) {
      setPincodeServiceable(false);
      setPincodeMessage(error.message || 'Unable to verify pincode right now');
      return false;
    } finally {
      setPincodeChecking(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const canDeliver = await checkPincode();
      if (!canDeliver) {
        throw new Error('This pincode is currently not serviceable for delivery.');
      }

      const payload = {
        orderItems: checkoutItems.map(i => ({ product: i.id, name: i.title, quantity: i.quantity, image: i.image, price: i.price })),
        guestInfo: { name: formData.name, email: formData.email, phone: formData.phone },
        shippingAddress: {
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          landmark: formData.landmark,
          locality: formData.locality,
          street: formData.addressLine1,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        paymentMethod
      };

      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to create order');

      if (!razorpayConfigured) {
        throw new Error('Razorpay is not configured yet. Please contact support.');
      }

      // Razorpay Flow
      const resLoaded = await loadRazorpay();
      if (!resLoaded) throw new Error('Razorpay SDK failed to load. Are you online?');

      // Fetch public key from backend for robust production behavior
      const keyRes = await apiFetch('/api/razorpay-key');
      const keyJson = await keyRes.json();
      const publicKey = keyJson?.key || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!publicKey) {
        throw new Error('Razorpay public key is missing. Please contact support.');
      }

      const options = {
        key: publicKey,
        amount: data.amount,
        currency: data.currency,
        name: "L3 MODZ",
        description: "Premium Motorcycle Accessories",
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          const verifyRes = await apiFetch('/api/orders/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const vData = await verifyRes.json();
          if (verifyRes.ok) {
            toast.success('Payment successful. Order confirmed!');
            if (buyNowItem) {
              clearBuyNowItem();
            } else {
              clearCart();
            }
            navigate(`/profile`);
          } else {
            toast.error(vData.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone
        },
        theme: { color: "#007185" }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || checkoutItems.length === 0) return null;
  const total = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold mb-6">Checkout Details (Guest)</h2>
        <form id="checkout-form" onSubmit={placeOrder} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-brand-border">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Contact Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required name="name" onChange={handleInputChange} placeholder="Full Name" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
              <input required name="phone" type="tel" onChange={handleInputChange} placeholder="Phone Number" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
              <input required name="email" type="email" onChange={handleInputChange} placeholder="Email Address" className="w-full border p-3 rounded-lg md:col-span-2 focus:ring-2 focus:ring-brand-primary outline-none" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-brand-border">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">Shipping Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required name="addressLine1" onChange={handleInputChange} placeholder="Address Line 1" className="w-full border p-3 rounded-lg md:col-span-2 focus:ring-2 focus:ring-brand-primary outline-none" />
              <input name="addressLine2" onChange={handleInputChange} placeholder="Address Line 2 (Optional)" className="w-full border p-3 rounded-lg md:col-span-2 focus:ring-2 focus:ring-brand-primary outline-none" />
              <input required name="landmark" onChange={handleInputChange} placeholder="Landmark" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
              <input required name="locality" onChange={handleInputChange} placeholder="Area / Locality" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
              <input required name="city" onChange={handleInputChange} placeholder="City" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input required name="state" onChange={handleInputChange} placeholder="State" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
                <input required name="pincode" onBlur={checkPincode} onChange={handleInputChange} placeholder="Pincode" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none" />
              </div>
              {(pincodeMessage || pincodeChecking) && (
                <p className={`text-xs ${pincodeServiceable === false ? 'text-red-600' : pincodeServiceable ? 'text-green-600' : 'text-gray-500'} md:col-span-2`}>
                  {pincodeMessage}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="min-w-0">
        <div className="bg-gray-50 border border-brand-border rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24">
          <h3 className="font-bold text-lg mb-6">Order Summary</h3>
          <div className="space-y-4 mb-6">
            {checkoutItems.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <span className="font-medium mr-2">{item.quantity}x</span>
                  <span className="text-gray-600 line-clamp-1">{item.title}</span>
                </div>
                <span className="font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          
          <hr className="border-brand-border mb-4" />
          
          <div className="flex justify-between items-center mb-6 font-bold text-xl">
            <span>Total to pay</span>
            <span className="text-brand-primary">₹{total.toLocaleString('en-IN')}</span>
          </div>

          <div className="mb-6 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-2">Payment Option</h3>
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition border-brand-primary bg-cyan-50 ${!razorpayConfigured ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input type="radio" value="Razorpay" checked={paymentMethod === 'Razorpay'} readOnly className="mr-3 w-4 h-4 text-brand-primary" disabled={!razorpayConfigured} />
              <div>
                <span className="font-medium block">Pay Online (Razorpay)</span>
                <span className="text-xs text-gray-500">Credit Card, UPI, Netbanking</span>
                {!razorpayConfigured && <span className="text-xs text-amber-600 block mt-1">Enable this after adding Razorpay keys.</span>}
              </div>
            </label>
            <p className="text-xs text-gray-500">Cash on Delivery is disabled. Orders are confirmed only after successful online payment.</p>
          </div>

          <Button type="submit" form="checkout-form" size="lg" fullWidth disabled={loading}>
            {loading ? 'Processing...' : `Place Order • ₹${total.toLocaleString('en-IN')}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

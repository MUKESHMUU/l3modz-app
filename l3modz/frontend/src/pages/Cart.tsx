import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import Button from '@/components/Button';

export default function CartPage() {
  const { items, isLoaded, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const navigate = useNavigate();

  if (!isLoaded) return <div className="h-64 flex items-center justify-center">Loading cart...</div>;

  const total = getCartTotal();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-brand-border p-12 text-center flex flex-col items-center max-w-2xl mx-auto">
        <div className="bg-gray-50 p-6 rounded-full mb-6">
          <ShoppingBag size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Your Cart is Empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added any products to your cart yet.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/products">
            <Button size="lg">Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-24 h-48 sm:h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between w-full">
                <div className="w-full">
                  <Link to={`/products/${item.id}`} className="font-semibold text-brand-text hover:text-brand-primary line-clamp-2">
                    {item.title}
                  </Link>
                  <p className="font-bold mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                </div>
                
                <div className="flex items-center justify-between mt-4 gap-3">
                  <div className="flex items-center border border-brand-border rounded-full p-0.5">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                    >-</button>
                    <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                    >+</button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-gray-50 border border-brand-border rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24">
            <h3 className="font-bold text-lg mb-4">Order Summary</h3>
            <div className="flex justify-between items-center mb-3 text-gray-600">
              <span>Subtotal ({items.length} items)</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center mb-6 text-gray-600">
              <span>Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <hr className="border-brand-border mb-4" />
            <div className="flex justify-between items-center mb-8 font-bold text-xl text-brand-text">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <Button size="lg" fullWidth onClick={() => navigate('/checkout')}>
              Proceed to Checkout <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

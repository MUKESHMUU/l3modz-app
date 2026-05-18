"use client";
import { useState } from 'react';
import { ShoppingCart, Zap, ShieldCheck } from 'lucide-react';
import Button from './Button';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

export default function StickyBuyBox({ product }: { product: any }) {
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = typeof pathname === 'string' && pathname.startsWith('/admin');

  const handleAddToCart = () => {
    // In real app, push to Cart Context/Zustand store
    alert(`${qty} x ${product.title} added to cart`);
  };

  const handleBuyNow = () => {
    // Check out immediately
    router.push('/checkout');
  };

  return (
    <div className="sticky top-24 bg-white p-6 rounded-3xl border border-brand-border shadow-sm flex flex-col space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <span className="text-3xl font-bold text-brand-text">₹{product.price.toLocaleString('en-IN')}</span>
          {product.originalPrice && (
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
              <span className="text-xs font-bold text-red-500">
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
              </span>
            </div>
          )}

          {isAdminRoute && (
            <>
              {product.inStock ? (
                <div className="mt-5 flex items-center text-green-600 font-medium text-sm">
                  <ShieldCheck size={18} className="mr-1" /> In Stock &amp; Ready to Dispatch
                </div>
              ) : (
                <div className="mt-5 text-red-500 font-medium text-sm">Out of Stock</div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                Stock Quantity: {typeof product.stock === 'number' ? product.stock : 0}
              </div>
            </>
          )}
        </div>

        <div className="w-48 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between border border-brand-border rounded-full p-1">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-medium transition"
            >-</button>
            <span className="font-semibold">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-medium transition"
            >+</button>
          </div>

          <Button
            onClick={handleAddToCart}
            variant="outline"
            size="md"
            className="w-full !rounded-xl border-2 border-cyan-600 !px-4 !py-2.5 text-cyan-700 hover:!bg-cyan-600 hover:!text-white shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
          </Button>
          <Button
            onClick={handleBuyNow}
            variant="secondary"
            size="md"
            className="w-full !rounded-xl !px-4 !py-2.5 text-black shadow-md bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-500 hover:to-yellow-400 border border-amber-300"
          >
            <Zap className="w-4 h-4 mr-2" /> Buy Now
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center flex flex-col items-center space-y-2 mt-4 pt-4 border-t border-brand-border">
        <span>Delivery within 3-5 business days</span>
        <div className="flex space-x-3 mt-1">
          <span className="flex items-center"><ShieldCheck size={14} className="mr-1 text-brand-primary"/> Secure Payment</span>
        </div>
      </div>
    </div>
  );
}

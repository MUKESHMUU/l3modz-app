"use client";
import { useState } from 'react';
import { ShoppingCart, Zap, ShieldCheck } from 'lucide-react';
import Button from './Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { setBuyNowItem, useCart } from '@/hooks/useCart';

export default function StickyBuyBox({ product }: { product: any }) {
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product, qty);
    toast.success(`${qty} x ${product.title} added to cart`);
  };

  const handleBuyNow = () => {
    setBuyNowItem(product, qty);
    navigate('/checkout');
  };

  return (
    <div className="lg:sticky lg:top-24 bg-white p-4 sm:p-6 rounded-3xl border border-brand-border shadow-sm flex flex-col space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-5 sm:gap-6">
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

          {product.inStock ? (
            <div className="mt-5 flex items-center text-green-600 font-medium text-sm">
              <ShieldCheck size={18} className="mr-1" /> In Stock &amp; Ready to Dispatch
            </div>
          ) : (
            <div className="mt-5 text-red-500 font-medium text-sm">Out of Stock</div>
          )}
        </div>

        <div className="w-full sm:w-48 shrink-0 flex flex-col gap-3">
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
            disabled={product.inStock === false}
          >
            <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
          </Button>
          <Button
            onClick={handleBuyNow}
            variant="secondary"
            size="md"
            className="w-full !rounded-xl !px-4 !py-2.5 text-black shadow-md bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-500 hover:to-yellow-400 border border-amber-300"
            disabled={product.inStock === false}
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

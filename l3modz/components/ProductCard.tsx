import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart } from 'lucide-react';
import Button from './Button';

interface ProductCardProps {
  product: {
    _id: string;
    title: string;
    slug: string;
    price: number;
    originalPrice?: number;
    images: string[];
    rating: number;
    numReviews: number;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;

  return (
    <div className="bg-white border border-brand-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300 group flex flex-col h-full">
      <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-gray-50 block">
        {discount > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            {discount}% OFF
          </div>
        )}
        {/* We use standard img tag here for simplicity without configuring Next/Image domains yet, but in production we switch to next/image */}
        <img 
          src={product.images[0] || 'https://via.placeholder.com/400?text=L3+MODZ'} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center space-x-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star 
              key={i} 
              size={14} 
              className={i < Math.round(product.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-300"} 
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">({product.numReviews})</span>
        </div>

        <Link href={`/products/${product.slug}`} className="flex-grow">
          <h3 className="text-brand-text font-medium text-sm md:text-base line-clamp-2 hover:text-brand-primary transition">
            {product.title}
          </h3>
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-brand-text">₹{product.price.toLocaleString('en-IN')}</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
            )}
          </div>
          <Button variant="secondary" size="sm" className="!px-3 !py-2 rounded-full shadow-sm" aria-label="Add to cart">
            <ShoppingCart size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

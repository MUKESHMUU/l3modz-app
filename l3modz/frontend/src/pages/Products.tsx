import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { Filter, Bike, X } from 'lucide-react';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search   = searchParams.get('search');
  const category = searchParams.get('category');
  const brand    = searchParams.get('brand');
  const model    = searchParams.get('model');
  const year     = searchParams.get('year');

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isBikeFilter = !!(brand || model || year);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const url = new URL('/api/products', window.location.origin);
        if (search)   url.searchParams.append('search',   search);
        if (category) url.searchParams.append('category', category);
        if (brand)    url.searchParams.append('brand',    brand);
        if (model)    url.searchParams.append('model',    model);
        if (year)     url.searchParams.append('year',     year);

        const res = await fetch(url.toString());
        if (res.ok) setProducts(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [search, category, brand, model, year]);

  const clearBikeFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('brand');
    next.delete('model');
    next.delete('year');
    setSearchParams(next);
  };

  const pageTitle = search
    ? `Search results for "${search}"`
    : isBikeFilter
    ? `Parts for ${brand}${model ? ` ${model}` : ''}${year ? ` (${year})` : ''}`
    : category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'All Products';

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters (Desktop) */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 bg-white border border-brand-border rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center">
            <Filter size={18} className="mr-2" /> Filters
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-3 uppercase tracking-wider">Categories</h4>
              <ul className="space-y-2 text-brand-text">
                <li><Link to="/products" className={!category && !isBikeFilter ? "text-brand-primary font-medium" : "hover:text-brand-primary"}>All Products</Link></li>
                <li><Link to="/products?category=footrest" className={category === 'footrest' ? "text-brand-primary font-medium" : "hover:text-brand-primary"}>Footrests</Link></li>
                <li><Link to="/products?category=radiator-guards" className={category === 'radiator-guards' ? "text-brand-primary font-medium" : "hover:text-brand-primary"}>Radiator Guards</Link></li>
                <li><Link to="/products?category=carriers" className={category === 'carriers' ? "text-brand-primary font-medium" : "hover:text-brand-primary"}>Carriers &amp; Racks</Link></li>
                <li><Link to="/products?category=accessories" className={category === 'accessories' ? "text-brand-primary font-medium" : "hover:text-brand-primary"}>Accessories</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-text">
            {pageTitle}
          </h1>
          <span className="text-gray-500 text-sm font-medium">{products.length} Products</span>
        </div>

        {/* Active bike filter chip */}
        {isBikeFilter && (
          <div className="mb-5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active filter:</span>
            <span className="inline-flex items-center gap-2 bg-brand-primary text-white text-sm font-semibold px-4 py-1.5 rounded-full">
              <Bike size={13} />
              {brand}{model ? ` · ${model}` : ''}{year ? ` · ${year}` : ''}
              <button onClick={clearBikeFilter} className="ml-1 hover:text-red-200 transition">
                <X size={13} />
              </button>
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-gray-500">
              {isBikeFilter
                ? 'No accessories are listed for this bike yet. Try a different model or browse all products.'
                : 'Try adjusting your filters or search terms.'}
            </p>
            {isBikeFilter && (
              <button
                onClick={clearBikeFilter}
                className="mt-4 text-brand-primary font-semibold hover:underline text-sm"
              >
                Clear bike filter →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

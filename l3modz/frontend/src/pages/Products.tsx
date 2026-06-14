import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const isBikeFilter = !!(brand || model || year);

  useEffect(() => {
    setSelectedCategory(category);
  }, [category]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCategories = async (signal?: AbortSignal) => {
      try {
        setCatLoading(true);
        const res = await fetch('/api/categories', { signal });
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : (data.data ?? []);
        setCategories(list);
        setSelectedCategory((prev) =>
          prev && !list.some((c) => c.slug === prev) ? null : prev
        );
        setCatError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setCatError('Could not load categories.');
        }
      } finally {
        setCatLoading(false);
      }
    };

    fetchCategories(controller.signal);
    const interval = window.setInterval(() => fetchCategories(), 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setProductsLoading(true);
        const url = new URL('/api/products', window.location.origin);
        if (search)   url.searchParams.append('search',   search);
        if (selectedCategory) url.searchParams.append('category', selectedCategory);
        if (brand)    url.searchParams.append('brand',    brand);
        if (model)    url.searchParams.append('model',    model);
        if (year)     url.searchParams.append('year',     year);

        const res = await fetch(url.toString(), { signal: controller.signal });
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : (data.data ?? []));
        setProductsError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setProductsError('Failed to load products.');
        }
      } finally {
        setProductsLoading(false);
      }
    }, 150);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, selectedCategory, brand, model, year]);

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

  const handleCategoryClick = (slug: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (slug) {
      next.set('category', slug);
    } else {
      next.delete('category');
    }
    setSearchParams(next);
    setSelectedCategory(slug);
  };

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
                {catLoading && [1, 2, 3, 4, 5].map((i) => (
                  <li key={i}>
                    <div className="h-4 rounded-full bg-gray-200 animate-pulse" />
                  </li>
                ))}
                {catError && !catLoading && (
                  <p className="text-sm text-red-500 px-2">{catError} Showing all products.</p>
                )}
                {!catLoading && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(null)}
                      className={selectedCategory === null && !isBikeFilter ? "text-brand-primary font-medium" : "hover:text-brand-primary"}
                    >
                      ALL PRODUCTS
                    </button>
                  </li>
                )}
                {!catLoading && categories.map((catItem) => (
                  <li key={catItem._id}>
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(catItem.slug)}
                      className={selectedCategory === catItem.slug ? "text-brand-primary font-medium" : "hover:text-brand-primary"}
                    >
                      {catItem.name}
                    </button>
                  </li>
                ))}
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

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white border border-brand-border rounded-2xl overflow-hidden animate-pulse h-80" />
            ))}
          </div>
        ) : productsError ? (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">Failed to load products.</h3>
            <p className="text-gray-500">Please try again or select a different category.</p>
            <button
              onClick={() => setSelectedCategory(selectedCategory)}
              className="mt-4 text-brand-primary font-semibold hover:underline text-sm"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-2xl p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">No products found in this category.</h3>
            <p className="text-gray-500">Try selecting a different category or clear your filters.</p>
            <button
              onClick={() => handleCategoryClick(null)}
              className="mt-4 text-brand-primary font-semibold hover:underline text-sm"
            >
              View All Products
            </button>
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

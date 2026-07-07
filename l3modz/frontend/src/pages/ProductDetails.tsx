import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductGallery from '@/components/ProductGallery';
import ProductTitle from '@/components/ProductTitle';
import StickyBuyBox from '@/components/StickyBuyBox';
import CompatibilityChecker from '@/components/CompatibilityChecker';
import { Star, CheckCircle, List, Settings } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          setError('Product not found. It may have been removed or the link is invalid.');
          setProduct(null);
        } else {
          const data = await res.json();
          setProduct(data);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to load this product right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProduct();
  }, [id, navigate]);

  if (loading) return <div className="h-96 flex justify-center items-center">Loading product...</div>;
  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-brand-border rounded-2xl p-10 text-center">
        <h2 className="text-2xl font-bold text-brand-text">Product unavailable</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-white font-semibold hover:bg-cyan-800 transition"
        >
          Back to Products
        </button>
      </div>
    );
  }
  if (!product) return null;

  const categoryLabel = product.categoryId
    ? typeof product.categoryId === 'string'
      ? product.categoryId
      : product.categoryId.name || product.categoryId.slug || ''
    : '';
  const productCategories = categoryLabel
    ? [categoryLabel]
    : Array.isArray(product.categories)
    ? product.categories
    : [];

  const descriptionText = (product.description || 'Premium motorcycle accessory designed for maximum durability and perfect fitment.').trim();
  const descriptionPoints = descriptionText
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => line.replace(/^[•*-]\s*/, '').replace(/^\.\s*/, ''));

  return (
    <>
      <div className="flex flex-col gap-6 pb-16 lg:hidden">
        <section className="order-1">
          <div className="flex flex-col space-y-6">
            <div>
              <div className="flex items-center space-x-2 text-sm text-brand-primary font-semibold tracking-wider uppercase mb-2">
                {productCategories.map((c: string) => <span key={c}>{c.replace('-', ' ')}</span>)}
              </div>
              <ProductTitle title={product.title} variant="hero" captionOnly={true} showTooltip={true} />

              <div className="flex items-center space-x-4">
                <div className="flex items-center text-yellow-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} className={i < Math.round(product.rating || 0) ? 'fill-current' : 'text-gray-300'} />
                  ))}
                </div>
                <a href="#reviews" className="text-sm text-brand-primary hover:underline font-medium">
                  {product.numReviews} Reviews
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="order-2">
          <ProductGallery images={product.images || []} />
        </section>

        <section className="order-3">
          <StickyBuyBox product={product} />
        </section>

        {product.features && product.features.length > 0 && (
          <section className="order-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.features.slice(0, 1).map((feat: string, idx: number) => (
                <div key={idx} className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-brand-border/50">
                  <CheckCircle size={16} className="text-green-500 mr-2 shrink-0" />
                  {feat.split(/\s*[\|–—]\s*/)[0]}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="order-5">
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-5 py-3">
              <h3 className="font-semibold text-brand-text text-sm uppercase tracking-[0.08em] flex items-center">
                <List size={16} className="mr-2 text-brand-primary" /> Product Description
              </h3>
              <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-primary">
                Details
              </span>
            </div>

            <div className="p-5">
              <ul className="space-y-2.5">
                {descriptionPoints.map((point: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="order-6">
          <CompatibilityChecker compatibilities={product.compatibility || []} />
        </section>

        {product.specs && (
          <section className="order-7">
            <div>
              <h3 className="font-semibold text-brand-text mb-4 text-sm uppercase tracking-wider flex items-center">
                <Settings size={16} className="mr-2" /> Specifications
              </h3>
              <div className="border border-brand-border rounded-xl overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-brand-border">
                  <div className="bg-gray-50 font-semibold p-3 text-gray-700 border-r border-brand-border">SKU</div>
                  <div className="col-span-2 p-3 text-gray-600">{product.specs.sku || 'N/A'}</div>
                </div>
                <div className="grid grid-cols-3 border-b border-brand-border">
                  <div className="bg-gray-50 font-semibold p-3 text-gray-700 border-r border-brand-border">Material</div>
                  <div className="col-span-2 p-3 text-gray-600">{product.specs.material || 'Premium Grade'}</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="bg-gray-50 font-semibold p-3 text-gray-700 border-r border-brand-border">Installation</div>
                  <div className="col-span-2 p-3 text-gray-600">{product.specs.installation || 'Direct Fit (DIY Friendly)'}</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-8 xl:gap-10 pb-16">
        <div className="flex flex-col gap-6 min-w-0">
          <section>
            <ProductGallery images={product.images || []} />
          </section>

          <section>
            <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-brand-border bg-gradient-to-r from-gray-50 to-white px-5 py-3">
                <h3 className="font-semibold text-brand-text text-sm uppercase tracking-[0.08em] flex items-center">
                  <List size={16} className="mr-2 text-brand-primary" /> Product Description
                </h3>
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-primary">
                  Details
                </span>
              </div>

              <div className="p-5">
                <ul className="space-y-2.5">
                  {descriptionPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <section>
            <div className="flex flex-col space-y-5">
              <div>
                <div className="flex items-center space-x-2 text-sm text-brand-primary font-semibold tracking-wider uppercase mb-2">
                  {productCategories.map((c: string) => <span key={c}>{c.replace('-', ' ')}</span>)}
                </div>
                <ProductTitle title={product.title} variant="hero" captionOnly={true} showTooltip={true} />

                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={18} className={i < Math.round(product.rating || 0) ? 'fill-current' : 'text-gray-300'} />
                    ))}
                  </div>
                  <a href="#reviews" className="text-sm text-brand-primary hover:underline font-medium">
                    {product.numReviews} Reviews
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section>
            <StickyBuyBox product={product} />
          </section>

          {product.features && product.features.length > 0 && (
            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.features.slice(0, 1).map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-center text-sm font-medium text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-brand-border/50">
                    <CheckCircle size={16} className="text-green-500 mr-2 shrink-0" />
                    {feat.split(/\s*[\|–—]\s*/)[0]}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <CompatibilityChecker compatibilities={product.compatibility || []} />
          </section>

          {product.specs && (
            <section>
              <div>
                <h3 className="font-semibold text-brand-text mb-4 text-sm uppercase tracking-wider flex items-center">
                  <Settings size={16} className="mr-2" /> Specifications
                </h3>
                <div className="border border-brand-border rounded-xl overflow-hidden text-sm">
                  <div className="grid grid-cols-3 border-b border-brand-border">
                    <div className="bg-gray-50 font-semibold p-3 text-gray-700 border-r border-brand-border">SKU</div>
                    <div className="col-span-2 p-3 text-gray-600">{product.specs.sku || 'N/A'}</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-brand-border">
                    <div className="bg-gray-50 font-semibold p-3 text-gray-700 border-r border-brand-border">Material</div>
                    <div className="col-span-2 p-3 text-gray-600">{product.specs.material || 'Premium Grade'}</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="bg-gray-50 font-semibold p-3 text-gray-700 border-r border-brand-border">Installation</div>
                    <div className="col-span-2 p-3 text-gray-600">{product.specs.installation || 'Direct Fit (DIY Friendly)'}</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

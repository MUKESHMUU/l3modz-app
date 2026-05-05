import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import Button from "@/components/Button";
import ShopByBike from "@/components/ShopByBike";
import { ArrowRight, ShieldCheck, Truck, Wrench, Star, User, Zap, Globe } from "lucide-react";

type HomeCategory = {
  _id?: string;
  name: string;
  slug: string;
  image?: string;
};

const FALLBACK_CATEGORIES: HomeCategory[] = [
  { name: "Footrests", slug: "footrest", image: "/footrest-l321.png" },
  { name: "Radiator Guards", slug: "radiator-guards", image: "/radiator-guard-l3.png" },
  { name: "Carriers", slug: "carriers", image: "/carriers.png" },
  { name: "Accessories", slug: "accessories", image: "/accessories.png" },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products?limit=4"),
          fetch('/api/categories'),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setFeaturedProducts(Array.isArray(data) ? data : []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          if (Array.isArray(data) && data.length > 0) {
            const nextCategories = data
              .map((item: HomeCategory) => ({
                _id: item._id,
                name: item.name,
                slug: item.slug,
                image: item.image,
              }))
              .filter((item: HomeCategory) => item.name && item.slug);
            if (nextCategories.length > 0) {
              setCategories(nextCategories.slice(0, 8));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch homepage data", error);
      }
    }

    fetchHomeData();
  }, []);

  return (
    <div className="flex flex-col space-y-16 pb-12">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gray-900 border border-brand-border min-h-[360px] md:min-h-[500px] flex items-center">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Motorcycle accessories hero"
          />
        </div>
        <div className="relative z-10 px-6 sm:px-8 md:px-16 max-w-2xl text-white py-10 sm:py-12 md:py-0">
          <span className="inline-block py-1 px-3 rounded-full bg-brand-primary/20 text-cyan-400 border border-brand-primary/30 text-xs font-semibold tracking-wider mb-4 uppercase">
            Premium Quality
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-5 md:mb-6 leading-tight">
            Upgrade Your Ride with <span className="text-brand-accent">L3 MODZ</span>.
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-7 md:mb-8 max-w-lg">
            Direct fit, CNC metal crafted, and weatherproof accessories designed for true riders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/products">
              <Button size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-cyan-900/50">
                Shop all Parts <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 bg-white p-5 sm:p-8 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-brand-bg p-3 rounded-full text-brand-primary">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h4 className="font-semibold text-brand-text">Premium Quality</h4>
            <p className="text-sm text-gray-500">CNC Metal & Weatherproof</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-brand-bg p-3 rounded-full text-brand-primary">
            <Wrench size={28} />
          </div>
          <div>
            <h4 className="font-semibold text-brand-text">Direct Fit Guarantee</h4>
            <p className="text-sm text-gray-500">No modifications required</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-brand-bg p-3 rounded-full text-brand-primary">
            <Truck size={28} />
          </div>
          <div>
            <h4 className="font-semibold text-brand-text">Fast Dispatch</h4>
            <p className="text-sm text-gray-500">Delivered across India</p>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-text">Shop by Category</h2>
          <Link to="/products" className="text-brand-primary hover:underline font-medium flex items-center">
            View All <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat) => (
            <Link key={cat.slug} to={`/products?category=${cat.slug}`} className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 flex items-center justify-center border border-brand-border shadow-sm">
              <img src={cat.image || '/file.svg'} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                <h3 className="text-white font-bold text-lg md:text-xl tracking-wide">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Bike */}
      <ShopByBike />

      {/* Featured Products */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-text">Featured Products</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">Loading featured products...</p>
          )}
        </div>
      </section>

      {/* What Our Riders Say (Google Reviews Placeholder) */}
      <section className="bg-white rounded-3xl p-8 md:p-12 border border-brand-border shadow-sm text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-brand-text mb-4">What Our Riders Say</h2>
        <p className="text-gray-500 mb-8 max-w-2xl mx-auto">Don&apos;t just take our word for it. Trusted by thousands of riders across India.</p>
        
        {/* Tagembed Widget Code naturally goes here. Using a styled placeholder for now. */}
        <div className="bg-brand-bg border border-dashed border-gray-300 rounded-xl p-12 text-gray-400 flex flex-col items-center justify-center">
          <Star size={48} className="text-yellow-400 mb-4" />
          <p className="font-medium text-lg">Google Reviews Widget Loading...</p>
          <p className="text-sm">Tagembed integration will render here.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { icon: User,   value: '1M+', label: 'HAPPY CUSTOMER' },
          { icon: Zap,    value: '500+', label: 'BIKES COMPATIBLE' },
          { icon: Globe,  value: '15+', label: 'COUNTRIES SERVED' },
          { icon: Star,   value: '10+', label: 'YEAR EXPERIENCE' },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-3 bg-[#ddeeff] rounded-2xl p-6 shadow-sm"
          >
            <Icon size={28} className="text-gray-400" strokeWidth={1.5} />
            <div>
              <div className="text-3xl md:text-4xl font-extrabold text-brand-text leading-none mb-1">
                {value}
              </div>
              <div className="text-xs font-bold tracking-widest text-brand-primary uppercase">
                {label}
              </div>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}

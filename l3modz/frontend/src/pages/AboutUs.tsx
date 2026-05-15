import { Shield, Award, Users, Wrench } from 'lucide-react';

export default function AboutUs() {
  const stats = [
    { label: 'Years of Experience', value: '10+' },
    { label: 'Happy Customers', value: '5000+' },
    { label: 'Products Available', value: '200+' },
    { label: 'Bike Models Covered', value: '50+' },
  ];

  const values = [
    { icon: Shield, title: 'Quality First', desc: 'Every product is rigorously tested to meet the highest standards of durability and performance.' },
    { icon: Award, title: 'Trusted Brand', desc: 'L3 MODZ has been a trusted name in bike accessories for over a decade.' },
    { icon: Users, title: 'Customer Focus', desc: 'We listen to our riders and constantly improve our product lineup based on feedback.' },
    { icon: Wrench, title: 'Precision Engineering', desc: 'Our accessories are engineered for perfect fitment on your specific bike model.' },
  ];

  return (
    <div className="py-10 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-extrabold text-brand-text tracking-tight mb-4">
          About <span className="text-brand-primary">L3 MODZ</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
          We are passionate riders and engineers dedicated to crafting premium motorcycle accessories — from footrests to radiator guards — that elevate your ride in style and safety.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-14">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-brand-border p-6 text-center">
            <div className="text-3xl font-extrabold text-brand-primary mb-1">{s.value}</div>
            <div className="text-sm text-gray-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Story */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-8 mb-14">
        <h2 className="text-2xl font-bold text-brand-text mb-4">Our Story</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          At L3 Modz, our journey began with one simple passion - motorcycles and the riders who live for the road. What started as a small idea among biking enthusiasts soon grew into a brand dedicated to creating high-quality motorcycle accessories that combine style, durability, and functionality.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          As riders ourselves, we understood the need for accessories that not only improve the look of a bike but also enhance comfort, protection, and everyday usability. From radiator guards and mobile holder mounts to side stand extenders, footrests, meter relocators, and riding gear accessories, every product from L3 Modz is designed with real-world riding experience in mind.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          Our mission is to deliver premium-quality motorcycle accessories that riders can trust. We focus on strong materials, precision fitment, modern designs, and practical performance to ensure every product meets the expectations of passionate bikers across India.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          Over the years, L3 Modz has earned the trust of thousands of riders by continuously innovating and improving our products for popular motorcycles including KTM, Royal Enfield, Yamaha, TVS, Hero, Bajaj, Triumph, and more.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          We believe every motorcycle tells a story - and our goal is to help riders customize, protect, and upgrade their machines with confidence.
        </p>
        <div className="rounded-xl bg-brand-bg/70 p-4">
          <h3 className="font-bold text-brand-text mb-3">Why Riders Choose L3 Modz</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-gray-600 text-sm leading-relaxed">
            <li>Premium build quality & durable materials</li>
            <li>Rider-focused functional designs</li>
            <li>Stylish accessories for modern motorcycles</li>
            <li>Easy installation & precise fitment</li>
            <li>Trusted by biking enthusiasts across India</li>
          </ul>
        </div>
        <p className="text-gray-600 leading-relaxed mt-4">
          At L3 Modz, we don&apos;t just manufacture accessories - we build products for the riding community.
        </p>
        <p className="text-gray-600 leading-relaxed mt-4 font-semibold text-brand-text">
          Ride Better. Ride Smarter. Ride with L3 Modz.
        </p>
      </div>

      {/* Values */}
      <h2 className="text-2xl font-bold text-brand-text mb-6 text-center">Why Choose Us</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {values.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl shadow-sm border border-brand-border p-6 flex gap-4 items-start">
            <div className="bg-brand-primary/10 p-3 rounded-xl flex-shrink-0">
              <Icon size={22} className="text-brand-primary" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text mb-1">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

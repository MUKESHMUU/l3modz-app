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
          L3 MODZ was founded by a group of motorcycle enthusiasts who were frustrated with the lack of high-quality, affordable accessories for Indian bikes. Starting from a small workshop in Tamil Nadu, we began crafting custom footrests, radiator guards, and carriers that riders actually needed.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Today, we are proud to serve thousands of bikers across India with a growing catalog of precision-engineered accessories compatible with the most popular bike models. Our mission is simple: give every rider the freedom to customize their machine without compromise.
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

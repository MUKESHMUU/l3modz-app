import { MapPin, Phone, Globe } from 'lucide-react';

const dealers = [
  {
    id: 1,
    name: 'Moto Gear Hub',
    city: 'Chennai',
    state: 'Tamil Nadu',
    phone: '+91 98765 11001',
    address: '14, Anna Nagar, Chennai – 600040',
    website: '',
  },
  {
    id: 2,
    name: "Rider's Zone",
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    phone: '+91 98765 22002',
    address: '7, Gandhipuram, Coimbatore – 641012',
    website: '',
  },
  {
    id: 3,
    name: 'Bike Accessories World',
    city: 'Bengaluru',
    state: 'Karnataka',
    phone: '+91 98765 33003',
    address: '22, MG Road, Bengaluru – 560001',
    website: '',
  },
  {
    id: 4,
    name: 'Two Wheeler Paradise',
    city: 'Hyderabad',
    state: 'Telangana',
    phone: '+91 98765 44004',
    address: '5, Banjara Hills, Hyderabad – 500034',
    website: '',
  },
  {
    id: 5,
    name: 'Speed Parts',
    city: 'Pune',
    state: 'Maharashtra',
    phone: '+91 98765 55005',
    address: '8, FC Road, Pune – 411004',
    website: '',
  },
  {
    id: 6,
    name: 'ProMoto Accessories',
    city: 'Delhi',
    state: 'Delhi',
    phone: '+91 98765 66006',
    address: '33, Karol Bagh, New Delhi – 110005',
    website: '',
  },
];

export default function OurDealers() {
  return (
    <div className="py-10 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-brand-text tracking-tight mb-3">
          Our <span className="text-brand-primary">Dealers</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Find an authorised L3 MODZ dealer near you and experience our products first-hand.
        </p>
      </div>

      {/* Become a Dealer CTA */}
      <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-brand-text">Want to become a dealer?</h2>
          <p className="text-sm text-gray-500 mt-0.5">Join our network and offer premium L3 MODZ products to your customers.</p>
        </div>
        <a
          href="https://wa.me/919843199393?text=I%20am%20interested%20in%20becoming%20an%20L3%20MODZ%20dealer"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-cyan-700 transition whitespace-nowrap text-sm"
        >
          Contact Us on WhatsApp
        </a>
      </div>

      {/* Dealers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dealers.map((dealer) => (
          <div key={dealer.id} className="bg-white border border-brand-border rounded-2xl shadow-sm p-5 hover:shadow-md hover:border-brand-primary transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-brand-text text-base">{dealer.name}</h3>
                <span className="text-xs font-medium text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                  {dealer.city}, {dealer.state}
                </span>
              </div>
              <div className="bg-brand-primary/10 p-2 rounded-xl">
                <MapPin size={18} className="text-brand-primary" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">{dealer.address}</p>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone size={14} className="text-brand-primary flex-shrink-0" />
              <a href={`tel:${dealer.phone.replace(/\s/g, '')}`} className="hover:text-brand-primary transition">
                {dealer.phone}
              </a>
            </div>
            {dealer.website && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                <Globe size={14} className="text-brand-primary flex-shrink-0" />
                <a href={dealer.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition">
                  {dealer.website}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

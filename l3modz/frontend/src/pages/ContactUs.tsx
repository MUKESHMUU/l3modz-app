import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Message sent! We will get back to you soon.');
    setForm({ name: '', email: '', phone: '', message: '' });
    setSending(false);
  };

  const contactInfo = [
    { icon: Phone, label: 'Phone', value: '+91 98431 99393', href: 'tel:+919843199393' },
    { icon: Mail, label: 'Email', value: 'l3modz2022@gmail.com', href: 'mailto:l3modz2022@gmail.com' },
    { icon: MessageCircle, label: 'WhatsApp', value: '+91 98431 99393', href: 'https://wa.me/919843199393' },
    { icon: MapPin, label: 'Location', value: 'NO.738, Ramnandha Nagar, Saravanampatti, Coimbatore, Tamil Nadu - 641035', href: '#' },
  ];

  return (
    <div className="py-10 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-brand-text tracking-tight mb-3">
          Contact <span className="text-brand-primary">Us</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Got a question or need help with your order? We're just a message away.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-brand-text mb-4">Get In Touch</h2>
          {contactInfo.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white border border-brand-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brand-primary transition-all group"
            >
              <div className="bg-brand-primary/10 p-3 rounded-xl group-hover:bg-brand-primary transition-colors">
                <Icon size={20} className="text-brand-primary group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</div>
                <div className="text-brand-text font-semibold">{value}</div>
              </div>
            </a>
          ))}

          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-5 mt-6">
            <h3 className="font-bold text-brand-text mb-1">Business Hours</h3>
            <p className="text-sm text-gray-500">Monday – Saturday: 9:00 AM – 7:00 PM</p>
            <p className="text-sm text-gray-500">Sunday: Closed</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-brand-text mb-6">Send a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="How can we help you?"
                className="w-full border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold py-3 rounded-lg hover:bg-cyan-700 transition disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { MessageSquareText, PhoneCall, Navigation, MapPin } from 'lucide-react';
import logoWhite from '@/assets/Logo For PNG.png';

export default function Footer() {
  return (
    <footer className="border-t border-emerald-200 bg-emerald-50/35 pt-10 pb-6 text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-full rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-black">
              <MessageSquareText size={18} />
              <p className="text-sm font-semibold">Customer Service</p>
            </div>
            <p className="text-sm text-black">Monday - Saturday : 10am to 6pm IST</p>
          </div>

          <div className="h-full rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-black">
              <PhoneCall size={18} />
              <p className="text-sm font-semibold">Call Us</p>
            </div>
            <a href="tel:+919843199393" className="text-sm text-black transition hover:text-black/70">
              +91 98431 99393
            </a>
          </div>

          <div className="h-full rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-black">
              <Navigation size={18} />
              <p className="text-sm font-semibold">Get in Touch</p>
            </div>
            <a href="mailto:l3modz2022@gmail.com" className="text-sm text-black transition hover:text-black/70">
              l3modz2022@gmail.com
            </a>
          </div>

          <div className="h-full rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-black">
              <MapPin size={18} />
              <p className="text-sm font-semibold">Address</p>
            </div>
            <p className="text-sm leading-relaxed text-black">NO.738, Ramnandha Nagar, Saravanampatti, Coimbatore, Tamil Nadu - 641035</p>
          </div>
        </div>

        <div className="my-8 h-px w-full bg-emerald-100" />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 xl:gap-12">
          <div className="min-w-0 lg:col-span-6">
            <img
              src={logoWhite}
              alt="L3 MODZ"
              className="h-14 w-auto"
              onError={(e) => {
                e.currentTarget.src = '/l3modz-logo-light.svg';
              }}
            />
            <h3 className="text-3xl font-semibold tracking-tight text-black">Join Our Newsletter</h3>
            <p className="mt-3 max-w-2xl text-base text-black/80">
              Subscribe to get exclusive offers, product launches, and rider updates.
            </p>
            <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="h-14 min-w-0 flex-1 rounded-full border border-emerald-200 bg-white px-6 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                type="submit"
                className="inline-flex h-14 w-full shrink-0 items-center justify-center rounded-full bg-emerald-700 px-6 text-base font-semibold whitespace-nowrap text-white transition hover:bg-emerald-800 sm:w-auto sm:min-w-[10rem] sm:px-8"
              >
                Sign Up
              </button>
            </form>
          </div>

          <div className="min-w-0 lg:col-span-3">
            <h4 className="text-lg font-semibold text-black">Company</h4>
            <ul className="mt-4 space-y-2 text-sm text-black/80">
              <li><Link to="/about" className="transition hover:text-black/60">Our Story</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Brand</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Careers</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Testimonials</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Blog</Link></li>
              <li><Link to="/contact" className="transition hover:text-black/60">Contact</Link></li>
            </ul>
          </div>

          <div className="min-w-0 lg:col-span-3">
            <h4 className="text-lg font-semibold text-black">Customer Policies</h4>
            <ul className="mt-4 space-y-2 text-sm text-black/80">
              <li><Link to="/products" className="transition hover:text-black/60">Privacy Policy</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Return Policy</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Shipping Policy</Link></li>
              <li><Link to="/products" className="transition hover:text-black/60">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-emerald-100 pt-6 text-sm text-black/70 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} L3 MODZ. Powered by L3Modz</p>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/l3modz?igsh=ZjkzNnhkMmczbzNt"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-emerald-200 bg-white text-pink-600 transition hover:bg-pink-600 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.45a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
              </svg>
            </a>
            <a
              href="https://youtube.com/@l3modz?si=Rm9Z6BWDDchQrOgN"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="grid h-10 w-10 place-items-center rounded-full border border-emerald-200 bg-white text-red-600 transition hover:bg-red-600 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

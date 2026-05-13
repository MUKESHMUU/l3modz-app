"use client";

import Link from 'next/link';
import { MessageSquareText, PhoneCall, Navigation, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-emerald-200 bg-emerald-50/70 pt-10 pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-700">
              <MessageSquareText size={18} />
              <p className="text-sm font-semibold">Customer Service</p>
            </div>
            <p className="text-sm text-gray-700">Monday - Saturday : 10am to 6pm IST</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-700">
              <PhoneCall size={18} />
              <p className="text-sm font-semibold">Call Us</p>
            </div>
            <a href="tel:+919843199393" className="text-sm text-gray-700 transition hover:text-emerald-700">
              +91 98431 99393
            </a>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-700">
              <Navigation size={18} />
              <p className="text-sm font-semibold">Get in Touch</p>
            </div>
            <a href="mailto:l3modz2022@gmail.com" className="text-sm text-gray-700 transition hover:text-emerald-700">
              l3modz2022@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-700">
              <MapPin size={18} />
              <p className="text-sm font-semibold">Address</p>
            </div>
            <p className="text-sm text-gray-700">Coimbatore, Tamil Nadu, India</p>
          </div>
        </div>

        <div className="my-8 h-px w-full bg-emerald-100" />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <img
              src="/black.png"
              alt="L3 MODZ"
              className="h-14 w-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/l3modz-logo-dark.svg';
              }}
            />
            <h3 className="text-3xl font-semibold tracking-tight text-emerald-900">Join Our Newsletter</h3>
            <p className="mt-3 max-w-2xl text-base text-emerald-900/80">
              Subscribe to get exclusive offers, product launches, and rider updates.
            </p>
            <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="h-12 w-full rounded-full border border-emerald-200 bg-white px-5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                type="submit"
                className="h-12 rounded-full bg-emerald-700 px-8 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Sign Up
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-lg font-semibold text-emerald-900">Company</h4>
            <ul className="mt-4 space-y-2 text-sm text-emerald-900/80">
              <li><Link href="/about" className="transition hover:text-emerald-700">Our Story</Link></li>
              <li><Link href="/products" className="transition hover:text-emerald-700">Brand</Link></li>
              <li><Link href="/products" className="transition hover:text-emerald-700">Careers</Link></li>
              <li><Link href="/products" className="transition hover:text-emerald-700">Testimonials</Link></li>
              <li><Link href="/products" className="transition hover:text-emerald-700">Blog</Link></li>
              <li><Link href="/contact" className="transition hover:text-emerald-700">Contact</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-lg font-semibold text-emerald-900">Customer Policies</h4>
            <ul className="mt-4 space-y-2 text-sm text-emerald-900/80">
              <li><Link href="/privacy" className="transition hover:text-emerald-700">Privacy Policy</Link></li>
              <li><Link href="/returns" className="transition hover:text-emerald-700">Return Policy</Link></li>
              <li><Link href="/shipping" className="transition hover:text-emerald-700">Shipping Policy</Link></li>
              <li><Link href="/terms" className="transition hover:text-emerald-700">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-emerald-100 pt-6 text-sm text-emerald-900/70">
          <p>&copy; {new Date().getFullYear()} L3 MODZ. Powered by L3Modz</p>
          <a
            href="https://www.youtube.com/"
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
    </footer>
  );
}

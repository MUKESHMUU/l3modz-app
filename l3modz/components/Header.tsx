"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Menu, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'FOOTREST', path: '/products?category=footrest' },
    { name: 'RADIATOR GUARDS', path: '/products?category=radiator-guards' },
    { name: 'CARRIERS', path: '/products?category=carriers' },
    { name: 'ACCESSORIES', path: '/products?category=accessories' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-brand-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" aria-label="L3 MODZ home" className="block">
              <div className="h-14 w-[200px] overflow-hidden">
                <img
                  src="/black.png"
                  alt="L3 MODZ"
                  className="h-14 w-auto origin-left scale-[1.35] object-left"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/l3modz-logo-dark.svg';
                  }}
                />
              </div>
            </Link>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search all Home"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-brand-border rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg text-sm"
              />
              <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-brand-primary">
                <Search size={18} />
              </button>
            </form>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/contact" className="text-sm font-medium text-brand-primary hover:text-cyan-700 transition">
              Contact Now
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-brand-text">
              <User size={24} />
            </Link>
            <Link href="/cart" className="text-gray-600 hover:text-brand-text relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                0
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <Link href="/cart" className="text-gray-600 relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                0
              </span>
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-brand-text focus:outline-none"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Below Header */}
      <nav className="hidden md:block bg-brand-bg border-b border-brand-border py-2 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center space-x-8">
          {navLinks.map((link) => (
            <Link key={link.name} href={link.path} className="font-semibold text-gray-700 hover:text-brand-primary uppercase tracking-wide">
              {link.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border p-4">
          <form onSubmit={handleSearch} className="mb-4 relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-500">
              <Search size={18} />
            </button>
          </form>
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.path} 
                className="font-medium text-gray-800 hover:text-brand-primary p-2 rounded-md hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Link href="/profile" className="font-medium text-gray-800 hover:text-brand-primary p-2">Profile / Login</Link>
            <Link href="/contact" className="font-medium text-brand-primary p-2">Contact Now</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

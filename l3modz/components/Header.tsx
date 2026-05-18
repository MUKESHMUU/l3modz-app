"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Menu, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      router.push(`/products?search=${encodeURIComponent(query)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
      setIsMobileSearchOpen(false);
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Logo - Responsive width */}
          <div className="flex-shrink-0 flex items-center w-24 sm:w-28 md:w-32">
            <Link href="/" aria-label="L3 MODZ home" className="block w-full">
              <div className="h-12 md:h-14 overflow-hidden flex items-center">
                <img
                  src="/black.png"
                  alt="L3 MODZ"
                  className="h-full w-auto object-contain"
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
                placeholder="Search all products"
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
          <div className="hidden md:flex items-center gap-6">
            <Link href="/contact" className="text-sm font-medium text-brand-primary hover:text-cyan-700 transition">
              Contact Now
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-brand-text transition">
              <User size={24} />
            </Link>
            <Link href="/cart" className="text-gray-600 hover:text-brand-text relative transition">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                0
              </span>
            </Link>
          </div>

          {/* Mobile Actions - Search, Cart, Menu */}
          <div className="md:hidden flex items-center justify-end gap-3 sm:gap-4">
            {/* Mobile Search Icon */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="text-gray-600 hover:text-brand-text focus:outline-none transition flex-shrink-0"
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            {/* Mobile Cart */}
            <Link href="/cart" className="text-gray-600 hover:text-brand-text relative transition flex-shrink-0">
              <ShoppingCart size={20} />
              <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold px-1 py-0.5 rounded-full">
                0
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-brand-text focus:outline-none transition flex-shrink-0"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden border-b border-brand-border px-2 sm:px-4 py-3 bg-brand-bg">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-4 pr-10 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-primary transition">
              <Search size={18} />
            </button>
          </form>
        </div>
      )}

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

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border">
          <nav className="flex flex-col space-y-1 px-2 sm:px-4 py-2">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.path} 
                className="font-medium text-gray-800 hover:text-brand-primary px-3 py-2 rounded-md hover:bg-gray-50 transition"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsMobileSearchOpen(false);
                }}
              >
                {link.name}
              </Link>
            ))}
            <Link href="/profile" className="font-medium text-gray-800 hover:text-brand-primary px-3 py-2 rounded-md hover:bg-gray-50 transition">Profile / Login</Link>
            <Link href="/contact" className="font-medium text-brand-primary px-3 py-2 rounded-md hover:bg-brand-bg transition">Contact Now</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

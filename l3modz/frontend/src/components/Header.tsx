import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Menu, X, User, ChevronDown } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

type SearchSuggestion = {
  _id: string;
  title: string;
  slug?: string;
  images?: string[];
};

const productCategories = [
  { name: 'FOOTREST', path: '/products?category=footrest' },
  { name: 'RADIATOR GUARDS', path: '/products?category=radiator-guards' },
  { name: 'CARRIERS', path: '/products?category=carriers' },
  { name: 'ACCESSORIES', path: '/products?category=accessories' },
];

const mainLinks = [
  { name: 'HOME', path: '/' },
  { name: 'ABOUT US', path: '/about' },
  { name: 'CONTACT US', path: '/contact' },
  { name: 'OUR DEALERS', path: '/dealers' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    setIsMenuOpen(false);
    navigate(`/products/${suggestion.slug || suggestion._id}`);
  };

  const handleSearchAllSelect = () => {
    if (!searchQuery.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setShowSuggestions(false);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = new URL('/api/products', window.location.origin);
        url.searchParams.set('search', q);
        url.searchParams.set('limit', '6');
        const res = await fetch(url.toString());
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProductsOpen(false);
      }

      const inDesktopSearch = !!searchRef.current?.contains(e.target as Node);
      const inMobileSearch = !!mobileSearchRef.current?.contains(e.target as Node);
      if (!inDesktopSearch && !inMobileSearch) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-brand-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" aria-label="L3 MODZ home" className="block">
              <div className="h-14 w-[200px] overflow-hidden">
                <img
                  src="/black.png"
                  alt="L3 MODZ"
                  className="h-14 w-auto origin-left scale-[1.35] object-left"
                  onError={(e) => {
                    e.currentTarget.src = '/l3modz-logo-dark.svg';
                  }}
                />
              </div>
            </Link>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <div className="relative" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search all products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-4 pr-10 py-2 border border-brand-border rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-bg text-sm"
                />
                <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-brand-primary">
                  <Search size={18} />
                </button>
              </form>

              {showSuggestions && searchQuery.trim().length >= 2 && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl border border-brand-border bg-white shadow-lg overflow-hidden z-50">
                  {isSearching ? (
                    <p className="px-4 py-3 text-sm text-gray-500">Searching...</p>
                  ) : suggestions.length > 0 ? (
                    <>
                      {suggestions.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleSuggestionSelect(item)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3"
                        >
                          <img
                            src={item.images?.[0] || 'https://via.placeholder.com/80?text=L3'}
                            alt={item.title}
                            className="h-9 w-9 rounded-md object-cover border border-brand-border"
                          />
                          <span className="text-sm text-brand-text line-clamp-1">{item.title}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleSearchAllSelect}
                        className="w-full border-t border-brand-border px-4 py-2.5 text-left text-sm font-semibold text-brand-primary hover:bg-brand-bg transition"
                      >
                        Search for "{searchQuery.trim()}"
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSearchAllSelect}
                      className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 transition"
                    >
                      No exact matches. Search for "{searchQuery.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="https://wa.me/919843199393" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-primary hover:text-cyan-700 transition">
              Contact Now
            </a>
            <Link to="/profile" className="text-gray-600 hover:text-brand-text">
              <User size={24} />
            </Link>
            <Link to="/cart" className="text-gray-600 hover:text-brand-text relative">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="text-gray-600 relative">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {cartCount}
                </span>
              )}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center space-x-8">

          {/* Products Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="products-menu-btn"
              onClick={() => setIsProductsOpen((prev) => !prev)}
              className="flex items-center gap-1 font-semibold text-gray-700 hover:text-brand-primary uppercase tracking-wide focus:outline-none"
            >
              PRODUCTS
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isProductsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isProductsOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white border border-brand-border rounded-xl shadow-lg overflow-hidden z-50">
                {productCategories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={cat.path}
                    onClick={() => setIsProductsOpen(false)}
                    className="block px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-brand-primary hover:text-white transition-colors uppercase tracking-wide"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Other Nav Links */}
          {mainLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="font-semibold text-gray-700 hover:text-brand-primary uppercase tracking-wide"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border p-4">
          <div className="mb-4 relative" ref={mobileSearchRef}>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-4 pr-10 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-500">
                <Search size={18} />
              </button>
            </form>

            {showSuggestions && searchQuery.trim().length >= 2 && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-xl border border-brand-border bg-white shadow-lg overflow-hidden z-50 max-h-72 overflow-y-auto">
                {isSearching ? (
                  <p className="px-4 py-3 text-sm text-gray-500">Searching...</p>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestions.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => handleSuggestionSelect(item)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition text-sm text-brand-text line-clamp-1"
                      >
                        {item.title}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchAllSelect}
                      className="w-full border-t border-brand-border px-4 py-2.5 text-left text-sm font-semibold text-brand-primary hover:bg-brand-bg transition"
                    >
                      Search for "{searchQuery.trim()}"
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSearchAllSelect}
                    className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    No exact matches. Search for "{searchQuery.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>

          <nav className="flex flex-col space-y-1">
            {/* Products expandable section */}
            <button
              onClick={() => setIsMobileProductsOpen((p) => !p)}
              className="flex items-center justify-between font-semibold text-gray-800 hover:text-brand-primary p-2 rounded-md hover:bg-gray-50 w-full text-left uppercase tracking-wide text-sm"
            >
              PRODUCTS
              <ChevronDown size={16} className={`transition-transform ${isMobileProductsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileProductsOpen && (
              <div className="pl-4 space-y-1 border-l-2 border-brand-primary/30 ml-2">
                {productCategories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={cat.path}
                    className="block font-medium text-gray-600 hover:text-brand-primary p-2 rounded-md hover:bg-gray-50 text-sm uppercase tracking-wide"
                    onClick={() => { setIsMenuOpen(false); setIsMobileProductsOpen(false); }}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            {mainLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="font-semibold text-gray-800 hover:text-brand-primary p-2 rounded-md hover:bg-gray-50 uppercase tracking-wide text-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            <Link to="/profile" className="font-medium text-gray-800 hover:text-brand-primary p-2" onClick={() => setIsMenuOpen(false)}>Profile / Login</Link>
            <a href="https://wa.me/919843199393" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-primary p-2">Contact Now</a>
          </nav>
        </div>
      )}
    </header>
  );
}

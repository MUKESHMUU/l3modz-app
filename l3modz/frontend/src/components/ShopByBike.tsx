import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Bike, Car, X, Search } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface BrandData {
  name: string;
  models: string[];
  years: string[];
}

interface SavedBike {
  brand: string;
  model: string;
  year: string;
}

const GARAGE_KEY = 'l3modz_my_garage';

// Brand accent colours (extend as needed)
const BRAND_COLORS: Record<string, string> = {
  Yamaha: '#003399',
  Honda: '#CC0001',
  KTM: '#FF6600',
  'Royal Enfield': '#7B3F00',
  Bajaj: '#002D62',
  TVS: '#1A1A2E',
  Kawasaki: '#3EBA3E',
  Suzuki: '#1F4099',
  Hero: '#E31E24',
};

// ── Dropdown helper ────────────────────────────────────────────────────────────
function Select({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none bg-white border-2 rounded-xl px-4 py-3 text-sm font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition pr-10 ${
            disabled ? 'opacity-40 cursor-not-allowed border-gray-200' : 'border-brand-border hover:border-brand-primary cursor-pointer'
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ShopByBike() {
  const navigate = useNavigate();

  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [garage, setGarage] = useState<SavedBike | null>(null);

  // Load garage from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GARAGE_KEY);
      if (saved) setGarage(JSON.parse(saved));
    } catch {}
  }, []);

  // Fetch bike data from API
  useEffect(() => {
    async function fetch_() {
      try {
        const res = await apiFetch('/api/bikes');
        if (!res.ok) throw new Error('Failed to load bike data');
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  // Reset model/year when brand changes
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel('');
    setSelectedYear('');
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedYear('');
  };

  const currentBrand = brands.find((b) => b.name === selectedBrand);
  const availableModels = currentBrand?.models ?? [];
  const availableYears = currentBrand?.years ?? [];

  const canSearch = !!selectedBrand;
  const accentColor = BRAND_COLORS[selectedBrand] || '#0891b2';

  const handleSearch = () => {
    if (!canSearch) return;
    const params = new URLSearchParams();
    params.set('brand', selectedBrand);
    if (selectedModel) params.set('model', selectedModel);
    if (selectedYear) params.set('year', selectedYear);

    // Save to My Garage
    const bikeData: SavedBike = {
      brand: selectedBrand,
      model: selectedModel,
      year: selectedYear,
    };
    localStorage.setItem(GARAGE_KEY, JSON.stringify(bikeData));
    setGarage(bikeData);

    navigate(`/products?${params.toString()}`);
  };

  const loadGarage = () => {
    if (!garage) return;
    setSelectedBrand(garage.brand);
    setTimeout(() => {
      setSelectedModel(garage.model);
      setSelectedYear(garage.year);
    }, 50);
  };

  const clearGarage = () => {
    localStorage.removeItem(GARAGE_KEY);
    setGarage(null);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand-border shadow-sm">
      {/* Coloured accent bar at top */}
      <div
        className="h-1.5 w-full transition-colors duration-500"
        style={{ background: accentColor }}
      />

      <div className="bg-white p-6 md:p-10">
        {/* Header row */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl transition-colors duration-500"
              style={{ background: `${accentColor}18` }}
            >
              <Bike size={26} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-brand-text">
                Shop by Bike
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Find accessories that perfectly fit your ride
              </p>
            </div>
          </div>

          {/* My Garage badge */}
          {garage && (
            <div className="flex items-center gap-2 bg-brand-bg border border-brand-border rounded-xl px-4 py-2 text-sm">
              <Car size={15} className="text-brand-primary" />
              <span className="font-semibold text-brand-text">
                {garage.brand} {garage.model} {garage.year}
              </span>
              <button
                onClick={loadGarage}
                className="text-brand-primary hover:underline font-medium ml-1"
                title="Load this bike"
              >
                Load
              </button>
              <button onClick={clearGarage} title="Remove from garage">
                <X size={14} className="text-gray-400 hover:text-red-400 transition" />
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4">
            ⚠ {error} — make sure products have compatibility data.
          </p>
        )}

        {/* Dropdowns + button */}
        <div className="flex flex-wrap items-end gap-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
              <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              Loading bike data...
            </div>
          ) : (
            <>
              <Select
                id="bike-brand"
                label="Brand"
                options={brands.map((b) => b.name)}
                value={selectedBrand}
                onChange={handleBrandChange}
                placeholder="Select Brand"
              />

              <Select
                id="bike-model"
                label="Model"
                options={availableModels}
                value={selectedModel}
                onChange={handleModelChange}
                placeholder={selectedBrand ? 'Select Model' : '— Pick brand first —'}
                disabled={!selectedBrand}
              />

              <Select
                id="bike-year"
                label="Year (optional)"
                options={availableYears}
                value={selectedYear}
                onChange={setSelectedYear}
                placeholder={selectedBrand ? 'Any Year' : '— Pick brand first —'}
                disabled={!selectedBrand}
              />

              <button
                onClick={handleSearch}
                disabled={!canSearch}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-95 shadow-md"
                style={{
                  background: canSearch ? accentColor : '#94a3b8',
                  boxShadow: canSearch ? `0 4px 20px ${accentColor}44` : undefined,
                }}
              >
                <Search size={16} />
                Find Parts
              </button>
            </>
          )}
        </div>

        {/* No data hint */}
        {!loading && brands.length === 0 && !error && (
          <p className="text-sm text-gray-400 mt-4">
            No bike compatibility data yet. Add compatibility entries to products via the admin panel.
          </p>
        )}

        {/* Selected bike preview pill */}
        {selectedBrand && (
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Viewing parts for:</span>
            <span
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full text-white"
              style={{ background: accentColor }}
            >
              <Bike size={13} />
              {selectedBrand}
              {selectedModel && ` ${selectedModel}`}
              {selectedYear && ` (${selectedYear})`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

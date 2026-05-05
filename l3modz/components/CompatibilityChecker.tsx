"use client";
import { useState } from 'react';
import { CheckCircle, AlertCircle, ChevronDown, Bike } from 'lucide-react';

export default function CompatibilityChecker({ compatibilities = [] }: { compatibilities: any[] }) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [result, setResult] = useState<'idle' | 'match' | 'nomatch'>('idle');

  const brands = Array.from(new Set(compatibilities.map(c => c.brand).filter(Boolean)));
  
  // Filter models based on brand
  const models = selectedBrand 
    ? Array.from(new Set(compatibilities.filter(c => c.brand === selectedBrand).map(c => c.model).filter(Boolean)))
    : [];

  const years = selectedModel
    ? Array.from(new Set(compatibilities.filter(c => c.model === selectedModel).map(c => c.year).filter(Boolean)))
    : [];

  const handleCheck = () => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    const match = compatibilities.find(c => 
      c.brand === selectedBrand && 
      c.model === selectedModel && 
      (c.year === selectedYear || c.year === 'All')
    );
    setResult(match ? 'match' : 'nomatch');
  };

  if (!compatibilities || compatibilities.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <Bike size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-brand-text text-sm uppercase tracking-wider">Fitment Check</h3>
            <p className="mt-1 text-sm text-gray-700">Universal fit available. This accessory is compatible with most motorcycles.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text">Fitment Checker</h3>
          <p className="mt-1 text-sm text-gray-500">Select bike details to verify compatibility before adding to cart.</p>
        </div>
        <div className="rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-primary">
          {compatibilities.length} fitment options
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <select 
            value={selectedBrand} 
            onChange={e => { setSelectedBrand(e.target.value); setSelectedModel(''); setSelectedYear(''); setResult('idle'); }}
            className="w-full appearance-none rounded-xl border border-brand-border bg-gray-50 py-3 pl-3 pr-9 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Select Brand</option>
            {brands.map((b: string) => <option key={b} value={b}>{b}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select 
            value={selectedModel} 
            onChange={e => { setSelectedModel(e.target.value); setSelectedYear(''); setResult('idle'); }}
            disabled={!selectedBrand}
            className="w-full appearance-none rounded-xl border border-brand-border bg-gray-50 py-3 pl-3 pr-9 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Model</option>
            {models.map((m: string) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select 
            value={selectedYear} 
            onChange={e => { setSelectedYear(e.target.value); setResult('idle'); }}
            disabled={!selectedModel}
            className="w-full appearance-none rounded-xl border border-brand-border bg-gray-50 py-3 pl-3 pr-9 text-sm font-medium text-gray-700 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Year</option>
            {years.map((y: string) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <button 
        onClick={handleCheck}
        disabled={!selectedYear}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand-text py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        Verify Fit
      </button>

      {result === 'match' && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 animate-in fade-in slide-in-from-top-1">
          <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="text-sm font-medium">
            <p className="font-semibold">Verified fit</p>
            <p className="mt-0.5 text-emerald-700">{selectedBrand} {selectedModel} ({selectedYear})</p>
          </div>
        </div>
      )}

      {result === 'nomatch' && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
          <div className="text-sm font-medium">
            <p className="font-semibold">No exact match found</p>
            <p className="mt-0.5 text-rose-700">This exact fitment isn’t listed. Contact us to confirm compatibility.</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from 'react';

export default function ProductGallery({ images }: { images: string[] }) {
  const safeImages = images && images.length > 0 ? images : ['https://via.placeholder.com/600?text=No+Image'];
  const [mainImg, setMainImg] = useState(safeImages[0]);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPoint, setZoomPoint] = useState({ x: 50, y: 50 });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomPoint({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Product Image - Responsive */}
      <div
        className="group w-full aspect-square sm:aspect-[4/3] bg-gray-100 rounded-2xl border border-brand-border overflow-hidden relative shadow-sm"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Blurred Background */}
        <img
          src={mainImg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35 blur-md transition-transform duration-300 ease-out will-change-transform"
          style={{
            transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`,
            transform: isZoomed ? 'scale(1.35)' : 'scale(1.1)',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-transparent z-10" />
        
        {/* Main Image */}
        <img 
          src={mainImg} 
          alt="Product Main" 
          className={`relative z-20 w-full h-full object-contain transition-transform duration-300 ease-out will-change-transform ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={{
            transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`,
            transform: isZoomed ? 'scale(2.1)' : 'scale(1)',
          }}
          loading="lazy"
        />
      </div>

      {/* Thumbnail Gallery - Mobile Optimized */}
      {safeImages.length > 1 && (
        <div className="w-full">
          <div className="overflow-x-auto pb-2 -mx-2 px-2 scroll-smooth">
            <div className="flex gap-3 min-w-min">
              {safeImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setMainImg(img)}
                  className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    mainImg === img 
                      ? 'border-brand-primary shadow-lg ring-2 ring-brand-primary/30' 
                      : 'border-gray-200 hover:border-brand-border hover:shadow-md'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                  aria-pressed={mainImg === img}
                  type="button"
                >
                  <img 
                    src={img} 
                    alt={`Product thumbnail ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

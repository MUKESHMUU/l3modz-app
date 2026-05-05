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
    <div className="flex flex-col space-y-4">
      <div
        className="group w-full aspect-[3/2] sm:aspect-[16/10] bg-gray-100 rounded-2xl border border-brand-border overflow-hidden relative shadow-sm"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
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
        <img 
          src={mainImg} 
          alt="Product Main" 
          className={`relative z-20 w-full h-full object-contain transition-transform duration-300 ease-out will-change-transform ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={{
            transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`,
            transform: isZoomed ? 'scale(2.1)' : 'scale(1)',
          }}
        />
      </div>
      {safeImages.length > 1 && (
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-max flex justify-center gap-3 sm:gap-4 mx-auto px-1">
          {safeImages.map((img, idx) => (
            <button 
              key={idx}
              onClick={() => setMainImg(img)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${mainImg === img ? 'border-brand-primary shadow-md ring-2 ring-brand-primary/20' : 'border-transparent hover:border-brand-border hover:shadow-sm'}`}
              aria-label={`View image ${idx + 1}`}
            >
              <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

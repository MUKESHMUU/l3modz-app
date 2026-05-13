"use client";
import { useState } from 'react';

export default function ProductGallery({ images }: { images: string[] }) {
  const safeImages = images && images.length > 0 ? images : ['https://via.placeholder.com/600?text=No+Image'];
  const [mainImg, setMainImg] = useState(safeImages[0]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Product Image */}
      <div className="w-full bg-white rounded-2xl border border-brand-border overflow-hidden relative">
        <div className="aspect-square sm:aspect-[4/3] w-full">
          <img 
            src={mainImg} 
            alt="Product Main" 
            className="w-full h-full object-contain cursor-zoom-in"
            loading="lazy"
          />
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {safeImages.length > 1 && (
        <div className="w-full">
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
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

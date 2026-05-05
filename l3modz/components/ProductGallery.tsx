"use client";
import { useState } from 'react';

export default function ProductGallery({ images }: { images: string[] }) {
  const safeImages = images && images.length > 0 ? images : ['https://via.placeholder.com/600?text=No+Image'];
  const [mainImg, setMainImg] = useState(safeImages[0]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="w-full aspect-square bg-white rounded-2xl border border-brand-border overflow-hidden relative">
        <img 
          src={mainImg} 
          alt="Product Main" 
          className="w-full h-full object-contain cursor-zoom-in"
        />
      </div>
      {safeImages.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {safeImages.map((img, idx) => (
            <button 
              key={idx}
              onClick={() => setMainImg(img)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${mainImg === img ? 'border-brand-primary shadow-md' : 'border-transparent hover:border-brand-border'}`}
            >
              <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

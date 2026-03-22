'use client';

import React, { useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { Coffee, Utensils, Scissors, Store, BookOpen, Shirt, Pill, Home } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const CATEGORIES: Category[] = [
  { id: 'cafe', name: '카페', icon: <Coffee /> },
  { id: 'restaurant', name: '음식점', icon: <Utensils /> },
  { id: 'salon', name: '미용실', icon: <Scissors /> },
  { id: 'convenience', name: '편의점', icon: <Store /> },
  { id: 'academy', name: '학원', icon: <BookOpen /> },
  { id: 'laundry', name: '세탁소', icon: <Shirt /> },
  { id: 'pharmacy', name: '약국', icon: <Pill /> },
  { id: 'realestate', name: '부동산', icon: <Home /> },
];

interface CategorySwiperProps {
  onSelect: (id: string) => void;
}

export function CategorySwiper({ onSelect }: CategorySwiperProps) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: 'trimSnaps'
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  return (
    <div className="w-full overflow-hidden" ref={emblaRef}>
      <div className="flex gap-4 px-2 py-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={cn(
              "flex flex-col items-center justify-center flex-[0_0_90px] h-[110px] rounded-2xl border-2 transition-all cursor-pointer",
              selectedId === cat.id 
                ? "border-trust-blue bg-trust-blue/10 text-trust-blue shadow-md scale-105" 
                : "border-border bg-card text-foreground hover:bg-accent hover:border-accent"
            )}
          >
            <div className={cn(
              "mb-3 h-10 w-10 flex items-center justify-center transition-colors",
              selectedId === cat.id ? "text-trust-blue" : "text-muted-foreground"
            )}>
              {React.cloneElement(cat.icon as React.ReactElement<{className?: string}>, { className: 'h-full w-full' })}
            </div>
            <span className="text-base font-bold">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

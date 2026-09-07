"use client";

import { useRef, useState, type ReactNode } from "react";

interface HeroSlide {
  key: string;
  // Background tint class for this slide only (status/spotlight/nudge in
  // the mockup) — kept per-slide since each of the three hero slides has
  // its own accent color.
  className: string;
  content: ReactNode;
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

// Horizontal swipe/scroll-snap slider (CSS-only snapping, no JS carousel
// library needed) with dot indicators synced to scroll position — the same
// approach the mockup's own vanilla-JS prototype used.
export function HeroSlider({ slides }: HeroSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(index);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
      >
        {slides.map((slide) => (
          <div
            key={slide.key}
            className={`flex min-h-[132px] w-full shrink-0 snap-start items-center gap-4 p-5 ${slide.className}`}
          >
            {slide.content}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 bg-surface py-2.5">
        {slides.map((slide, i) => (
          <span
            key={slide.key}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

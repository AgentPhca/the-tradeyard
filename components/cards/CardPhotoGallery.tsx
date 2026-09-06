"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface CardPhotoGalleryProps {
  images: string[];
  alt: string;
}

// The Card Detail page's photo area — a single photo (as before) when
// there's only one, or a native-scroll-snap swipe gallery with arrow
// buttons and dot indicators once a card has more than one. Rendered
// directly inside the page's existing `relative overflow-hidden` frame
// (not its own wrapper), so its absolutely-positioned controls anchor to
// that frame the same way the status badge already does.
export function CardPhotoGallery({ images, alt }: CardPhotoGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ImageOff className="h-10 w-10 text-muted" />
      </div>
    );
  }

  function scrollToIndex(target: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(images.length - 1, target));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  return (
    <>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
      >
        {images.map((url, i) => (
          <div key={url + i} className="relative h-full w-full shrink-0 snap-start snap-always">
            <Image
              src={url}
              alt={`${alt} — photo ${i + 1} of ${images.length}`}
              fill
              sizes="(min-width: 1024px) 384px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-text backdrop-blur transition-colors hover:bg-background disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === images.length - 1}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-text backdrop-blur transition-colors hover:bg-background disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? "bg-primary" : "bg-text/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

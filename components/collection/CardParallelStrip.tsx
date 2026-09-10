"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { ParallelFrameColor } from "@/lib/utils/parallelFrameColor";
import type { CardParallel } from "@/lib/collection/getCardParallels";

interface CardParallelStripProps {
  parallels: CardParallel[];
  ownedCount: number;
}

// Below this count, the chips wrap instead of sitting in a horizontally
// scrollable row — a 1-2 chip row inside a scroll track reads as an odd,
// mostly-empty gap; wrapped, the same few chips just sit compact side by
// side (or across two short rows on a narrow screen), which is what this
// section is meant to look like at that size. This is an approximation
// (actual pixel width also depends on rendered name length) — the arrow
// visibility below is the accurate, measured check, not this count.
const WRAP_LAYOUT_MAX_COUNT = 4;

function printRunLabel(printRun: number | null): string {
  if (printRun == null) return "unnum.";
  if (printRun === 1) return "1/1";
  return `/${printRun}`;
}

// A flat solid/gradient color swatch derived the same way the Card Detail
// photo frame is (getParallelFrameColor) — just the color stop(s) alone,
// without that frame's darker second stop, since a small 8px bar reads
// better as a plain color chip than a mini frame gradient.
function swatchBackground(color: ParallelFrameColor): string {
  if (color.type === "solid") return color.c1;
  return `linear-gradient(90deg, ${color.colors.join(", ")})`;
}

// "Deine Parallels dieser Karte" — a strip of every other known version
// of this exact physical card (see getCardParallels), with the viewer's
// own ownership status per chip. Hidden entirely by the caller when
// getCardParallels finds no real parallels (a single-version card).
// Below WRAP_LAYOUT_MAX_COUNT chips wrap compactly instead of scrolling;
// above it, the row scrolls horizontally and gets arrow buttons on mobile
// (<640px, no trackpad/mouse-wheel there) — but only once it's actually
// measured to overflow at the current viewport width, so a handful of
// chips that happen to fit on a wide screen don't get pointless arrows.
export function CardParallelStrip({ parallels, ownedCount }: CardParallelStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const wrapLayout = parallels.length <= WRAP_LAYOUT_MAX_COUNT;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || wrapLayout) {
      setHasOverflow(false);
      return;
    }

    const checkOverflow = () => setHasOverflow(el.scrollWidth > el.clientWidth);
    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [wrapLayout, parallels.length]);

  if (parallels.length === 0) return null;

  // The single rarest still-unowned tier gets a "+ Wishlist" shortcut
  // instead of a lock — parallels is already sorted rarest-last, so
  // that's the last unowned entry in the list.
  const rarestUnownedId = [...parallels].reverse().find((p) => !p.owned)?.catalogId;

  const showArrows = !wrapLayout && hasOverflow;

  function scroll(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

  return (
    <div className="mt-10 border-t border-[#21262D] pt-8">
      <div className="mb-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-text">
            Deine <span className="text-[#E8B94A]">Parallels</span> dieser Karte
          </h2>
          <span className="whitespace-nowrap text-[11.5px] text-muted">
            {ownedCount} / {parallels.length} besessen
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted">Parallels aus dem Set</p>
      </div>

      <div className="relative">
        {showArrows && (
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Nach links scrollen"
            className="absolute -left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text sm:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className={
            wrapLayout ? "flex flex-wrap gap-2" : "flex gap-2 overflow-x-auto pb-1 no-scrollbar"
          }
        >
          {parallels.map((p) => {
            const chipClassName = `w-[104px] shrink-0 rounded-lg border p-2.5 ${
              p.owned ? "border-primary bg-primary/[0.06]" : "border-border bg-card"
            }`;

            const chipBody = (
              <>
                <div
                  className="mb-2 h-2 w-full rounded"
                  style={{ background: swatchBackground(p.color) }}
                />
                <p
                  className={`text-[11px] font-semibold leading-tight ${
                    p.owned ? "text-text" : "text-muted"
                  }`}
                  title={p.name}
                >
                  {p.name}
                </p>
                <p className="mt-0.5 text-[9.5px] text-muted">{printRunLabel(p.printRun)}</p>
                <div className="mt-1.5">
                  {p.owned ? (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#14532D] text-primary">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : p.catalogId === rarestUnownedId ? (
                    <Link
                      href="/wishlist"
                      className="text-[9px] font-bold text-[#E8B94A] hover:underline"
                    >
                      + Wishlist
                    </Link>
                  ) : (
                    <Lock className="h-2.5 w-2.5 text-border" />
                  )}
                </div>
              </>
            );

            if (p.owned && p.ownedCardId) {
              return (
                <Link
                  key={p.catalogId}
                  href={`/collection/${p.ownedCardId}`}
                  className={`${chipClassName} block transition-colors hover:border-primary/70`}
                >
                  {chipBody}
                </Link>
              );
            }

            return (
              <div key={p.catalogId} className={chipClassName}>
                {chipBody}
              </div>
            );
          })}
        </div>

        {showArrows && (
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Nach rechts scrollen"
            className="absolute -right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text sm:hidden"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

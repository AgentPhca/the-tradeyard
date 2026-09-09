"use client";

import { useRef } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { ParallelFrameColor } from "@/lib/utils/parallelFrameColor";
import type { CardParallel } from "@/lib/collection/getCardParallels";

interface CardParallelStripProps {
  parallels: CardParallel[];
  ownedCount: number;
}

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

// "Deine Parallels dieser Karte" — a horizontal strip of every other known
// version of this exact physical card (see getCardParallels), with the
// viewer's own ownership status per chip. Hidden entirely by the caller
// when getCardParallels finds no real parallels (a single-version card).
// Mobile (<640px) gets arrow buttons to scroll the strip since a trackpad/
// mouse-wheel scroll isn't available there; desktop relies on normal
// scroll/trackpad, same as the app's other horizontal card rows.
export function CardParallelStrip({ parallels, ownedCount }: CardParallelStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (parallels.length === 0) return null;

  // The single rarest still-unowned tier gets a "+ Wishlist" shortcut
  // instead of a lock — parallels is already sorted rarest-last, so
  // that's the last unowned entry in the list.
  const rarestUnownedId = [...parallels].reverse().find((p) => !p.owned)?.catalogId;

  function scroll(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

  return (
    <div className="mt-10 border-t border-[#21262D] pt-8">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-text">
          Deine <span className="text-[#E8B94A]">Parallels</span> dieser Karte
        </h2>
        <span className="whitespace-nowrap text-[11.5px] text-muted">
          {ownedCount} / {parallels.length} besessen
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Nach links scrollen"
          className="absolute -left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {parallels.map((p) => (
            <div
              key={p.catalogId}
              className={`w-[104px] shrink-0 rounded-lg border p-2.5 ${
                p.owned ? "border-primary bg-primary/[0.06]" : "border-border bg-card"
              }`}
            >
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
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Nach rechts scrollen"
          className="absolute -right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text sm:hidden"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

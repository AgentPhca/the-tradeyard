import { Layers, Store, Users } from "lucide-react";
import type { PlatformPulse } from "@/lib/dashboard/getPlatformPulse";

interface PlatformPulseTilesProps {
  pulse: PlatformPulse;
}

// Site-wide counters — 3-column grid on mobile, a single stacked column of
// left-aligned rows on desktop (matches the mockup's own layout switch at
// >=900px, which isn't one of Tailwind's default breakpoints).
export function PlatformPulseTiles({ pulse }: PlatformPulseTilesProps) {
  const tiles = [
    { icon: Store, value: pulse.cardsForTrade, label: "Karten im Marktplatz" },
    { icon: Users, value: pulse.collectors, label: "Sammler auf dem Yard" },
    { icon: Layers, value: pulse.cardsInCollections, label: "Karten in Sammlungen" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 min-[900px]:grid-cols-1 min-[900px]:gap-3">
      {tiles.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className="rounded-lg border border-border bg-card p-3 text-center min-[900px]:flex min-[900px]:items-center min-[900px]:gap-3 min-[900px]:p-3 min-[900px]:text-left"
        >
          <span className="mx-auto mb-2 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-[#14532D] text-primary min-[900px]:mx-0 min-[900px]:mb-0">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-text">{value.toLocaleString("de-DE")}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

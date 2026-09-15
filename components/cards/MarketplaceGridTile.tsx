import Image from "next/image";
import Link from "next/link";
import { Hash, ImageOff, PenLine, Shirt } from "lucide-react";

interface MarketplaceGridTileProps {
  href: string;
  imageUrl: string | null;
  playerName: string;
  team: string | null;
  printRun: number | null;
  isAutograph: boolean;
  isRelic: boolean;
}

// The Marketplace "For Trade" grid's compact view — deliberately shows less
// than TradingCard (no Set/Insert Set/Parallel, no seller info, no Kontakt
// button): just enough to recognize the card and tap through to it, so two
// columns fit on a phone screen instead of one. Attribute badges follow the
// same "only show what applies" convention as CollectionCardTile's — see
// that component for why (an AttrIcon-style always-three-icons strip would
// be wrong here).
export function MarketplaceGridTile({
  href,
  imageUrl,
  playerName,
  team,
  printRun,
  isAutograph,
  isRelic,
}: MarketplaceGridTileProps) {
  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[5/7] w-full bg-surface">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${playerName} card`}
            fill
            // Narrowest column width at each breakpoint this tile's grid
            // (grid-cols-2/3/4, see MarketplaceCardGrid) actually renders
            // at, same fixed-tier convention as ChecklistAlbum's tiles.
            sizes="(min-width: 1024px) 260px, (min-width: 640px) 190px, 160px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-muted" />
          </div>
        )}
        {(printRun != null || isAutograph || isRelic) && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            {printRun != null && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3A2E12] text-[#E8B94A]"
                title={`Numbered /${printRun}`}
              >
                <Hash className="h-2.5 w-2.5" />
              </span>
            )}
            {isAutograph && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3A2E12] text-[#E8B94A]"
                title="Autographed"
              >
                <PenLine className="h-2.5 w-2.5" />
              </span>
            )}
            {isRelic && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3A2E12] text-[#E8B94A]"
                title="Relic / patch"
              >
                <Shirt className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-medium text-text" title={playerName}>
          {playerName}
        </p>
        {team && (
          <p className="truncate text-[11px] text-muted" title={team}>
            {team}
          </p>
        )}
      </div>
    </Link>
  );
}

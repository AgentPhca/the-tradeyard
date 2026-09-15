import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

interface MarketplaceListRowProps {
  href: string;
  imageUrl: string | null;
  playerName: string;
  cardNumber: string | null;
  team: string | null;
  insertSetLabel: string | null;
  parallel: string | null;
  setName: string | null;
}

// The Marketplace "For Trade" list's eBay-style row: a small thumbnail
// beside stacked text, one card per row — denser than TradingCard's full
// tile, but keeps the fields TradingCard shows in its body (unlike the
// compact grid tile, which deliberately drops Set/Insert Set/Parallel to
// stay minimal). Text sizes/colors mirror TradingCard's own choices for
// each field so switching views doesn't change what looks primary vs.
// secondary.
export function MarketplaceListRow({
  href,
  imageUrl,
  playerName,
  cardNumber,
  team,
  insertSetLabel,
  parallel,
  setName,
}: MarketplaceListRowProps) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/40"
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-surface sm:h-24 sm:w-[70px]">
        {imageUrl ? (
          <Image src={imageUrl} alt={`${playerName} card`} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-5 w-5 text-muted" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-0.5 py-1">
        <p className="truncate font-semibold text-text" title={playerName}>
          {playerName}
          {cardNumber && <span className="ml-1.5 font-normal text-muted">#{cardNumber}</span>}
        </p>
        {team && (
          <p className="truncate text-sm text-muted" title={team}>
            {team}
          </p>
        )}
        {insertSetLabel && (
          <p className="truncate text-xs text-muted" title={insertSetLabel}>
            {insertSetLabel}
          </p>
        )}
        {parallel && (
          <p className="truncate text-xs text-muted" title={parallel}>
            {parallel}
          </p>
        )}
        {setName && (
          <p className="truncate text-xs text-text" title={setName}>
            {setName}
          </p>
        )}
      </div>
    </Link>
  );
}

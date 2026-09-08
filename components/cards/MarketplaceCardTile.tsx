import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cardValueTagClasses } from "@/lib/utils/cardValue";

interface MarketplaceCardTileProps {
  href: string;
  imageUrl: string | null;
  playerName: string;
  team: string | null;
  valueTag: string;
  valueTier: number;
  sellerUsername: string;
  sellerAvatarUrl: string | null;
  // Dashboard "Für dich" feed: a card not yet in the viewer's own
  // collection gets a distinct "NEU" badge instead of the usual "For
  // Trade" one — same listing, different reason to notice it.
  isNew?: boolean;
}

// Tile for the "Marketplace" row on the Card Detail page — for_trade cards
// from OTHER users. Deliberately bigger and busier than the compact
// "In Your Collection" tile: a bright FOR TRADE badge and the offering
// user's avatar/handle make clear this is a real, contactable listing, not
// a private-collection cross-link.
export function MarketplaceCardTile({
  href,
  imageUrl,
  playerName,
  team,
  valueTag,
  valueTier,
  sellerUsername,
  sellerAvatarUrl,
  isNew = false,
}: MarketplaceCardTileProps) {
  return (
    <div className="flex h-[205px] w-32 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <Link href={href} className="block">
        <div className="relative h-20 w-full bg-surface">
          {imageUrl ? (
            <Image src={imageUrl} alt={playerName} fill sizes="128px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-6 w-6 text-muted" />
            </div>
          )}
          {isNew ? (
            <span className="absolute right-1 top-1 rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
              Neu
            </span>
          ) : (
            <span className="absolute right-1 top-1 rounded-full bg-[#22C55E] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#0D1117]">
              For Trade
            </span>
          )}
        </div>
        <div className="px-2 pt-1.5">
          <p className="line-clamp-2 text-xs font-medium leading-tight text-text" title={playerName}>
            {playerName}
          </p>
          {team && (
            <p className="line-clamp-1 text-[10px] leading-tight text-muted" title={team}>
              {team}
            </p>
          )}
          <span
            className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${cardValueTagClasses(valueTier)}`}
          >
            {valueTag}
          </span>
        </div>
      </Link>
      <Link
        href={`/profile/${sellerUsername}`}
        className="mt-1.5 flex items-center gap-1.5 border-t border-border px-2 py-1.5 transition-colors hover:bg-surface"
      >
        <Avatar src={sellerAvatarUrl} alt={sellerUsername} size={16} />
        <span className="truncate text-[10px] text-muted" title={`@${sellerUsername}`}>
          @{sellerUsername}
        </span>
      </Link>
    </div>
  );
}

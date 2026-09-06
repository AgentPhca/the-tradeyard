import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { deriveCardType, CARD_TYPE_BADGE_CLASSES, CARD_TYPE_BORDER_CLASSES } from "@/lib/utils/cardType";

interface CollectionCardTileProps {
  href: string;
  imageUrl: string | null;
  playerName: string;
  team: string | null;
  setName: string | null;
  category: string | null;
  parallel: string | null;
}

// Small tile for the "In Your Collection" row on the Card Detail page —
// other versions the same owner has of this player. Deliberately plain and
// compact (small photo, type-coded border/badge) so it reads as "your
// stuff", distinct from the Marketplace row's larger, seller-branded tile.
export function CollectionCardTile({
  href,
  imageUrl,
  playerName,
  team,
  setName,
  category,
  parallel,
}: CollectionCardTileProps) {
  const type = deriveCardType({ category, parallel });
  const subtitle = [team, setName].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className={`flex w-24 shrink-0 flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/40 ${CARD_TYPE_BORDER_CLASSES[type]}`}
    >
      <div className="relative h-16 w-full bg-surface">
        {imageUrl ? (
          <Image src={imageUrl} alt={playerName} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-5 w-5 text-muted" />
          </div>
        )}
        <span
          className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[8px] font-medium ${CARD_TYPE_BADGE_CLASSES[type]}`}
        >
          {type}
        </span>
      </div>
      <div className="px-2 py-1.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-text" title={playerName}>
          {playerName}
        </p>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

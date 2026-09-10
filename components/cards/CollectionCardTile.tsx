import Image from "next/image";
import Link from "next/link";
import { Hash, ImageOff, PenLine, Shirt } from "lucide-react";
import { deriveCardType, typeLabel, CARD_TYPE_BORDER_CLASSES } from "@/lib/utils/cardType";

interface CollectionCardTileProps {
  href: string;
  imageUrl: string | null;
  playerName: string;
  category: string | null;
  is_variation_of_base: boolean;
  insert_set: string | null;
  parallel: string | null;
  print_run: number | null;
  is_autograph: boolean;
  is_relic: boolean;
}

// Small tile for the "In Your Collection" row on the Card Detail page —
// other versions the same owner has of this player. Deliberately plain and
// compact (small photo, type-coded border) so it reads as "your stuff",
// distinct from the Marketplace row's larger, seller-branded tile.
// Subtitle shows the card's specific type (Refractor/Insert set name/Base)
// instead of Team/Set — most cards in one player's collection share the
// same team, and Set almost always got truncated at this tile width anyway.
export function CollectionCardTile({
  href,
  imageUrl,
  playerName,
  category,
  is_variation_of_base,
  insert_set,
  parallel,
  print_run,
  is_autograph,
  is_relic,
}: CollectionCardTileProps) {
  const type = deriveCardType({ category, is_variation_of_base, insert_set, parallel });
  const subtitle = typeLabel({ category, is_variation_of_base, insert_set, parallel, print_run });

  return (
    <Link
      href={href}
      className={`flex w-24 shrink-0 flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/40 ${CARD_TYPE_BORDER_CLASSES[type]}`}
    >
      <div className="relative h-28 w-full bg-surface">
        {imageUrl ? (
          <Image src={imageUrl} alt={playerName} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-5 w-5 text-muted" />
          </div>
        )}
        {/* Unlike the Card Detail page's own AttrIcon strip, which always shows
            all three (active golden, inactive grayed) by design, tiles follow
            the same convention as the Grid/Sticker Album/Marketplace: only
            show attributes that apply, omit the rest entirely. */}
        {(print_run != null || is_autograph || is_relic) && (
          <div className="absolute bottom-1 left-1 flex gap-1">
            {print_run != null && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3A2E12] text-[#E8B94A]"
                title={`Numbered /${print_run}`}
              >
                <Hash className="h-2.5 w-2.5" />
              </span>
            )}
            {is_autograph && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3A2E12] text-[#E8B94A]"
                title="Autographed"
              >
                <PenLine className="h-2.5 w-2.5" />
              </span>
            )}
            {is_relic && (
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

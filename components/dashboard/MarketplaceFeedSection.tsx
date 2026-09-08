import Link from "next/link";
import { Store } from "lucide-react";
import { MarketplaceCardTile } from "@/components/cards/MarketplaceCardTile";
import { coverPhoto } from "@/lib/utils/cardPhotos";
import { cardValueTag, cardValueTier } from "@/lib/utils/cardValue";
import type { MarketplaceFeedResult } from "@/lib/dashboard/getMarketplaceFeed";

interface MarketplaceFeedSectionProps {
  feed: MarketplaceFeedResult;
}

// The Dashboard's personalized marketplace feed — falls from a team-scoped
// carousel down to a generic "latest listings" one down to an empty-state
// CTA, depending on what getMarketplaceFeed found (see that file's own
// fallback-chain comment).
export function MarketplaceFeedSection({ feed }: MarketplaceFeedSectionProps) {
  if (feed.mode === "empty") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-3.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-[#1e3a8a]/30 text-[#60A5FA]">
          <Store className="h-[15px] w-[15px]" />
        </span>
        <p className="text-xs leading-tight text-muted">
          Noch keine Karten im Marktplatz. Sei einer der Ersten auf dem Yard.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div className="whitespace-nowrap text-base font-bold text-text">
          {feed.mode === "team" ? (
            <>
              Für die <span>{feed.teamName}</span>
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-[#E8B94A]/40 bg-[#3A2E12] px-2 py-0.5 align-middle text-[10.5px] font-bold text-[#E8B94A]">
                ★ Dein Team
              </span>
            </>
          ) : (
            "Neu im Marktplatz"
          )}
        </div>
        <Link href="/marketplace" className="whitespace-nowrap text-[12.5px] font-semibold text-primary">
          Alle ansehen
        </Link>
      </div>
      {feed.mode === "team" && (
        <p className="mb-3 text-xs text-muted">Neu im Marktplatz · noch nicht in deiner Sammlung</p>
      )}
      {/*
        Mobile stays a touch-swipeable horizontal scroller. Desktop has no
        drag-to-scroll affordance, so a partially-cut-off tile at the right
        edge reads as a layout bug rather than "more to scroll to" — capped
        to at most 5 tiles' width (5 * 128px tiles + 4 * 10px gaps = 680px,
        see MarketplaceCardTile's w-32) AND wrapped + height-clipped to
        exactly one row (MarketplaceCardTile's fixed h-[205px]) instead of
        left scrollable. The two together guarantee only whole tiles are
        ever visible: max-width caps how many COULD fit (never more than
        5), and the wrap+clip means whatever fewer number actually fits at
        a given column width (e.g. the ~900-1075px band, where the 2.1fr
        column is narrower than 680px) wraps its remainder to a hidden
        second row instead of slicing the last tile in half. Sets with 5 or
        fewer items are unaffected either way; the "Alle ansehen" link
        above still reaches every other item.
      */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar min-[900px]:max-w-[680px] min-[900px]:flex-wrap min-[900px]:content-start min-[900px]:overflow-hidden min-[900px]:pb-0 min-[900px]:max-h-[205px]">
        {feed.items.map((item) => {
          const tier = cardValueTier(item.card);
          return (
            <MarketplaceCardTile
              key={item.card.id}
              href={`/collection/${item.card.id}`}
              imageUrl={coverPhoto(item.card)}
              playerName={item.card.player_name}
              team={item.card.team}
              valueTag={cardValueTag(item.card)}
              valueTier={tier}
              sellerUsername={item.ownerUsername}
              sellerAvatarUrl={item.ownerAvatarUrl}
              isNew={feed.mode === "team" && item.isNew}
            />
          );
        })}
      </div>
    </div>
  );
}

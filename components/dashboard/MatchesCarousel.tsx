import Image from "next/image";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { coverPhoto } from "@/lib/utils/cardPhotos";
import { titleCase } from "@/lib/utils/text";
import type { MatchesResult } from "@/lib/dashboard/getMatches";

interface MatchesCarouselProps {
  matches: MatchesResult;
}

function cardLabel(card: { parallel: string | null; insert_set: string | null; card_number: string | null }): string {
  const name = card.parallel ?? (card.insert_set ? titleCase(card.insert_set) : "Base");
  return card.card_number ? `${name} #${card.card_number}` : name;
}

// "Matches für dich" — hidden entirely when the viewer has no for_trade
// cards and no wishlist entries (the feature isn't relevant to them yet),
// a narrow one-line hint when they have some but 0 current matches, and
// the real carousel otherwise. See getMatches.ts for the matching rules.
export function MatchesCarousel({ matches }: MatchesCarouselProps) {
  if (!matches.hasOwnActivity) return null;

  return (
    <div className="rounded-xl border border-[#E8B94A]/35 bg-gradient-to-b from-[#E8B94A]/[0.06] to-transparent p-4">
      <div className="mb-0.5 flex items-center gap-2">
        <Repeat className="h-[18px] w-[18px] text-[#E8B94A]" />
        <span className="text-base font-bold text-text">Matches für dich</span>
      </div>
      <p className="mb-3 text-xs text-muted">Karten, die zu deiner Sammlung und Wishlist passen</p>

      {matches.items.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-card p-2.5">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-[#3A2E12] text-[#E8B94A]">
            <Repeat className="h-[15px] w-[15px]" />
          </span>
          <p className="text-xs leading-tight text-muted">
            Noch keine Matches. Deine Karten sind sichtbar, sobald jemand danach sucht.
          </p>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {matches.items.map((item) => (
            <Link
              key={item.id}
              href={`/collection/${item.card.id}`}
              className="flex w-[220px] shrink-0 items-center gap-2.5 rounded-lg border border-border bg-card p-3 transition-colors hover:border-[#E8B94A]/50"
            >
              <div className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                {coverPhoto(item.card) && (
                  <Image src={coverPhoto(item.card)!} alt="" fill sizes="38px" className="object-cover" />
                )}
              </div>
              <p className="min-w-0 flex-1 text-[12.5px] leading-snug">
                <span className="font-semibold text-text">@{item.otherUsername}</span>{" "}
                <span className="text-muted">
                  {item.type === "wanted"
                    ? `sucht deine ${item.card.player_name} ${cardLabel(item.card)}`
                    : "bietet eine Karte von deiner Wishlist an"}
                </span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

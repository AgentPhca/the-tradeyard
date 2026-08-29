import Image from "next/image";
import { ImageOff, MessageCircle, PenLine, Shirt } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { titleCase } from "@/lib/utils/text";
import type { Card as CardData } from "@/lib/types/database";

interface TradingCardProps {
  card: CardData;
}

export function TradingCard({ card }: TradingCardProps) {
  const forTrade = card.status === "for_trade";
  const serial =
    card.serial_number && card.print_run
      ? `${card.serial_number}/${card.print_run}`
      : card.serial_number ?? (card.print_run ? `/${card.print_run}` : null);
  const insertSetLabel = card.insert_set ? titleCase(card.insert_set) : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="relative aspect-[5/7] w-full bg-surface">
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={`${card.player_name} card`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge variant={forTrade ? "primary" : "default"}>
            {forTrade ? "For Trade" : "Personal Collection"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-text">{card.player_name}</h3>
          {(card.is_autograph || card.is_relic) && (
            <span className="flex shrink-0 gap-1">
              {card.is_autograph && (
                <span title="Autographed" className="text-primary">
                  <PenLine className="h-4 w-4" />
                </span>
              )}
              {card.is_relic && (
                <span title="Relic / patch" className="text-primary">
                  <Shirt className="h-4 w-4" />
                </span>
              )}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted">
          {[card.team, card.set_name].filter(Boolean).join(" · ") || " "}
        </p>
        {insertSetLabel && <p className="truncate text-xs text-muted">{insertSetLabel}</p>}
        {(card.parallel || serial) && (
          <p className="truncate text-xs text-muted">
            {[card.parallel, serial].filter(Boolean).join(" · ")}
          </p>
        )}
        {card.condition && (
          <p className="text-xs text-muted">Condition: {card.condition}</p>
        )}

        {forTrade && (
          <button
            type="button"
            className="btn-primary mt-3 w-full"
          >
            <MessageCircle className="h-4 w-4" />
            Kontakt
          </button>
        )}
      </div>
    </div>
  );
}

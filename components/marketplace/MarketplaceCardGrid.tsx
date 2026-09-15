"use client";

import { useEffect, useState } from "react";
import { Grid3x3, LayoutGrid, List } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { MarketplaceGridTile } from "@/components/cards/MarketplaceGridTile";
import { MarketplaceListRow } from "@/components/cards/MarketplaceListRow";
import { coverPhoto } from "@/lib/utils/cardPhotos";
import { titleCase } from "@/lib/utils/text";
import type { Card } from "@/lib/types/database";

type ViewMode = "large" | "compact" | "list";

const VIEW_MODE_STORAGE_KEY = "tradeyard:marketplaceViewMode";

function isViewMode(value: string | null): value is ViewMode {
  return value === "large" || value === "compact" || value === "list";
}

export interface MarketplaceCardGridItem {
  card: Card;
  isOwner: boolean;
  showSaveButton: boolean;
  isSaved: boolean;
  ownerUsername?: string;
  ownerAvatarUrl?: string | null;
  ownerAllowsContact: boolean;
}

interface MarketplaceCardGridProps {
  items: MarketplaceCardGridItem[];
}

// Three view modes for the Marketplace "For Trade" list, switchable and
// remembered per device. Deliberately scoped to this list only — the
// "Looking For" tab's wishlist entries aren't physical cards with a photo
// in the same sense, so this same three-view split doesn't map onto them.
export function MarketplaceCardGrid({ items }: MarketplaceCardGridProps) {
  // Starts at the documented default (compact) for both the server-rendered
  // markup and the client's first paint — localStorage isn't available
  // during server rendering, and reading it eagerly here would mismatch
  // that initial markup. Swaps to whatever's saved right after mount
  // instead; a one-tick flip on first load is an acceptable trade-off for
  // "remembered per device, no new backend needed" per the ticket.
  const [viewMode, setViewModeState] = useState<ViewMode>("compact");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (isViewMode(stored)) setViewModeState(stored);
    } catch {
      // localStorage can throw (private browsing, disabled site data) —
      // the view just stays at the default in that case.
    }
  }, []);

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Best-effort persistence only — a failed write just means the
      // choice won't survive a reload, not a broken UI.
    }
  }

  const modes: { mode: ViewMode; label: string; Icon: typeof LayoutGrid }[] = [
    { mode: "large", label: "Large cards", Icon: LayoutGrid },
    { mode: "compact", label: "Compact grid", Icon: Grid3x3 },
    { mode: "list", label: "List view", Icon: List },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end gap-1">
        {modes.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            title={label}
            aria-pressed={viewMode === mode}
            className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
              viewMode === mode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {viewMode === "large" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(({ card, ...tradingCardProps }) => (
            <TradingCard key={card.id} card={card} {...tradingCardProps} />
          ))}
        </div>
      )}

      {viewMode === "compact" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ card }) => (
            <MarketplaceGridTile
              key={card.id}
              href={`/collection/${card.id}`}
              imageUrl={coverPhoto(card)}
              playerName={card.player_name}
              team={card.team}
              printRun={card.print_run}
              isAutograph={card.is_autograph}
              isRelic={card.is_relic}
            />
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="flex flex-col gap-2">
          {items.map(({ card }) => (
            <MarketplaceListRow
              key={card.id}
              href={`/collection/${card.id}`}
              imageUrl={coverPhoto(card)}
              playerName={card.player_name}
              cardNumber={card.card_number}
              team={card.team}
              insertSetLabel={card.insert_set ? titleCase(card.insert_set) : null}
              parallel={card.parallel}
              setName={card.set_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

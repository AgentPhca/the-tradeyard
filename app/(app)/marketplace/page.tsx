import { Store } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types/database";

export default async function MarketplacePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "for_trade")
    .order("created_at", { ascending: false });

  const cards: Card[] = data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Marketplace</h1>
        <p className="mt-1 text-sm text-muted">
          Cards the community has put up for trade &mdash; no prices, just deals.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
          <Store className="h-8 w-8 text-muted" />
          <p className="mt-4 text-sm text-muted">No cards are up for trade right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <TradingCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

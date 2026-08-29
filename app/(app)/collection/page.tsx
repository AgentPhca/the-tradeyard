import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types/database";

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cards: Card[] = [];
  if (user) {
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    cards = data ?? [];
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">My Collection</h1>
          <p className="mt-1 text-sm text-muted">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </p>
        </div>
        <Link href="/collection/add" className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Card
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
          <Layers className="h-8 w-8 text-muted" />
          <p className="mt-4 text-sm text-muted">
            Your collection is empty. Add your first card to get started.
          </p>
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

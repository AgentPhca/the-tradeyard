import Link from "next/link";
import { Heart } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { WishlistForm } from "@/components/wishlist/WishlistForm";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { createClient } from "@/lib/supabase/server";
import type { Card, Wishlist } from "@/lib/types/database";

const TABS = [
  { key: "saved", label: "Saved Cards" },
  { key: "looking", label: "Looking For" },
] as const;

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "looking" ? "looking" : "saved";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
        <Heart className="h-8 w-8 text-muted" />
        <p className="mt-4 text-sm text-muted">
          Log in to save cards and track what you&rsquo;re looking for.
        </p>
      </div>
    );
  }

  let savedCards: Card[] = [];
  let lookingFor: Wishlist[] = [];

  if (activeTab === "saved") {
    const { data: savedRows } = await supabase
      .from("saved_cards")
      .select("card_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const cardIds = (savedRows ?? []).map((row) => row.card_id);
    if (cardIds.length > 0) {
      const { data } = await supabase.from("cards").select("*").in("id", cardIds);
      const cardById = new Map((data ?? []).map((c) => [c.id, c]));
      savedCards = cardIds
        .map((id) => cardById.get(id))
        .filter((c): c is Card => Boolean(c));
    }
  } else {
    const { data } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    lookingFor = data ?? [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Wishlist</h1>
        <p className="mt-1 text-sm text-muted">
          Cards you&rsquo;ve saved from the Marketplace, and cards you&rsquo;re hoping someone
          else has.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/wishlist?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "border-b-2 border-primary text-text"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "saved" ? (
        savedCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
            <Heart className="h-8 w-8 text-muted" />
            <p className="mt-4 text-sm text-muted">
              No saved cards yet. Tap the heart on a Marketplace card to save it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {savedCards.map((card) => (
              <TradingCard
                key={card.id}
                card={card}
                isOwner={card.owner_id === user.id}
                showSaveButton
                isSaved
              />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-6">
          <WishlistForm />
          {lookingFor.length === 0 ? (
            <p className="text-sm text-muted">
              You haven&rsquo;t added anything to Looking For yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lookingFor.map((entry) => (
                <WishlistRequestCard key={entry.id} entry={entry} isOwner />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

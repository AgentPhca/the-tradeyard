import { Suspense } from "react";
import { Store } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { createClient } from "@/lib/supabase/server";
import type { Card, CardStatus } from "@/lib/types/database";

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const playerName = firstParam(sp.player);
  const team = firstParam(sp.team);
  const setName = firstParam(sp.set);
  const insertSet = firstParam(sp.insertSet);
  const parallel = firstParam(sp.parallel);
  const status: CardStatus =
    firstParam(sp.status) === "personal_collection" ? "personal_collection" : "for_trade";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("cards").select("*").eq("status", status);
  if (playerName) query = query.ilike("player_name", `%${playerName}%`);
  if (team) query = query.eq("team", team);
  if (setName) query = query.eq("set_name", setName);
  if (insertSet) query = query.eq("insert_set", insertSet);
  if (parallel) query = query.eq("parallel", parallel);

  const { data } = await query.order("created_at", { ascending: false });
  const cards: Card[] = data ?? [];

  let savedCardIds = new Set<string>();
  if (user) {
    const { data: savedRows } = await supabase
      .from("saved_cards")
      .select("card_id")
      .eq("user_id", user.id);
    savedCardIds = new Set((savedRows ?? []).map((row) => row.card_id));
  }

  const { data: wishlistRows } = await supabase
    .from("wishlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  const requesterIds = Array.from(new Set((wishlistRows ?? []).map((row) => row.user_id)));
  const requesterById = new Map<string, { username: string; avatar_url: string | null }>();
  if (requesterIds.length > 0) {
    const { data: requesters } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", requesterIds);
    for (const requester of requesters ?? []) {
      requesterById.set(requester.id, requester);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Marketplace</h1>
        <p className="mt-1 text-sm text-muted">
          Cards the community has put up for trade &mdash; no prices, just deals.
        </p>
      </div>

      <Suspense fallback={null}>
        <MarketplaceFilters />
      </Suspense>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
          <Store className="h-8 w-8 text-muted" />
          <p className="mt-4 text-sm text-muted">No cards match your filters right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <TradingCard
              key={card.id}
              card={card}
              isOwner={card.owner_id === user?.id}
              showSaveButton={Boolean(user)}
              isSaved={savedCardIds.has(card.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-text">Users looking for...</h2>
        {(wishlistRows ?? []).length === 0 ? (
          <p className="text-sm text-muted">No one has posted a wishlist request yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(wishlistRows ?? []).map((entry) => {
              const requester = requesterById.get(entry.user_id);
              return (
                <WishlistRequestCard
                  key={entry.id}
                  entry={entry}
                  isOwner={entry.user_id === user?.id}
                  ownerUsername={requester?.username}
                  ownerAvatarUrl={requester?.avatar_url}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

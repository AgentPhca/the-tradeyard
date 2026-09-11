import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { CollectionCardTile } from "@/components/cards/CollectionCardTile";
import { MarketplaceCardTile } from "@/components/cards/MarketplaceCardTile";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { createClient } from "@/lib/supabase/server";
import { buildTokenOrFilters, tokenizeSearch } from "@/lib/utils/search";
import { coverPhoto } from "@/lib/utils/cardPhotos";
import { cardValueTag, cardValueTier } from "@/lib/utils/cardValue";
import type { Card, Wishlist } from "@/lib/types/database";

// Same columns the Marketplace search box matches against, plus `parallel`
// — a global search is more likely to get a parallel name typed into it on
// its own (no set/team context alongside) than the already-filtered
// Marketplace search is.
const CARD_SEARCH_COLUMNS = [
  "player_name",
  "team",
  "set_name",
  "insert_set",
  "card_number",
  "parallel",
] as const;

// wishlist rows are matched on player_name/team/set_name only, per the
// ticket — no card_number/parallel column to search there.
const WISHLIST_SEARCH_COLUMNS = ["player_name", "team", "set_name"] as const;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let collectionCards: Card[] = [];
  let marketplaceCards: Card[] = [];
  let wishlistRows: Wishlist[] = [];
  const profileById = new Map<
    string,
    { username: string; avatar_url: string | null; allow_contact: boolean }
  >();

  if (q) {
    const tokens = tokenizeSearch(q);
    const cardFilters = buildTokenOrFilters(tokens, CARD_SEARCH_COLUMNS);
    const wishlistFilters = buildTokenOrFilters(tokens, WISHLIST_SEARCH_COLUMNS);

    // Group 1: your own collection. Skipped entirely (not just an empty
    // result) when logged out — same "no user, no own-collection data"
    // pattern /collection itself uses, rather than redirecting to /login.
    if (user) {
      let query = supabase
        .from("cards")
        .select("*")
        .eq("owner_id", user.id)
        .neq("status", "traded");
      for (const filter of cardFilters) query = query.or(filter);
      const { data } = await query.order("created_at", { ascending: false });
      collectionCards = data ?? [];
    }

    // Group 2: Marketplace — other people's for_trade cards.
    {
      let query = supabase.from("cards").select("*").eq("status", "for_trade");
      if (user) query = query.neq("owner_id", user.id);
      for (const filter of cardFilters) query = query.or(filter);
      const { data } = await query.order("created_at", { ascending: false });
      marketplaceCards = data ?? [];
    }

    // Group 3: Looking For — other people's wishlist entries.
    {
      let query = supabase.from("wishlist").select("*");
      if (user) query = query.neq("user_id", user.id);
      for (const filter of wishlistFilters) query = query.or(filter);
      const { data } = await query.order("created_at", { ascending: false });
      wishlistRows = data ?? [];
    }

    const profileIds = Array.from(
      new Set([...marketplaceCards.map((c) => c.owner_id), ...wishlistRows.map((w) => w.user_id)])
    );
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, allow_contact")
        .in("id", profileIds);
      for (const p of profiles ?? []) profileById.set(p.id, p);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Search</h1>
        <p className="mt-1 text-sm text-muted">
          Find a card across your collection, the Marketplace, and everyone&rsquo;s Looking For
          list.
        </p>
      </div>

      <form action="/search" className="relative mb-8">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="text"
          name="q"
          defaultValue={q}
          autoFocus
          className="pl-9"
          placeholder="Search by player, team, set, or card number..."
        />
      </form>

      {q.length > 0 && (
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-text">
              Your Collection ({collectionCards.length})
            </h2>
            {collectionCards.length === 0 ? (
              <p className="text-sm text-muted">No matches in your collection.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {collectionCards.map((card) => (
                  <CollectionCardTile
                    key={card.id}
                    href={`/collection/${card.id}`}
                    imageUrl={coverPhoto(card)}
                    playerName={card.player_name}
                    category={card.category}
                    is_variation_of_base={card.is_variation_of_base}
                    insert_set={card.insert_set}
                    parallel={card.parallel}
                    print_run={card.print_run}
                    is_autograph={card.is_autograph}
                    is_relic={card.is_relic}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-text">
              Marketplace ({marketplaceCards.length})
            </h2>
            {marketplaceCards.length === 0 ? (
              <p className="text-sm text-muted">No matches in the Marketplace.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {marketplaceCards.map((card) => {
                  const seller = profileById.get(card.owner_id);
                  if (!seller) return null;
                  return (
                    <MarketplaceCardTile
                      key={card.id}
                      href={`/collection/${card.id}`}
                      imageUrl={coverPhoto(card)}
                      playerName={card.player_name}
                      team={card.team}
                      valueTag={cardValueTag(card)}
                      valueTier={cardValueTier(card)}
                      sellerUsername={seller.username}
                      sellerAvatarUrl={seller.avatar_url}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-text">
              Looking For ({wishlistRows.length})
            </h2>
            {wishlistRows.length === 0 ? (
              <p className="text-sm text-muted">No one is looking for this yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wishlistRows.map((entry) => {
                  const requester = profileById.get(entry.user_id);
                  return (
                    <WishlistRequestCard
                      key={entry.id}
                      entry={entry}
                      ownerUsername={requester?.username}
                      ownerAvatarUrl={requester?.avatar_url}
                      ownerAllowsContact={requester?.allow_contact ?? true}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

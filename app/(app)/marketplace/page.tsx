import { Suspense } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { createClient } from "@/lib/supabase/server";
import { buildTokenOrFilters, tokenizeSearch } from "@/lib/utils/search";
import type { Card, Wishlist } from "@/lib/types/database";

const TABS = [
  { key: "for_trade", label: "For Trade" },
  { key: "looking", label: "Looking For" },
] as const;

// Same set of columns CardForm's catalog search matches a player-name query
// against — card_number lets a printed number (e.g. "VT-17") be searched
// directly, alone or combined with a player/set token.
const CARD_SEARCH_COLUMNS = [
  "player_name",
  "team",
  "set_name",
  "insert_set",
  "card_number",
] as const;

// wishlist has no card_number column, so it's left out here.
const WISHLIST_SEARCH_COLUMNS = ["player_name", "team", "set_name", "insert_set"] as const;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const tab = firstParam(sp.tab) === "looking" ? "looking" : "for_trade";
  const playerName = firstParam(sp.player);
  const team = firstParam(sp.team);
  const setName = firstParam(sp.set);
  const insertSet = firstParam(sp.insertSet);
  const parallel = firstParam(sp.parallel);
  const isRookie = firstParam(sp.rookie) === "true";
  const isAutograph = firstParam(sp.autograph) === "true";
  const isRelic = firstParam(sp.relic) === "true";
  const isNumbered = firstParam(sp.numbered) === "true";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cards: Card[] = [];
  let savedCardIds = new Set<string>();
  const ownerById = new Map<
    string,
    { username: string; avatar_url: string | null; allow_contact: boolean }
  >();

  let wishlistRows: Wishlist[] = [];
  const requesterById = new Map<
    string,
    { username: string; avatar_url: string | null; allow_contact: boolean }
  >();

  if (tab === "for_trade") {
    // Hardcoded to 'for_trade' — the Marketplace must never show
    // personal_collection cards, independent of the owner's
    // show_personal_collection toggle (that toggle only affects the Card
    // Detail Page and the Profile "My Collection" tab).
    let query = supabase.from("cards").select("*").eq("status", "for_trade");
    for (const filter of buildTokenOrFilters(tokenizeSearch(playerName), CARD_SEARCH_COLUMNS)) {
      query = query.or(filter);
    }
    if (team) query = query.eq("team", team);
    if (setName) query = query.eq("set_name", setName);
    if (insertSet) query = query.eq("insert_set", insertSet);
    if (parallel) query = query.eq("parallel", parallel);
    if (isRookie) query = query.eq("is_rookie", true);
    if (isAutograph) query = query.eq("is_autograph", true);
    if (isRelic) query = query.eq("is_relic", true);
    if (isNumbered) query = query.not("print_run", "is", null);

    const { data } = await query.order("created_at", { ascending: false });
    cards = data ?? [];

    const ownerIds = Array.from(new Set(cards.map((card) => card.owner_id)));
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, allow_contact")
        .in("id", ownerIds);
      for (const owner of owners ?? []) {
        ownerById.set(owner.id, owner);
      }
    }

    if (user) {
      const { data: savedRows } = await supabase
        .from("saved_cards")
        .select("card_id")
        .eq("user_id", user.id);
      savedCardIds = new Set((savedRows ?? []).map((row) => row.card_id));
    }
  } else {
    // Marketplace-wide: every user's wishlist entries, not just the logged
    // in user's own (contrast with /wishlist's "Looking For" tab, which is
    // scoped to user_id = user.id).
    let query = supabase.from("wishlist").select("*");
    for (const filter of buildTokenOrFilters(tokenizeSearch(playerName), WISHLIST_SEARCH_COLUMNS)) {
      query = query.or(filter);
    }
    if (team) query = query.eq("team", team);
    if (setName) query = query.eq("set_name", setName);
    if (insertSet) query = query.eq("insert_set", insertSet);
    if (parallel) query = query.eq("parallel", parallel);

    const { data } = await query.order("created_at", { ascending: false });
    wishlistRows = data ?? [];

    const requesterIds = Array.from(new Set(wishlistRows.map((row) => row.user_id)));
    if (requesterIds.length > 0) {
      const { data: requesters } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, allow_contact")
        .in("id", requesterIds);
      for (const requester of requesters ?? []) {
        requesterById.set(requester.id, requester);
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Marketplace</h1>
        <p className="mt-1 text-sm text-muted">
          Cards the community has put up for trade, and what they&rsquo;re looking for &mdash;
          no prices, just deals.
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/marketplace?tab=${t.key}`}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-primary text-text"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Suspense fallback={null}>
        <MarketplaceFilters />
      </Suspense>

      {tab === "for_trade" ? (
        cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
            <Store className="h-8 w-8 text-muted" />
            <p className="mt-4 text-sm text-muted">No cards match your filters right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => {
              const owner = ownerById.get(card.owner_id);
              return (
                <TradingCard
                  key={card.id}
                  card={card}
                  isOwner={card.owner_id === user?.id}
                  showSaveButton={Boolean(user)}
                  isSaved={savedCardIds.has(card.id)}
                  ownerUsername={owner?.username}
                  ownerAvatarUrl={owner?.avatar_url}
                  ownerAllowsContact={owner?.allow_contact ?? true}
                />
              );
            })}
          </div>
        )
      ) : wishlistRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
          <Store className="h-8 w-8 text-muted" />
          <p className="mt-4 text-sm text-muted">No one is looking for a matching card yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {wishlistRows.map((entry) => {
            const requester = requesterById.get(entry.user_id);
            return (
              <WishlistRequestCard
                key={entry.id}
                entry={entry}
                isOwner={entry.user_id === user?.id}
                ownerUsername={requester?.username}
                ownerAvatarUrl={requester?.avatar_url}
                ownerAllowsContact={requester?.allow_contact ?? true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, Database } from "@/lib/types/database";

export interface MarketplaceFeedItem {
  card: Card;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  // Not currently in the viewer's own collection (any status) — the
  // Dashboard shows this as a "NEU" badge instead of the normal "FOR
  // TRADE" one, and it's also why team-mode sorts these cards first.
  isNew: boolean;
}

export interface MarketplaceFeedResult {
  items: MarketplaceFeedItem[];
  mode: "team" | "generic" | "empty";
  teamName: string | null;
}

const FEED_LIMIT = 12;

// Fallback chain: a team-flavored Personal Yard gets that team's for_trade
// cards (not-yet-owned ones first); everyone else (or a team with zero
// matches) gets the platform-wide latest listings; a marketplace with
// nothing at all in it returns mode "empty" for the page to render its own
// CTA.
export async function getMarketplaceFeed(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  favoriteTeam: string | null
): Promise<MarketplaceFeedResult> {
  const { data: ownCards } = await supabase
    .from("cards")
    .select("player_name, card_number")
    .eq("owner_id", viewerId);

  const ownedKeys = new Set((ownCards ?? []).map((c) => `${c.player_name}|${c.card_number ?? ""}`));

  async function withOwners(cards: Card[]): Promise<MarketplaceFeedItem[]> {
    if (cards.length === 0) return [];
    const ownerIds = Array.from(new Set(cards.map((c) => c.owner_id)));
    const { data: owners } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", ownerIds);
    const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

    return cards.map((card) => {
      const owner = ownerById.get(card.owner_id);
      return {
        card,
        ownerUsername: owner?.username ?? "unknown",
        ownerAvatarUrl: owner?.avatar_url ?? null,
        isNew: !ownedKeys.has(`${card.player_name}|${card.card_number ?? ""}`),
      };
    });
  }

  if (favoriteTeam) {
    const { data: teamCards } = await supabase
      .from("cards")
      .select("*")
      .eq("status", "for_trade")
      .eq("team", favoriteTeam)
      .neq("owner_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT * 2);

    if (teamCards && teamCards.length > 0) {
      const items = await withOwners(teamCards);
      // Not-yet-owned first, most recent within each group.
      items.sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1));
      return { items: items.slice(0, FEED_LIMIT), mode: "team", teamName: favoriteTeam };
    }
  }

  const { data: genericCards } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "for_trade")
    .neq("owner_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (!genericCards || genericCards.length === 0) {
    return { items: [], mode: "empty", teamName: null };
  }

  return { items: await withOwners(genericCards), mode: "generic", teamName: null };
}

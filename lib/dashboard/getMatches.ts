import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, Database, Wishlist } from "@/lib/types/database";

export interface MatchItem {
  id: string;
  // "wanted": someone else's wishlist entry matches one of the viewer's
  // for_trade cards. "offered": someone else's for_trade card matches one
  // of the viewer's own wishlist entries.
  type: "wanted" | "offered";
  otherUsername: string;
  // The card to link to — the viewer's own card for "wanted", the other
  // user's card for "offered".
  card: Card;
}

export interface MatchesResult {
  items: MatchItem[];
  // False when the viewer has neither for_trade cards nor wishlist entries
  // — the section isn't relevant to them yet, so the page hides it
  // entirely rather than showing an empty state.
  hasOwnActivity: boolean;
}

// A wishlist row only constrains the fields a user actually filled in —
// team is deliberately not part of this match (per the Dashboard spec,
// only player_name + set_name + insert_set/parallel).
function wishlistMatchesCard(wish: Pick<Wishlist, "player_name" | "set_name" | "insert_set" | "parallel">, card: Card): boolean {
  if (wish.player_name !== card.player_name) return false;
  if (wish.set_name && wish.set_name !== card.set_name) return false;
  if (wish.insert_set && wish.insert_set !== card.insert_set) return false;
  if (wish.parallel && wish.parallel !== card.parallel) return false;
  return true;
}

const MATCHES_LIMIT = 12;

export async function getMatches(supabase: SupabaseClient<Database>, viewerId: string): Promise<MatchesResult> {
  const [{ data: ownForTradeCards }, { data: ownWishlist }] = await Promise.all([
    supabase.from("cards").select("*").eq("owner_id", viewerId).eq("status", "for_trade"),
    supabase.from("wishlist").select("*").eq("user_id", viewerId),
  ]);

  const forTradeCards = ownForTradeCards ?? [];
  const wishlistRows = ownWishlist ?? [];
  const hasOwnActivity = forTradeCards.length > 0 || wishlistRows.length > 0;

  if (!hasOwnActivity) {
    return { items: [], hasOwnActivity: false };
  }

  const items: MatchItem[] = [];
  const usernameById = new Map<string, string>();

  async function usernamesFor(ids: string[]): Promise<void> {
    const missing = ids.filter((id) => !usernameById.has(id));
    if (missing.length === 0) return;
    const { data: owners } = await supabase.from("profiles").select("id, username").in("id", missing);
    for (const owner of owners ?? []) usernameById.set(owner.id, owner.username);
  }

  // Direction A: other users' wishlist entries wanting one of the
  // viewer's for_trade cards.
  if (forTradeCards.length > 0) {
    const { data: otherWishlistRows } = await supabase.from("wishlist").select("*").neq("user_id", viewerId);
    await usernamesFor(Array.from(new Set((otherWishlistRows ?? []).map((w) => w.user_id))));

    for (const wish of otherWishlistRows ?? []) {
      const matchedCard = forTradeCards.find((card) => wishlistMatchesCard(wish, card));
      if (matchedCard) {
        items.push({
          id: `wanted:${wish.id}:${matchedCard.id}`,
          type: "wanted",
          otherUsername: usernameById.get(wish.user_id) ?? "collector",
          card: matchedCard,
        });
      }
    }
  }

  // Direction B: other users' for_trade cards matching one of the
  // viewer's own wishlist entries.
  if (wishlistRows.length > 0) {
    const { data: otherForTradeCards } = await supabase
      .from("cards")
      .select("*")
      .eq("status", "for_trade")
      .neq("owner_id", viewerId);
    await usernamesFor(Array.from(new Set((otherForTradeCards ?? []).map((c) => c.owner_id))));

    for (const card of otherForTradeCards ?? []) {
      const matchedWish = wishlistRows.find((wish) => wishlistMatchesCard(wish, card));
      if (matchedWish) {
        items.push({
          id: `offered:${card.id}:${matchedWish.id}`,
          type: "offered",
          otherUsername: usernameById.get(card.owner_id) ?? "collector",
          card,
        });
      }
    }
  }

  return { items: items.slice(0, MATCHES_LIMIT), hasOwnActivity: true };
}

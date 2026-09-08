import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { insertOwnershipKey } from "@/lib/utils/checklist";
import { findMultiPlayerKeys, groupIntoSlots } from "@/lib/utils/multiPlayerCard";

export interface PersonalYardProgress {
  owned: number;
  total: number;
}

// TeamYard: every card_catalog slot for this team that ISN'T a plain Base
// card — see lib/utils/cardClassification.ts's isPureBase. Written out as
// the OR form directly (De Morgan's) rather than a single .not() call,
// since PostgREST has no clean way to negate an AND-of-two-columns filter.
export async function getTeamYardProgress(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  team: string
): Promise<PersonalYardProgress> {
  const pageSize = 1000;
  const catalogRows: {
    id: string;
    set_name: string;
    insert_set: string | null;
    team: string | null;
    player_name: string;
    card_number: string | null;
  }[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("card_catalog")
      .select("id, set_name, insert_set, team, player_name, card_number")
      .eq("team", team)
      .or("is_variation_of_base.eq.true,category.is.null,category.neq.Base")
      .range(from, from + pageSize - 1);

    const page = data ?? [];
    catalogRows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  if (catalogRows.length === 0) return { owned: 0, total: 0 };

  const { data: ownedCards } = await supabase
    .from("cards")
    .select("player_name, team, set_name, insert_set, card_number")
    .eq("owner_id", ownerId)
    .eq("team", team)
    .neq("status", "traded")
    .not("set_name", "is", null);

  const ownedKeys = new Set(
    (ownedCards ?? []).map((c) =>
      insertOwnershipKey(c.player_name, c.team, c.set_name!, c.insert_set ?? "", c.card_number)
    )
  );

  // A multi-player card featuring co-featured players from the same team
  // (e.g. "Dual Autographs", "Triple Signatures") stores one catalog row
  // per player, all sharing (set_name, insert_set, card_number) — grouped
  // into one slot here too, same as PersonalYardAlbum's interactive
  // album, so this summary's total/owned counts don't 2-3x a card that's
  // really one physical slot.
  const multiPlayerKeys = findMultiPlayerKeys(catalogRows);
  const slots = groupIntoSlots(catalogRows, multiPlayerKeys);

  const owned = slots.filter((slot) =>
    slot.rows.some((row) =>
      ownedKeys.has(insertOwnershipKey(row.player_name, row.team, row.set_name, row.insert_set ?? "", row.card_number))
    )
  ).length;

  return { owned, total: slots.length };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { insertOwnershipKey } from "@/lib/utils/checklist";

export interface PersonalYardProgress {
  owned: number;
  total: number;
}

// PlayerYard: every card_catalog slot for this player, no further
// restriction — Base, every parallel, every insert (deliberately not
// filtered by is_variation_of_base like BaseYard/TeamYard are, per this
// yard's own "alles" scope).
export async function getPlayerYardProgress(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  player: string
): Promise<PersonalYardProgress> {
  const pageSize = 1000;
  const catalogRows: {
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
      .select("set_name, insert_set, team, player_name, card_number")
      .eq("player_name", player)
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
    .eq("player_name", player)
    .neq("status", "traded")
    .not("set_name", "is", null);

  const ownedKeys = new Set(
    (ownedCards ?? []).map((c) =>
      insertOwnershipKey(c.player_name, c.team, c.set_name!, c.insert_set ?? "", c.card_number)
    )
  );

  const owned = catalogRows.filter((row) =>
    ownedKeys.has(insertOwnershipKey(row.player_name, row.team, row.set_name, row.insert_set ?? "", row.card_number))
  ).length;

  return { owned, total: catalogRows.length };
}

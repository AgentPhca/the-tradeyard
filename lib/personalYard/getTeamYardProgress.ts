import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { insertOwnershipKey } from "@/lib/utils/checklist";

export interface PersonalYardProgress {
  owned: number;
  total: number;
}

// TeamYard: every card_catalog slot for this team that ISN'T a plain base
// card — numbered/parallel, a real insert set, or autograph/relic. Same
// is_variation_of_base=false exclusion BaseYard/InsertYard use (a
// "TEAM CAMO VARIATION" row still carries category='Base' but a non-null
// insert_set, so without this guard it would wrongly count as "non-base").
export async function getTeamYardProgress(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  team: string
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
      .eq("team", team)
      .eq("is_variation_of_base", false)
      .or("parallel.not.is.null,insert_set.not.is.null,is_autograph.eq.true,is_relic.eq.true")
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

  const owned = catalogRows.filter((row) =>
    ownedKeys.has(insertOwnershipKey(row.player_name, row.team, row.set_name, row.insert_set ?? "", row.card_number))
  ).length;

  return { owned, total: catalogRows.length };
}

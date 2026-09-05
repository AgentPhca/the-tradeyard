import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { ownershipKey } from "@/lib/utils/checklist";

export interface BaseYardSetProgress {
  setName: string;
  owned: number;
  total: number;
}

// A compact, per-set summary for the public BaseYard profile section —
// unlike the interactive checklist (ChecklistAlbum), this doesn't need the
// full per-team grid, just "X / Y collected" per set. Reuses the same
// player+team+set ownership matching ChecklistAlbum uses, so the two never
// disagree on what counts as "owned".
export async function getPublicBaseYardProgress(
  supabase: SupabaseClient<Database>,
  ownerId: string
): Promise<BaseYardSetProgress[]> {
  // Every Base-category catalog slot, across all sets — paginated the same
  // way ChecklistAlbum fetches it (see that file for why .range() chunking
  // is required instead of a single large .limit()).
  const pageSize = 1000;
  const catalogRows: { set_name: string; team: string | null; player_name: string }[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("card_catalog")
      .select("set_name, team, player_name")
      .eq("category", "Base")
      .eq("is_variation_of_base", false)
      .range(from, from + pageSize - 1);

    const page = data ?? [];
    catalogRows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  if (catalogRows.length === 0) return [];

  const { data: ownedCards } = await supabase
    .from("cards")
    .select("player_name, team, set_name")
    .eq("owner_id", ownerId)
    .eq("category", "Base")
    .neq("status", "traded")
    .not("set_name", "is", null);

  const ownedKeys = new Set(
    (ownedCards ?? []).map((c) => ownershipKey(c.player_name, c.team, c.set_name!))
  );

  const totals = new Map<string, number>();
  const owned = new Map<string, number>();

  for (const row of catalogRows) {
    totals.set(row.set_name, (totals.get(row.set_name) ?? 0) + 1);
    if (ownedKeys.has(ownershipKey(row.player_name, row.team, row.set_name))) {
      owned.set(row.set_name, (owned.get(row.set_name) ?? 0) + 1);
    }
  }

  return Array.from(totals.entries())
    .map(([setName, total]) => ({ setName, total, owned: owned.get(setName) ?? 0 }))
    .sort((a, b) => a.setName.localeCompare(b.setName));
}

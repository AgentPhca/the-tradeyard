import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { ownershipKey } from "@/lib/utils/checklist";
import { isChromeBaseInsertSet } from "@/lib/utils/cardClassification";
import { findMultiPlayerKeys, groupIntoSlots } from "@/lib/utils/multiPlayerCard";

export interface BaseYardSetProgress {
  setName: string;
  owned: number;
  total: number;
}

// A compact, per-set summary for the public BaseYard profile section —
// unlike the interactive checklist (ChecklistAlbum), this doesn't need the
// full per-team grid, just "X / Y collected" per set. Reuses the same
// player+team+set+card_number ownership matching ChecklistAlbum uses, so
// the two never disagree on what counts as "owned".
export async function getPublicBaseYardProgress(
  supabase: SupabaseClient<Database>,
  ownerId: string
): Promise<BaseYardSetProgress[]> {
  // Every plain-Base-category catalog slot, across all sets — paginated
  // the same way ChecklistAlbum fetches it (see that file for why .range()
  // chunking is required instead of a single large .limit()). The
  // CHROME-as-second-Base-tier exclusion is applied client-side after
  // fetching (see lib/utils/cardClassification.ts) rather than as a raw
  // ILIKE filter here — a plain `insert_set NOT ILIKE '%CHROME%'` would
  // silently drop every row with a NULL insert_set too (NULL ILIKE
  // anything is NULL, not true, in SQL's three-valued logic).
  const pageSize = 1000;
  const catalogRows: {
    id: string;
    set_name: string;
    team: string | null;
    player_name: string;
    card_number: string | null;
    insert_set: string | null;
  }[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("card_catalog")
      .select("id, set_name, team, player_name, card_number, insert_set")
      .eq("category", "Base")
      .eq("is_variation_of_base", false)
      .range(from, from + pageSize - 1);

    const page = (data ?? []).filter((row) => !isChromeBaseInsertSet(row.insert_set));
    catalogRows.push(...page);
    if ((data ?? []).length < pageSize) break;
    from += pageSize;
  }

  if (catalogRows.length === 0) return [];

  // Unlike ChecklistAlbum/getTeamYardProgress, nothing here filters by
  // team, so a cross-team multi-player card mistagged category='Base'
  // (e.g. League Leaders — a known catalog data-quality issue, see the
  // card_title/grouping fix's own notes) would otherwise count once per
  // co-featured player instead of once per physical card. Grouped into
  // slots for the same reason as everywhere else this pattern shows up.
  const multiPlayerKeys = findMultiPlayerKeys(catalogRows);
  const slots = groupIntoSlots(catalogRows, multiPlayerKeys);

  const { data: ownedCards } = await supabase
    .from("cards")
    .select("player_name, team, set_name, card_number, is_variation_of_base, insert_set")
    .eq("owner_id", ownerId)
    .eq("category", "Base")
    .neq("status", "traded")
    .not("set_name", "is", null);

  // A "CHROME BASE" owned card must NOT satisfy a plain Base slot's
  // ownership key — both share category='Base'/is_variation_of_base=false
  // and (critically) the SAME player+team+set+card_number, since
  // ownershipKey doesn't carry insert_set. Without this, owning only the
  // Chrome parallel of a card would incorrectly mark the plain Base slot
  // as owned too — see ChecklistAlbum.tsx's own ownedByKey for the same
  // guard.
  const ownedKeys = new Set(
    (ownedCards ?? [])
      .filter((c) => !c.is_variation_of_base && !isChromeBaseInsertSet(c.insert_set))
      .map((c) => ownershipKey(c.player_name, c.team, c.set_name!, c.card_number))
  );

  const totals = new Map<string, number>();
  const owned = new Map<string, number>();

  for (const slot of slots) {
    const row = slot.rows[0];
    totals.set(row.set_name, (totals.get(row.set_name) ?? 0) + 1);
    const isOwned = slot.rows.some((r) => ownedKeys.has(ownershipKey(r.player_name, r.team, r.set_name, r.card_number)));
    if (isOwned) {
      owned.set(row.set_name, (owned.get(row.set_name) ?? 0) + 1);
    }
  }

  return Array.from(totals.entries())
    .map(([setName, total]) => ({ setName, total, owned: owned.get(setName) ?? 0 }))
    .sort((a, b) => a.setName.localeCompare(b.setName));
}

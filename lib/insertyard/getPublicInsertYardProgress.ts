import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { insertOwnershipKey } from "@/lib/utils/checklist";
import { findMultiPlayerKeys, groupIntoSlots } from "@/lib/utils/multiPlayerCard";

export interface InsertYardSetProgress {
  setName: string;
  owned: number;
  total: number;
  insertSetCount: number;
}

export interface InsertYardInsertSetProgress {
  setName: string;
  insertSet: string;
  owned: number;
  total: number;
}

// A compact summary for the public InsertYard profile section, at two
// levels: per-Set (an aggregate across all its insert sets, plus how many
// distinct insert sets it has) and per-Insert-Set within a chosen Set —
// mirroring the two-level drill-down the profile page renders (pick a Set,
// then see its insert sets' progress). Reuses the same
// player+team+set+insertSet+cardNumber ownership matching ChecklistAlbum
// uses, so the two never disagree on what counts as "owned".
export async function getPublicInsertYardProgress(
  supabase: SupabaseClient<Database>,
  ownerId: string
): Promise<{ bySet: InsertYardSetProgress[]; byInsertSet: InsertYardInsertSetProgress[] }> {
  // Every catalog slot this yard's checklist covers, across all sets — see
  // ChecklistAlbum for why .range() chunking is required, and see
  // lib/utils/cardClassification.ts for why category (not insert_set
  // alone) is what distinguishes "a real insert set" from "the base
  // checklist" (whose rows are tagged insert_set='BASE CARDS'). Broadened
  // beyond a literal category='Insert' check: an Autograph/Relic-category
  // insert set (e.g. "REAL ONE AUTOGRAPHS", "NFL MATERIAL CARDS") is just
  // as much a trackable checklist as a plain Insert one.
  const pageSize = 1000;
  const catalogRows: {
    id: string;
    set_name: string;
    team: string | null;
    player_name: string;
    insert_set: string | null;
    card_number: string | null;
  }[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("card_catalog")
      .select("id, set_name, team, player_name, insert_set, card_number")
      .or("category.is.null,category.neq.Base")
      .eq("is_variation_of_base", false)
      .eq("needs_review", false)
      .range(from, from + pageSize - 1);

    const page = data ?? [];
    catalogRows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  if (catalogRows.length === 0) return { bySet: [], byInsertSet: [] };

  // A multi-player insert (e.g. "AFC Rec Leaders") stores one catalog row
  // per co-featured player, all sharing (set_name, insert_set,
  // card_number) — grouped into one slot here too, same as
  // ChecklistAlbum's interactive album, so this summary's totals/owned
  // counts agree with what the album actually shows (10 slots for League
  // Leaders, not 30 raw rows) and a card added under any one of the
  // co-featured players' names counts the slot as owned.
  const multiPlayerKeys = findMultiPlayerKeys(catalogRows);
  const slots = groupIntoSlots(catalogRows, multiPlayerKeys);

  const { data: ownedCards } = await supabase
    .from("cards")
    .select("player_name, team, set_name, insert_set, card_number")
    .eq("owner_id", ownerId)
    .neq("status", "traded")
    .not("set_name", "is", null)
    .not("insert_set", "is", null)
    .or("category.is.null,category.neq.Base")
    .eq("is_variation_of_base", false);

  const ownedKeys = new Set(
    (ownedCards ?? []).map((c) =>
      insertOwnershipKey(c.player_name, c.team, c.set_name!, c.insert_set!, c.card_number)
    )
  );

  const setTotals = new Map<string, number>();
  const setOwned = new Map<string, number>();
  const setInsertSets = new Map<string, Set<string>>();
  const pairTotals = new Map<string, number>();
  const pairOwned = new Map<string, number>();
  const pairInfo = new Map<string, { setName: string; insertSet: string }>();

  for (const slot of slots) {
    const row = slot.rows[0];
    const insertSet = row.insert_set!;
    const pairKey = `${row.set_name}|${insertSet}`;
    // A multi-player slot counts as owned if ANY of its co-featured
    // players' rows matches an owned card — see groupIntoSlots above.
    const isOwned = slot.rows.some((r) =>
      ownedKeys.has(insertOwnershipKey(r.player_name, r.team, r.set_name, r.insert_set!, r.card_number))
    );

    setTotals.set(row.set_name, (setTotals.get(row.set_name) ?? 0) + 1);
    if (isOwned) setOwned.set(row.set_name, (setOwned.get(row.set_name) ?? 0) + 1);
    if (!setInsertSets.has(row.set_name)) setInsertSets.set(row.set_name, new Set());
    setInsertSets.get(row.set_name)!.add(insertSet);

    pairTotals.set(pairKey, (pairTotals.get(pairKey) ?? 0) + 1);
    if (isOwned) pairOwned.set(pairKey, (pairOwned.get(pairKey) ?? 0) + 1);
    pairInfo.set(pairKey, { setName: row.set_name, insertSet });
  }

  const bySet = Array.from(setTotals.entries())
    .map(([setName, total]) => ({
      setName,
      total,
      owned: setOwned.get(setName) ?? 0,
      insertSetCount: setInsertSets.get(setName)?.size ?? 0,
    }))
    .sort((a, b) => a.setName.localeCompare(b.setName));

  const byInsertSet = Array.from(pairTotals.entries())
    .map(([pairKey, total]) => {
      const { setName, insertSet } = pairInfo.get(pairKey)!;
      return { setName, insertSet, total, owned: pairOwned.get(pairKey) ?? 0 };
    })
    .sort((a, b) => a.setName.localeCompare(b.setName) || a.insertSet.localeCompare(b.insertSet));

  return { bySet, byInsertSet };
}

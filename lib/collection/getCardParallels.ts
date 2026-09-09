import type { SupabaseClient } from "@supabase/supabase-js";
import { getParallelFrameColor, type ParallelFrameColor } from "@/lib/utils/parallelFrameColor";
import { isPureBase } from "@/lib/utils/cardClassification";
import { titleCase } from "@/lib/utils/text";
import type { Database } from "@/lib/types/database";

export interface CardParallel {
  catalogId: string;
  name: string;
  printRun: number | null;
  color: ParallelFrameColor;
  owned: boolean;
}

export interface CardParallelsResult {
  parallels: CardParallel[];
  ownedCount: number;
}

// The researched parallels reference table (lib/supabase/parallels.sql)
// scales by set_name only, not insert_set, and its parallel_name is the
// formal researched name (e.g. "Silver Mojo Refractor") which doesn't
// always match a card_catalog row's own `parallel` string verbatim (e.g.
// plain "Mojo Refractor"). Falls back to a case-insensitive substring
// match in either direction — the same convention already used elsewhere
// when wiring the Parallels table into the rest of the app.
function namesLooselyMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  return na === nb || na.includes(nb) || nb.includes(na);
}

function parallelDisplayName(row: {
  parallel: string | null;
  insert_set: string | null;
  category: string | null;
  is_variation_of_base: boolean;
}): string {
  if (row.parallel) return row.parallel;
  if (isPureBase(row)) return "Base";
  return row.insert_set ? titleCase(row.insert_set) : "Base";
}

// All known versions ("parallels") of one specific physical card — every
// card_catalog row sharing the same (set_name, card_number, player_name)
// slot, cross-referenced against the researched parallels reference table
// for an authoritative print run (card_catalog's own print_run field isn't
// reliably filled for every parallel tier — that gap is exactly why the
// parallels table exists), colored via getParallelFrameColor, and checked
// against the current viewer's own cards for ownership.
//
// Deliberately scoped to one (set_name, card_number) slot only, not a
// set-wide "every parallel this player has across the set" sweep and not
// the player's other cards across different sets/products — that's a
// different, unbounded question (more of a future PlayerYard feature).
export async function getCardParallels(
  supabase: SupabaseClient<Database>,
  card: { set_name: string | null; card_number: string | null; player_name: string },
  viewerId: string | null
): Promise<CardParallelsResult> {
  if (!card.set_name || !card.card_number || !viewerId) {
    return { parallels: [], ownedCount: 0 };
  }

  const { data: catalogRows } = await supabase
    .from("card_catalog")
    .select("id, parallel, insert_set, category, is_variation_of_base, print_run")
    .eq("set_name", card.set_name)
    .eq("card_number", card.card_number)
    .eq("player_name", card.player_name);

  const rows = catalogRows ?? [];
  // Only one known version of this physical card — nothing to show.
  if (rows.length <= 1) {
    return { parallels: [], ownedCount: 0 };
  }

  const { data: ladderRows } = await supabase
    .from("parallels")
    .select("parallel_name, print_run")
    .eq("set_name", card.set_name);
  const ladder = ladderRows ?? [];

  const { data: ownedRows } = await supabase
    .from("cards")
    .select("catalog_id, parallel, insert_set")
    .eq("owner_id", viewerId)
    .eq("set_name", card.set_name)
    .eq("card_number", card.card_number)
    .eq("player_name", card.player_name);
  const owned = ownedRows ?? [];

  const parallels: CardParallel[] = rows.map((row) => {
    const name = parallelDisplayName(row);
    const ladderMatch = ladder.find((p) => namesLooselyMatch(p.parallel_name, name));
    const printRun = ladderMatch?.print_run ?? row.print_run ?? null;

    // catalog_id is the reliable match when set (see the catalog_id
    // backfill work); a manually-added card without one falls back to
    // matching the same parallel/insert_set naming this row itself carries.
    const isOwned = owned.some(
      (c) =>
        c.catalog_id === row.id ||
        (!c.catalog_id &&
          (c.parallel ?? null) === (row.parallel ?? null) &&
          (c.insert_set ?? null) === (row.insert_set ?? null))
    );

    return {
      catalogId: row.id,
      name,
      printRun,
      color: getParallelFrameColor(name),
      owned: isOwned,
    };
  });

  // Least rare (unnumbered/"Base") first, most rare (smallest print run,
  // e.g. a 1/1) last — "ascending rarity", which is descending on the
  // print run number itself.
  parallels.sort((a, b) => {
    if (a.printRun == null && b.printRun == null) return 0;
    if (a.printRun == null) return -1;
    if (b.printRun == null) return 1;
    return b.printRun - a.printRun;
  });

  return {
    parallels,
    ownedCount: parallels.filter((p) => p.owned).length,
  };
}

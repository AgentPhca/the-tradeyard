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
  // The viewer's own `cards.id` for this tier, so the UI can link to it —
  // null whenever owned is false (nothing to link to).
  ownedCardId: string | null;
}

export interface CardParallelsResult {
  parallels: CardParallel[];
  ownedCount: number;
}

// A plain bidirectional `includes()` was too generous: a short, generic
// name like "Gold" is a literal substring of plenty of unrelated longer
// names (e.g. "Golden Mirror Image Variations" — two completely different
// products for 2026 Flagship's Chase Young #244 — "gold" matched inside
// "golden" even though nothing separates them). Below the minimum length,
// fuzzy matching is skipped entirely (only an exact match counts) — even
// a whole-word match on something that short is too easy to hit by
// accident. Fewer than 4 characters is currently possible via
// getParallelDisplayName's own multi-word phrases, so this only ever
// blocks single short color words like "Red" or "Ice" from fuzzy-matching
// at all.
const MIN_FUZZY_MATCH_LENGTH = 4;

// Whether `needle` occurs in `haystack` as a whole word/phrase — bounded
// by \b on both ends, so "gold" no longer matches inside "golden" (no
// boundary between the shared "gold" and the following "en"), while a
// multi-word phrase like "mojo refractor" still matches inside "silver
// mojo refractor" (a boundary exists on both sides: after "silver " and
// at the end of the string).
function containsWholeWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(haystack);
}

// The researched parallels reference table (lib/supabase/parallels.sql)
// scales by set_name only, not insert_set, and its parallel_name is the
// formal researched name which doesn't always match a card_catalog row's
// own `parallel`/`insert_set` string verbatim (e.g. a short nickname like
// "Mojo Refractor" for a formally-named "Silver Mojo Refractor" listing).
// Falls back to a whole-word/phrase match (not a raw substring check —
// see containsWholeWord above) once both names clear the minimum length.
function namesLooselyMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return true;

  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length < MIN_FUZZY_MATCH_LENGTH) return false;

  return containsWholeWord(longer, shorter);
}

// Tries an exact match across the WHOLE ladder before ever falling back
// to a fuzzy one. Array.find() alone would stop at the first fuzzy hit,
// which can be the wrong entry: e.g. candidate "Blue Refractor" is a
// legitimate whole-word fuzzy match for ladder entry "Refractor" too (the
// word "refractor" appears whole in both), and if "Refractor" happens to
// sort before "Blue Refractor" in the ladder, find() would wrongly latch
// onto the generic "Refractor" entry despite an exact "Blue Refractor"
// match existing later in the same set. Scanning for an exact match
// first, across every entry, avoids that regardless of table ordering.
function findLadderMatch<T extends { parallel_name: string }>(
  ladder: T[],
  candidateName: string
): T | undefined {
  const target = candidateName.trim().toLowerCase();
  const exact = ladder.find((p) => p.parallel_name.trim().toLowerCase() === target);
  if (exact) return exact;
  return ladder.find((p) => namesLooselyMatch(p.parallel_name, candidateName));
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
// slot, PLUS any of the viewer's own cards for that same slot that were
// added with no catalog match at all (catalog_id IS NULL — the checklist
// import never got around to cataloging that tier; see the second loop
// below). Both sources are matched against the researched parallels
// reference table for their authoritative name AND print run (name/print
// run are NEVER taken from the raw card_catalog/cards fields themselves —
// see the two bugs that caused:
// card_catalog's own naming can be wrong for a given set — e.g. Signature
// Class's "Rookie Class Chrome Base" is really a "Refractor", the same
// mislabeling pattern already fixed once for 2026 Flagship's Mojo cards —
// and card_catalog.print_run has been observed holding the *product year*
// instead of a real print run for at least one row (Chase Young #244's
// "Golden Mirror Image Variations", which showed a bogus "/2026"). A
// catalog row with no ladder match is left out entirely rather than shown
// with a guessed or wrong value — incomplete is fine, wrong is not. This
// does mean a set with a sparsely-filled parallels ladder will show fewer
// tiers here until that ladder is filled in; that's expected, not a bug.
//
// Deliberately scoped to one (set_name, card_number) slot only, not a
// set-wide "every parallel this player has across the set" sweep and not
// the player's other cards across different sets/products — that's a
// different, unbounded question (more of a future PlayerYard feature).
export async function getCardParallels(
  supabase: SupabaseClient<Database>,
  card: {
    set_name: string | null;
    card_number: string | null;
    player_name: string;
    catalog_id: string | null;
    parallel: string | null;
    insert_set: string | null;
    category: string | null;
    is_variation_of_base: boolean;
  },
  viewerId: string | null
): Promise<CardParallelsResult> {
  if (!card.set_name || !card.card_number || !viewerId) {
    return { parallels: [], ownedCount: 0 };
  }

  const { data: catalogRows } = await supabase
    .from("card_catalog")
    .select("id, parallel, insert_set, category, is_variation_of_base")
    .eq("set_name", card.set_name)
    .eq("card_number", card.card_number)
    .eq("player_name", card.player_name);

  const rows = catalogRows ?? [];

  const { data: ladderRows } = await supabase
    .from("parallels")
    .select("parallel_name, print_run")
    .eq("set_name", card.set_name);
  const ladder = ladderRows ?? [];

  const { data: ownedRows } = await supabase
    .from("cards")
    .select("id, catalog_id, parallel, insert_set, category, is_variation_of_base")
    .eq("owner_id", viewerId)
    .eq("set_name", card.set_name)
    .eq("card_number", card.card_number)
    .eq("player_name", card.player_name);
  const owned = ownedRows ?? [];

  // The currently-viewed card's own ladder-matched name/print run, so it
  // can be excluded from its own parallel row below (it shouldn't show up
  // as a chip in its own strip). catalog_id is the reliable comparison
  // when set; a manually-added card without one falls back to this
  // name+printRun comparison instead.
  const currentLadderMatch = findLadderMatch(ladder, parallelDisplayName(card));

  const parallels: CardParallel[] = [];

  for (const row of rows) {
    const candidateName = parallelDisplayName(row);
    const ladderMatch = findLadderMatch(ladder, candidateName);

    // No authoritative ladder entry for this tier yet — see the module
    // comment above for why this is skipped rather than guessed.
    if (!ladderMatch) continue;

    const isCurrentCard =
      row.id === card.catalog_id ||
      (!card.catalog_id &&
        ladderMatch.parallel_name === currentLadderMatch?.parallel_name &&
        ladderMatch.print_run === currentLadderMatch?.print_run);
    if (isCurrentCard) continue;

    // catalog_id is the reliable match when set (see the catalog_id
    // backfill work); a manually-added card without one falls back to
    // matching the same parallel/insert_set naming this row itself carries.
    const ownedMatch = owned.find(
      (c) =>
        c.catalog_id === row.id ||
        (!c.catalog_id &&
          (c.parallel ?? null) === (row.parallel ?? null) &&
          (c.insert_set ?? null) === (row.insert_set ?? null))
    );

    parallels.push({
      catalogId: row.id,
      name: ladderMatch.parallel_name,
      printRun: ladderMatch.print_run,
      color: getParallelFrameColor(ladderMatch.parallel_name),
      owned: !!ownedMatch,
      ownedCardId: ownedMatch?.id ?? null,
    });
  }

  // A card the viewer added with no catalog match (catalog_id IS NULL) —
  // freetext-entered because the checklist import never got around to
  // cataloging that specific tier (confirmed live for Jayden Higgins #136
  // 2025 Resurgence: card_catalog only has "Rookies"/"Rookie Signatures"
  // for that slot, but the owner's own Refractor card exists with
  // catalog_id null). It's still a real, owned version of this physical
  // card, so it belongs in the strip too — not just whatever happened to
  // make it into card_catalog. Matched against the same ladder as
  // everything else above, and skipped (not guessed) when there's no
  // ladder entry, same rule as catalog rows. Deduped against the
  // catalog-row loop's results by matched ladder name, in case the
  // catalog gets backfilled later and both end up pointing at the same
  // tier.
  const matchedNames = new Set(parallels.map((p) => p.name));
  for (const manualRow of owned) {
    if (manualRow.catalog_id) continue; // already covered by card_catalog above

    const candidateName = parallelDisplayName(manualRow);
    const ladderMatch = findLadderMatch(ladder, candidateName);
    if (!ladderMatch) continue;

    const isCurrentCard =
      !card.catalog_id &&
      ladderMatch.parallel_name === currentLadderMatch?.parallel_name &&
      ladderMatch.print_run === currentLadderMatch?.print_run;
    if (isCurrentCard) continue;

    if (matchedNames.has(ladderMatch.parallel_name)) continue;
    matchedNames.add(ladderMatch.parallel_name);

    parallels.push({
      catalogId: manualRow.id,
      name: ladderMatch.parallel_name,
      printRun: ladderMatch.print_run,
      color: getParallelFrameColor(ladderMatch.parallel_name),
      owned: true, // sourced from the viewer's own cards by construction
      ownedCardId: manualRow.id,
    });
  }

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

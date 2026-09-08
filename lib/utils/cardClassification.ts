// Corrected Base/Insert/Parallel classification rules (Yards-Konzept v2
// addendum) — replaces every previous heuristic based on
// `card_catalog.parallel IS NULL` (0% filled across all 10,489 catalog
// rows, verified against the real import — never a usable signal) or
// `insert_set IS NULL` (many genuine Base rows carry a PDF-section-heading
// insert_set like "BASE CARDS I" / "ROOKIES" / "VETERANS CLASS BASE", so
// its presence/absence says nothing about Base-ness).
//
// Works on both card_catalog rows and `cards` rows — both tables carry the
// same category/is_variation_of_base/insert_set columns (the latter
// copied onto `cards` at Add Card time from the matched catalog row).

export interface ClassifiableRow {
  category: string | null;
  is_variation_of_base: boolean;
  insert_set: string | null;
  // Only ever populated on `cards` rows, via the separate Parallels
  // reference table dropdown in CardForm (a numbered chase parallel like
  // "Cosmic /50") — never on card_catalog rows, and unrelated to
  // is_variation_of_base's photo/design-variation rows. Optional so
  // catalog-row callers that don't select this column can omit it.
  parallel?: string | null;
}

// Some sets (confirmed so far via the real catalog import: only 2025
// Topps Signature Class Football) carry a second, identically-numbered
// "CHROME BASE" tier alongside the normal Base tier (e.g. "VETERANS CLASS
// BASE" 1-100 AND "VETERANS CLASS CHROME BASE" 1-99, same players/
// numbers) — tagged category='Base', is_variation_of_base=false,
// indistinguishable from a real Base row by those two fields alone.
// Treated as a Parallel of the Base card instead of a second BaseYard
// slot (which would otherwise show every card in that tier twice).
export function isChromeBaseInsertSet(insertSet: string | null): boolean {
  return insertSet?.toUpperCase().includes("CHROME") ?? false;
}

// A "plain" Base checklist slot — the only thing BaseYard should track.
export function isPureBase(row: ClassifiableRow): boolean {
  return !row.is_variation_of_base && row.category === "Base" && !isChromeBaseInsertSet(row.insert_set);
}

// Broadened beyond a literal category==='Insert' check: category='Autograph'
// and category='Relic' rows that AREN'T a photo/design variation-of-base
// (e.g. "REAL ONE AUTOGRAPHS", "NFL MATERIAL CARDS") are just as much a
// trackable insert-set checklist as a plain category='Insert' row — the
// only thing that actually distinguishes "an insert set" from "the base
// checklist" is is_variation_of_base and not being category='Base'.
export function isInsert(row: ClassifiableRow): boolean {
  return !row.is_variation_of_base && row.category !== "Base";
}

// Photo/design variations of a Base card (Team Camo, Golden Mirror Image,
// Lightboard Logo, Clear, Etch, Constellation, Vintage Stock, True Photo,
// etc.) are fundamentally the same thing as a Parallel — just tagged
// inconsistently between category='Base' (1,216 rows) and category=
// 'Insert' (1,300 rows) in the source data. category='Autograph'
// variations (471 rows, e.g. "ROOKIES AUTOGRAPH VARIATION") are excluded
// — those are autograph rarities that belong to ValueYard, not a second
// Parallel bucket. The CHROME-as-second-Base-tier rows count as Parallel
// too, even though they aren't is_variation_of_base. A `cards` row with a
// manually-tagged numbered parallel (via the separate Parallels reference
// table — see `parallel` above) is always a Parallel regardless of the
// rest, since that's an explicit, reliable signal on its own.
export function isParallel(row: ClassifiableRow): boolean {
  if (row.parallel) return true;
  if (row.is_variation_of_base) return row.category !== "Autograph";
  return row.category === "Base" && isChromeBaseInsertSet(row.insert_set);
}

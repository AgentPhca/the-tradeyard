// Shared ownership-matching helpers for the two checklist-style yards
// (BaseYard, InsertYard) — both overlay a user's own cards onto every
// card_catalog slot for a Set(+grouping), so "does this catalog row count
// as owned" needs to agree everywhere it's asked: the interactive
// ChecklistAlbum, and the public per-set/per-insert-set progress summaries
// on profiles.

// BaseYard: a catalog row counts as owned when the user has a card whose
// player+team+set matches — not just cards linked via catalog_id, since a
// card can be manually flagged "Base Set" with no catalog match at all.
export function ownershipKey(playerName: string, team: string | null, set: string): string {
  return `${playerName}|${team ?? ""}|${set}`;
}

// InsertYard: player+team+set alone isn't unique enough — an insert set can
// feature the same player more than once (different parallels/variations
// sharing a catalog row otherwise identical apart from card_number), so the
// printed card number has to be part of the key. Omitting it was a bug
// caught during the original BaseYard build (where it happened to not
// matter, since one player only ever appears once per team there) — build
// it in for InsertYard from the start instead of hitting the same bug twice.
export function insertOwnershipKey(
  playerName: string,
  team: string | null,
  set: string,
  insertSet: string,
  cardNumber: string | null
): string {
  return `${playerName}|${team ?? ""}|${set}|${insertSet}|${cardNumber ?? ""}`;
}

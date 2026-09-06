// Shared ownership-matching helpers for the two checklist-style yards
// (BaseYard, InsertYard) — both overlay a user's own cards onto every
// card_catalog slot for a Set(+grouping), so "does this catalog row count
// as owned" needs to agree everywhere it's asked: the interactive
// ChecklistAlbum, and the public per-set/per-insert-set progress summaries
// on profiles.

// BaseYard: a catalog row counts as owned when the user has a card whose
// player+team+set+card_number matches — not just cards linked via
// catalog_id, since a card can be manually flagged "Base Set" with no
// catalog match at all.
//
// card_number has to be part of the key: a Base set can legitimately carry
// the same player across more than one checklist slot (e.g. 2026 Topps
// Flagship Football's "BASE CARDS I" + "LEAGUE LEADERS" both list the same
// player under category='Base', or a team's "Team Cards" and "Combo Cards"
// slots, which share player_name literally set to the team name) — all
// real, distinct card_number values under the same player+team+set.
// Omitting card_number here previously collapsed those into one key, so
// uploading a photo for one slot made it appear on every other slot that
// shared player+team+set (confirmed against the real checklist import
// data for Jack Campbell #250/#289, Micah Parsons #72/#287, and Detroit
// Lions Team Cards #273/Combo Cards #299 — this is the actual root cause
// behind all three, not a save/insert bug).
export function ownershipKey(
  playerName: string,
  team: string | null,
  set: string,
  cardNumber: string | null
): string {
  return `${playerName}|${team ?? ""}|${set}|${cardNumber ?? ""}`;
}

// InsertYard: player+team+set alone isn't unique enough — an insert set can
// feature the same player more than once (different parallels/variations
// sharing a catalog row otherwise identical apart from card_number), so the
// printed card number has to be part of the key, same reasoning as
// ownershipKey above (and the same bug — this one just got it right from
// the start instead of hitting it twice).
export function insertOwnershipKey(
  playerName: string,
  team: string | null,
  set: string,
  insertSet: string,
  cardNumber: string | null
): string {
  return `${playerName}|${team ?? ""}|${set}|${insertSet}|${cardNumber ?? ""}`;
}

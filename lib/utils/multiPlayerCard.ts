import { titleCase } from "@/lib/utils/text";

// Multi-player cards (e.g. 2026 Topps Flagship's "AFC REC Leaders", or
// Signature Class's "Paramount Pairings") carry more than one player on the
// same physical card — card_catalog still stores one row per player, all
// sharing the same (set_name, insert_set, card_number), so a naive
// "label = player_name" reads as one arbitrary name from the group instead
// of the name actually printed on the card. This is a display-only
// distinction: ownership matching, search, and Add Card prefill all still
// key off the individual player_name each row carries — see
// ownershipKey/insertOwnershipKey in lib/utils/checklist.ts.

export function multiPlayerKey(setName: string, insertSet: string, cardNumber: string | null): string {
  return `${setName}|${insertSet}|${cardNumber ?? ""}`;
}

interface CatalogRowLike {
  set_name: string;
  insert_set: string | null;
  card_number: string | null;
  player_name: string;
}

// Given a batch of catalog-like rows, returns the set of multiPlayerKey()
// values whose (set_name, insert_set, card_number) combination has more
// than one distinct player_name — a real multi-player card, not just a
// coincidentally-shared card_number. Rows with no insert_set are skipped:
// there's nothing to show instead of player_name for those anyway.
export function findMultiPlayerKeys(rows: CatalogRowLike[]): Set<string> {
  const playersByKey = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.insert_set) continue;
    const key = multiPlayerKey(row.set_name, row.insert_set, row.card_number);
    const players = playersByKey.get(key) ?? new Set<string>();
    players.add(row.player_name);
    playersByKey.set(key, players);
  }

  const result = new Set<string>();
  playersByKey.forEach((players, key) => {
    if (players.size > 1) result.add(key);
  });
  return result;
}

// The label to show for one catalog row's slot/tile/search result: the
// insert set name (Title Case) for a real multi-player card, otherwise the
// player name as before.
export function catalogRowDisplayLabel(row: CatalogRowLike, multiPlayerKeys: Set<string>): string {
  if (row.insert_set && multiPlayerKeys.has(multiPlayerKey(row.set_name, row.insert_set, row.card_number))) {
    return titleCase(row.insert_set);
  }
  return row.player_name;
}

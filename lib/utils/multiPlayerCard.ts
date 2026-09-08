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
  // The specific name printed on a multi-player card (e.g. "AFC Rec
  // Leaders"), separate from insert_set — which, for a card like this, now
  // holds the shared grouping bracket ("LEAGUE LEADERS") instead. Optional
  // so callers that don't select this column (or catalog rows predating
  // it, e.g. Paramount Pairings) can omit/leave it null and fall back to
  // insert_set as before.
  card_title?: string | null;
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

// The label to show for one catalog row's slot/tile/search result: for a
// real multi-player card, card_title (Title Case) if set — the specific
// name actually printed on the card — else the insert_set name (Title
// Case) as a fallback for multi-player inserts that predate card_title
// (e.g. Paramount Pairings); otherwise the player name as before.
export function catalogRowDisplayLabel(row: CatalogRowLike, multiPlayerKeys: Set<string>): string {
  if (row.insert_set && multiPlayerKeys.has(multiPlayerKey(row.set_name, row.insert_set, row.card_number))) {
    return titleCase(row.card_title || row.insert_set);
  }
  return row.player_name;
}

interface SlottableRow extends CatalogRowLike {
  id: string;
}

export interface RowSlot<T> {
  key: string;
  rows: T[];
}

// Groups a Set(+grouping)-scoped batch of catalog rows into one tile per
// physical card: co-featured players on a real multi-player card collapse
// into a single slot (keyed by multiPlayerKey — see the Album components'
// own comments for why ownership then has to check every row in the slot,
// not just one), everything else is its own slot keyed by its own catalog
// id. Preserves first-seen order. Shared between ChecklistAlbum.tsx
// (BaseYard/InsertYard) and PersonalYardAlbum.tsx (TeamYard/PlayerYard) —
// both need the exact same grouping, just for a different "which rows are
// in play right now" filter upstream.
export function groupIntoSlots<T extends SlottableRow>(rows: T[], multiPlayerKeys: Set<string>): RowSlot<T>[] {
  const slotsByKey = new Map<string, RowSlot<T>>();
  const order: string[] = [];
  for (const row of rows) {
    const key =
      row.insert_set && multiPlayerKeys.has(multiPlayerKey(row.set_name, row.insert_set, row.card_number))
        ? multiPlayerKey(row.set_name, row.insert_set, row.card_number)
        : row.id;
    let slot = slotsByKey.get(key);
    if (!slot) {
      slot = { key, rows: [] };
      slotsByKey.set(key, slot);
      order.push(key);
    }
    slot.rows.push(row);
  }
  return order.map((key) => slotsByKey.get(key)!);
}

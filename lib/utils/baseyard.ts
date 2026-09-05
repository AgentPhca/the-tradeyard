// A catalog row (card_catalog, category='Base') counts as "owned" when the
// user has a card matching player+team+set — not just cards linked via
// catalog_id, since a card can be manually flagged "Base Set" with no
// catalog match at all. Shared between the interactive BaseYard checklist
// (StickerAlbum) and the public per-set progress summary on profiles, so
// both agree on what "owned" means.
export function ownershipKey(playerName: string, team: string | null, set: string): string {
  return `${playerName}|${team ?? ""}|${set}`;
}

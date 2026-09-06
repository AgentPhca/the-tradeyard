// Derives a simple display type for a card, used by the Card Detail page's
// "In Your Collection" tiles to badge each version at a glance. Parallel
// takes priority over Insert/Base since it's a modifier that can apply to
// either — a parallel of a Base card is still visually "a Parallel", not
// "a Base".
export type CardTypeBadge = "Base" | "Insert" | "Parallel";

export function deriveCardType(card: { category: string | null; parallel: string | null }): CardTypeBadge {
  if (card.parallel) return "Parallel";
  if (card.category === "Insert") return "Insert";
  return "Base";
}

export const CARD_TYPE_BADGE_CLASSES: Record<CardTypeBadge, string> = {
  Base: "bg-[#14532D] text-[#22C55E]",
  Insert: "bg-[#3C2E5C] text-[#A78BFA]",
  Parallel: "bg-[#1E3A5F] text-[#60A5FA]",
};

export const CARD_TYPE_BORDER_CLASSES: Record<CardTypeBadge, string> = {
  Base: "border-[#22C55E]/40",
  Insert: "border-[#A78BFA]/40",
  Parallel: "border-[#60A5FA]/40",
};

// Shared "how chase-worthy is this card" ranking, used by the Card Detail
// page's "You might also like" marketplace recommendations. Lower tier
// number = more valuable. A relic (patch) + autograph + numbered card is
// the rarest combination a card can carry in this app's data model, a
// plain base card the least.
export function cardValueTier(card: {
  is_relic: boolean;
  is_autograph: boolean;
  print_run: number | null;
}): number {
  const { is_relic: relic, is_autograph: auto } = card;
  const numbered = card.print_run != null;

  if (relic && auto && numbered) return 1;
  if (auto && numbered) return 2;
  if (relic && numbered) return 3;
  if (relic && auto) return 4;
  if (auto) return 5;
  if (relic) return 6;
  if (numbered) return 7;
  return 8;
}

// Short display tag for a recommendation tile, e.g. "Patch+Auto · /25",
// "Auto", or "Base" for a card with none of the chase attributes.
export function cardValueTag(card: {
  is_relic: boolean;
  is_autograph: boolean;
  print_run: number | null;
}): string {
  const flags: string[] = [];
  if (card.is_relic) flags.push("Patch");
  if (card.is_autograph) flags.push("Auto");

  const parts = [flags.join("+"), card.print_run != null ? `/${card.print_run}` : ""].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Base";
}

// Visual weight for a value tag on a Marketplace tile — gold for the
// rarest tier, silver for the next two, the app's usual green accent for a
// single chase attribute, and a plain neutral outline for a base card.
export function cardValueTagClasses(tier: number): string {
  if (tier === 1) return "border-[#EAB308] bg-[#3F2E0A] text-[#EAB308]";
  if (tier <= 3) return "border-[#94A3B8] bg-[#1E293B] text-[#CBD5E1]";
  if (tier <= 7) return "border-primary/50 bg-[#0D2818] text-primary";
  return "border-border bg-[#21262D] text-muted";
}

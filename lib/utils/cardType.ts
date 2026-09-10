import { isInsert, isParallel, isPureBase, type ClassifiableRow } from "@/lib/utils/cardClassification";
import { titleCase } from "@/lib/utils/text";

// Derives a simple display type for a card, used by the Card Detail page's
// "In Your Collection" tiles to badge each version at a glance. Parallel
// takes priority over Insert/Base since it's a modifier that can apply to
// either — a parallel of a Base card is still visually "a Parallel", not
// "a Base". See lib/utils/cardClassification.ts for the underlying rules.
export type CardTypeBadge = "Base" | "Insert" | "Parallel";

export function deriveCardType(card: ClassifiableRow): CardTypeBadge {
  if (isParallel(card)) return "Parallel";
  if (isInsert(card)) return "Insert";
  return "Base";
}

// "Refractor", "Cosmic /50", "Golden Mirror Image Variations", "Base" —
// the manually-tagged parallel name if set, else "Base" for a genuine
// plain Base slot (ignoring a non-null insert_set that's just a PDF-
// section heading like "BASE CARDS I" — see isPureBase), else the insert
// set name (a real insert set, or a photo/design variation name like
// "Golden Mirror Image Variations"), with the print run appended when
// there is one. Shared between the Card Detail page's "Typ" value, its
// "Insert / Parallel" field, and the "In Your Collection" tile subtitle,
// so all three never disagree.
export function typeLabel(card: ClassifiableRow & { print_run: number | null }): string {
  const withPrintRun = (name: string) => (card.print_run != null ? `${name} /${card.print_run}` : name);
  if (card.parallel) return withPrintRun(card.parallel);
  if (isPureBase(card)) return withPrintRun("Base");
  if (card.insert_set) return withPrintRun(titleCase(card.insert_set));
  return withPrintRun("Base");
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

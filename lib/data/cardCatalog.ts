// Reference data for the "Add Card" form.
//
// CARD_SETS is the exact set of distinct `set_name` values found in the
// imported 2025/2026 Topps checklist (see lib/supabase/card_catalog.sql +
// card_catalog_import.sql) — real data, not a placeholder. Note there is no
// "Chrome Black" set in that checklist.
//
// PARALLELS and CONDITIONS remain generic suggestions: the source checklist
// does not include parallel names or print runs at all (every `parallel`
// and `print_run` value in the import is null — that data lives in a
// separate part of the Topps checklists that wasn't captured), so those two
// stay free text / generic dropdowns on the card itself rather than
// catalog-driven.

export const CARD_SETS = [
  "2025 Topps Chrome Football",
  "2025 Topps Cosmic Chrome Football",
  "2025 Topps Finest Football",
  "2025 Topps Resurgence Football",
  "2025 Topps Signature Class Football",
  "2026 Topps Flagship Football",
] as const;

export const PARALLELS = [
  "Base",
  "Refractor",
  "X-Fractor",
  "Prism Refractor",
  "Green Refractor",
  "Blue Refractor",
  "Purple Refractor",
  "Pink Refractor",
  "Gold Refractor",
  "Orange Refractor",
  "Red Refractor",
  "Sepia Refractor",
  "Black Refractor",
  "SuperFractor",
  "Printing Plate",
] as const;

export const CONDITIONS = [
  "Raw",
  "PSA 10",
  "PSA 9",
  "PSA 8",
  "BGS 9.5",
  "BGS 9",
  "SGC 10",
  "SGC 9.5",
] as const;

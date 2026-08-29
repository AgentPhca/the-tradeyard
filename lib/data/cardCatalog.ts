// Reference data for the "Add Card" form.
//
// CARD_SETS is the exact set of distinct `set_name` values found in the
// imported 2025/2026 Topps checklist (see lib/supabase/card_catalog.sql +
// card_catalog_import.sql) — real data, not a placeholder. Note there is no
// "Chrome Black" set in that checklist.
//
// PARALLELS: the imported checklist has no parallel data at all (every
// `parallel` value is null — that data lives in a separate part of the
// Topps checklists that wasn't captured), so this list is a manually
// curated set of the most common 2025 Topps Chrome-family parallels
// instead of being catalog-driven. AUTO_PARALLELS mirrors each entry as
// its autographed version.
//
// CONDITIONS is likewise a generic, non-catalog-driven suggestion list.

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
  "Silver Refractor",
  "Gold Refractor /50",
  "Orange Refractor /25",
  "Red Refractor /10",
  "SuperFractor /1",
  "Teal Refractor /199",
  "Blue Refractor /150",
  "Purple Refractor /99",
  "Aqua Refractor /75",
  "Negative Refractor",
  "Prism Refractor",
] as const;

export const AUTO_PARALLELS = PARALLELS.map((p) => `${p} Auto`);

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

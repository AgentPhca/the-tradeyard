// Reference data for the "Add Card" form.
//
// CARD_SETS is the exact set of distinct `set_name` values found in the
// imported 2025/2026 Topps checklist (see lib/supabase/card_catalog.sql +
// card_catalog_import.sql) — real data, not a placeholder. Note there is no
// "Chrome Black" set in that checklist.
//
// Parallel names now come from public.parallels (see
// lib/supabase/parallels.sql + parallels_seed_real_parallel_data.sql and
// lib/hooks/useParallelsForSet.ts) instead of a static list here.
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

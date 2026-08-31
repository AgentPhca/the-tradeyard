-- ============================================================================
-- The Tradeyard — parallels reference table
--
-- Holds researched, set-accurate parallel names, print runs, and SKU
-- exclusivity for the Add Card form's "Parallel" dropdown, keyed by
-- set_name (text match against card_catalog.set_name / cards.set_name,
-- same convention as card_catalog_insert_sets — there is no `sets` table
-- with a surrogate key in this schema).
--
-- Two sets need an extra selector before the parallel dropdown makes
-- sense, since the same parallel_name means different things depending on
-- it:
--   - Finest: `tier` ('Common' | 'Uncommon' | 'Rare') — the same color name
--     carries a different print run per tier.
--   - Signature Class: `base_type` ('Chrome' | 'Paper') — each card exists
--     in both versions with a distinct parallel ladder.
-- Both columns are null for every other set.
--
-- Run this file first, then parallels_seed_real_parallel_data.sql to load
-- the base-card parallel data. Insert-set-specific parallel ladders (which
-- can differ from these base-card parallels) are a separate, later import.
-- ============================================================================

create table public.parallels (
  id uuid primary key default gen_random_uuid(),
  set_name text not null,
  parallel_name text not null,
  print_run integer,
  sku_exclusivity text,
  tier text,
  base_type text,
  sort_order integer not null
);

create index parallels_set_name_idx on public.parallels (set_name);

-- Reference data: readable by any signed-in user (needed by the Add Card
-- form), never written to by the app itself — imports run with the
-- service role, which bypasses RLS entirely.
alter table public.parallels enable row level security;

create policy "Parallels are viewable by authenticated users"
  on public.parallels for select
  to authenticated
  using (true);

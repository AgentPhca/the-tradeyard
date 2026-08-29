-- ============================================================================
-- The Tradeyard — card attribute columns + insert-set lookup view
--
-- Adds real, checklist-derived attributes to `cards` that the Add Card form
-- previously ignored, and a small view for a fast "Insert Set" dropdown.
--
-- Run this once against an existing database that already has
-- schema.sql + card_catalog.sql + the card_catalog_import/ data loaded.
-- Fresh installs get these `cards` columns from schema.sql directly — this
-- file's ALTER statements are idempotent (IF NOT EXISTS) so it's also safe
-- to run again or on a fresh database.
-- ============================================================================

alter table public.cards
  add column if not exists insert_set text,
  add column if not exists is_variation_of_base boolean not null default false,
  add column if not exists is_autograph boolean not null default false,
  add column if not exists is_relic boolean not null default false;

-- ----------------------------------------------------------------------------
-- card_catalog_insert_sets
-- Small distinct-combinations view so the Add Card form can populate an
-- "Insert Set" dropdown (scoped to the chosen Set) without pulling
-- thousands of individual card_catalog rows to dedupe client-side.
-- ----------------------------------------------------------------------------
create or replace view public.card_catalog_insert_sets as
select distinct
  set_name,
  insert_set,
  category,
  is_variation_of_base,
  is_autograph,
  is_relic
from public.card_catalog
where insert_set is not null;

grant select on public.card_catalog_insert_sets to authenticated;

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
-- One dropdown-worthy row per (set_name, insert_set) so the Add Card /
-- Wishlist / Marketplace forms can populate an "Insert Set" dropdown
-- (scoped to the chosen Set) without pulling thousands of individual
-- card_catalog rows to dedupe client-side.
--
-- `distinct on (set_name, insert_set)` rather than a plain `distinct`
-- across every selected column: the same insert_set text can carry more
-- than one attribute combination (e.g. a plain Insert row and its
-- is_variation_of_base=true photo-variation sibling share the exact same
-- insert_set name — see fix_league_leaders_naming.sql), which a plain
-- `distinct` turned into two separate dropdown rows with identical
-- visible text. `order by ... is_variation_of_base, is_autograph,
-- is_relic` makes the plain, non-variation/non-autograph/non-relic row
-- the representative kept for each (set_name, insert_set) pair, since
-- picking an Insert Set from this dropdown (as opposed to matching an
-- exact catalog row via player search) should default to tagging the
-- card as that plain insert, not as a Parallel/Autograph/Relic.
--
-- `needs_review = false` excludes catalog rows flagged as corrupted
-- (e.g. a checklist-parsing bug that leaked the previous row's raw_line
-- text into insert_set instead of a real product name — see
-- fix_hide_corrupted_insert_tiles.sql) from ever surfacing as a dropdown
-- option, without having to delete the underlying bad data.
create or replace view public.card_catalog_insert_sets as
select distinct on (set_name, insert_set)
  set_name,
  insert_set,
  category,
  is_variation_of_base,
  is_autograph,
  is_relic
from public.card_catalog
where insert_set is not null
  and needs_review = false
order by set_name, insert_set, is_variation_of_base, is_autograph, is_relic;

grant select on public.card_catalog_insert_sets to authenticated;

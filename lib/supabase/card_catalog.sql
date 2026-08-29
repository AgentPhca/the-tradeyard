-- ============================================================================
-- The Tradeyard — card_catalog reference table
--
-- Holds the full Topps 2025/2026 football checklist data (base, insert,
-- autograph, and relic cards) so the "Add Card" form can look up real
-- cards instead of the user typing everything by hand.
--
-- Schema mirrors cards_checklist_import.csv 1:1. Run this file first, then
-- lib/supabase/card_catalog_import.sql to load the ~10,489 rows.
--
-- IMPORTANT — data limitation: the source checklist does NOT include
-- parallel names or print runs (every `parallel` and `print_run` value in
-- the import is null) — those numbers live in a separate part of the
-- Topps checklists (a parallel/print-run legend) that wasn't captured in
-- this CSV. The columns are kept here so they can be backfilled later;
-- until then, `parallel` and `print_run` stay user-entered on the card
-- itself rather than catalog-driven. Also note the checklist's actual set
-- names are 2025 Topps Chrome / Finest / Cosmic Chrome, 2025 Topps
-- Resurgence, 2025 Topps Signature Class, and 2026 Topps Flagship — there
-- is no "Chrome Black" set in this data.
-- ============================================================================

create table public.card_catalog (
  id uuid primary key default gen_random_uuid(),
  set_name text not null,
  insert_set text,
  parallel text,
  player_name text not null,
  team text,
  card_number text,
  is_rookie boolean not null default false,
  print_run integer,
  product_year integer,
  category text,
  class_segment text,
  is_variation_of_base boolean not null default false,
  is_autograph boolean not null default false,
  is_relic boolean not null default false,
  qualifier text,
  needs_review boolean not null default false,
  source_file text,
  source_page integer,
  raw_line text
);

create index card_catalog_set_name_idx on public.card_catalog (set_name);
create index card_catalog_player_name_idx on public.card_catalog (player_name);
create index card_catalog_category_idx on public.card_catalog (category);

-- Reference data: readable by any signed-in user (needed by the Add Card
-- form), never written to by the app itself — imports run with the
-- service role, which bypasses RLS entirely.
alter table public.card_catalog enable row level security;

create policy "Card catalog is viewable by authenticated users"
  on public.card_catalog for select
  to authenticated
  using (true);

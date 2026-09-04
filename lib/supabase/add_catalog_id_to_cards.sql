-- ============================================================================
-- The Tradeyard — add cards.catalog_id
--
-- Until now, a card's card_catalog row was only ever inferred after the
-- fact by matching set_name/insert_set/card_number/player_name text —
-- fragile, and the reason most existing cards.category is null even when
-- their insert_set clearly names a real catalog entry (e.g. "RESURGENCE
-- ROOKIE RELIC SIGNATURES", "PROTONYX"). Storing the catalog row's own id
-- at creation time (CardForm.tsx, when a user picks a player-search result)
-- makes card_number/is_rookie/category come from the exact row the user
-- selected, not a later best-effort text rematch.
--
-- NULL is expected and fine for cards with no catalog match (the "Other"
-- free-text path, or a search that found nothing) — see
-- backfill_is_rookie_category_from_catalog.sql for how those still get a
-- best-effort category/is_rookie via text matching.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.cards
  add column if not exists catalog_id uuid references public.card_catalog(id);

create index if not exists cards_catalog_id_idx on public.cards (catalog_id);

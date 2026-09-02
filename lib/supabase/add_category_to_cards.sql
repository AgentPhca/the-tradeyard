-- ============================================================================
-- The Tradeyard — add cards.category
--
-- card_catalog has always had category (Base/Insert/Autograph/Relic), but it
-- was never mirrored onto cards — so a user's own card rows had no way to
-- record which of the four it is. Needed for the Collection page's BaseYard
-- filter (category = 'Base') to be meaningful rather than a filter that can
-- never match anything.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.cards
  add column if not exists category text;

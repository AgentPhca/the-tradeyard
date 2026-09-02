-- ============================================================================
-- The Tradeyard — add cards.is_rookie
--
-- card_catalog has always had is_rookie, but it was never mirrored onto
-- cards the way is_autograph/is_relic were — so a user's own card rows had
-- no way to record "this is a rookie card" at all. Needed for the
-- Marketplace's new Rookie filter (For Trade tab) to be meaningful rather
-- than a checkbox that can never match anything.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.cards
  add column if not exists is_rookie boolean not null default false;

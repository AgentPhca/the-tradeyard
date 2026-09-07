-- ============================================================================
-- The Tradeyard — Personal Yard (minimal scope)
--
-- Lets a user pin either a favorite player or a favorite team, so the
-- Dashboard can build them a one-off checklist yard out of it (same
-- ownership-matching approach as BaseYard/InsertYard, filtered by
-- player_name or team instead of category). Deliberately minimal: this is
-- just the two columns the Dashboard's promo/progress slide and Yards-grid
-- tile need — no dedicated "Personal Yards" profile tab exists yet, that
-- remains a separate feature. Both null means "not configured", which is
-- the promo/empty-state case.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists personal_yard_type text check (personal_yard_type in ('player', 'team')),
  add column if not exists personal_yard_value text;

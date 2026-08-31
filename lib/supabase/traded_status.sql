-- ============================================================================
-- The Tradeyard — Traded card status migration
--
-- Adds a third card status, 'traded', for cards that have completed a
-- trade. Traded cards are excluded from the Marketplace and the active
-- Collection grid by the application (via status filters) and instead
-- surface in a dedicated "Traded" tab on the owner's profile.
--
-- cards.traded_at records when a card was marked traded, so the Traded
-- tab can show history in chronological order.
--
-- Note: ALTER TYPE ... ADD VALUE cannot be used in the same transaction
-- as a statement that reads the new value, but nothing later in this
-- script (or the app) needs to do that, so it's safe to run as-is.
--
-- Safe to run more than once.
-- ============================================================================

alter type public.card_status add value if not exists 'traded';

alter table public.cards add column if not exists traded_at timestamptz;

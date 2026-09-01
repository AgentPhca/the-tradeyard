-- ============================================================================
-- The Tradeyard — add cards.card_number
--
-- Clears up three previously-conflated "number" concepts on a card:
--   - card_number (new): printed on the card itself (e.g. "88", "RC-15"),
--     independent of parallel/print run — same meaning as
--     card_catalog.card_number. Existed nowhere on `cards` before this.
--   - print_run (unchanged): the total size of a parallel's numbering
--     (e.g. 99 for a "/99" card); null means unnumbered.
--   - serial_number (unchanged column, renamed in the UI to "Numbered #"):
--     this specific copy's number within that print run (e.g. "10" on a
--     10/99 card) — meaningless without a print_run, so the Add/Edit Card
--     form now only enables it once print_run has a value.
--
-- No existing column is renamed here — only card_number is new — so no
-- data migration is needed for serial_number/print_run. Safe to run more
-- than once.
-- ============================================================================

alter table public.cards
  add column if not exists card_number text;

-- ============================================================================
-- The Tradeyard — one-time backfill: is_variation_of_base for ANY card that
-- carries a manually-tagged Parallel, superseding
-- backfill_is_variation_of_base_for_parallel_insert.sql.
--
-- That earlier backfill only corrected a Parallel tagged on top of a real
-- Insert Set (e.g. Matthew Stafford #91TF-22, "1991 Topps Football" +
-- "Silver Crackle"), deliberately leaving a Parallel of a plain Base card
-- untouched — at the time that combination was believed to be outside the
-- bug's scope. It wasn't: Nick Bosa's "Black /70" parallel of a plain
-- Base card (no Insert Set chosen at all) showed the exact same collision
-- one level down — isPureBase() (lib/utils/cardClassification.ts) never
-- checks `parallel` either, so that card kept is_variation_of_base = false
-- and satisfied the plain Base card's own BaseYard slot.
--
-- The rule (and CardForm.tsx's submit-time fix, see finalIsVariationOfBase)
-- is now unconditional: a manually-tagged Parallel always means this row
-- is a parallel VERSION of whatever it's a parallel of, never the plain
-- insert/base itself — regardless of whether an Insert Set is chosen.
-- This backfill matches that exactly, with no category/Chrome-Base carve-
-- out needed anymore (the previous script's carve-out is now obsolete —
-- every case it deliberately skipped is precisely what this one corrects).
--
-- Only ever moves is_variation_of_base false -> true, never true -> false.
-- Safe to run even if backfill_is_variation_of_base_for_parallel_insert.sql
-- already ran — those rows are already true and won't match the WHERE
-- clause again. Safe to run more than once for the same reason.
--
-- Run the PREFLIGHT block below first (read-only) to see how many rows
-- would actually change before running the UPDATE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PREFLIGHT (read-only) — run this first.
-- ---------------------------------------------------------------------------
select count(*) as would_be_corrected
from public.cards
where parallel is not null
  and is_variation_of_base = false;

-- Row-level view of the same set, if you want to eyeball the actual cards
-- before committing to the UPDATE below. insert_set is shown so you can
-- see which rows are the already-covered Insert case vs. the newly-covered
-- plain-Base case (insert_set null or a checklist section heading).
select id, player_name, team, set_name, card_number, insert_set, parallel,
       category, is_variation_of_base
from public.cards
where parallel is not null
  and is_variation_of_base = false
order by set_name, insert_set nulls first, parallel;

-- ---------------------------------------------------------------------------
-- BACKFILL — only run after reviewing the preflight numbers above.
-- ---------------------------------------------------------------------------
update public.cards
set is_variation_of_base = true
where parallel is not null
  and is_variation_of_base = false;

-- ---------------------------------------------------------------------------
-- VERIFY — spot-check the Nick Bosa row + the aggregate count.
-- ---------------------------------------------------------------------------
select id, player_name, insert_set, parallel, category, is_variation_of_base, print_run
from public.cards
where player_name = 'Nick Bosa'
  and parallel = 'Black';

select count(*) as still_false_after_backfill
from public.cards
where parallel is not null
  and is_variation_of_base = false;

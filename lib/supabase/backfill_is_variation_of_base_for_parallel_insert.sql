-- ============================================================================
-- The Tradeyard — one-time backfill: is_variation_of_base for cards that
-- carry BOTH a manually-tagged Parallel AND a real Insert Set.
--
-- Bug (see CardForm.tsx's handleInsertSetChange / the submit-time
-- finalIsVariationOfBase fix): choosing a real Insert Set sets
-- is_variation_of_base = false (correct for the plain insert), but that's
-- independent of the separate Parallel field — tagging a Parallel on top
-- of it never touched is_variation_of_base. A card saved with both ends up
-- identical, on every field isInsert() (lib/utils/cardClassification.ts)
-- checks, to the real insert row for the same slot: !is_variation_of_base
-- && category !== 'Base'. Both then satisfy isInsert() and share the same
-- insertOwnershipKey, so ChecklistAlbum's InsertYard ownedByKey map (which
-- keeps only the first match per key) can end up keyed to whichever one
-- happens to iterate first — observed live for Matthew Stafford #91TF-22,
-- "1991 Topps Football" + "Silver Crackle".
--
-- The forward-fix in CardForm.tsx is scoped to real Insert Sets only, not
-- a Parallel of a plain "Base (no insert set)" card — isInsert() already
-- excludes a Base-category row via category alone, and isParallel()
-- already treats any `parallel` value as a Parallel regardless of
-- is_variation_of_base, so no collision exists there. This backfill uses
-- the exact same scope: it only touches a row that is NOT a pure-Base
-- slot to begin with (mirrors isPureBase() in lib/utils/
-- cardClassification.ts, restricted to the is_variation_of_base = false
-- rows this script even considers) — category is distinct from 'Base', OR
-- category = 'Base' but insert_set is a "CHROME BASE" tier (already
-- treated as a Parallel-of-Base elsewhere, see isChromeBaseInsertSet).
-- A genuine Parallel of a genuine plain Base card (category = 'Base',
-- insert_set holding only a checklist section heading like "ROOKIES") is
-- deliberately left untouched — it was never part of this bug.
--
-- Only ever moves is_variation_of_base false -> true, never true -> false.
-- Safe to run more than once — already-corrected rows simply won't match
-- the WHERE clause again.
--
-- Run the PREFLIGHT block below first (read-only) to see how many rows
-- would actually change before running the UPDATE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PREFLIGHT (read-only) — run this first.
-- ---------------------------------------------------------------------------
select
  count(*) as raw_count_parallel_and_insert_set,
  count(*) filter (
    where category is distinct from 'Base'
       or upper(insert_set) like '%CHROME%'
  ) as would_be_corrected,
  count(*) filter (
    where category = 'Base'
      and upper(insert_set) not like '%CHROME%'
  ) as left_untouched_parallel_of_plain_base
from public.cards
where parallel is not null
  and insert_set is not null
  and is_variation_of_base = false;

-- Row-level view of the same breakdown, if you want to eyeball the actual
-- cards before committing to the UPDATE below.
select id, player_name, team, set_name, card_number, insert_set, parallel,
       category, is_variation_of_base,
       (category is distinct from 'Base' or upper(insert_set) like '%CHROME%')
         as will_be_corrected
from public.cards
where parallel is not null
  and insert_set is not null
  and is_variation_of_base = false
order by will_be_corrected desc, set_name, insert_set;

-- ---------------------------------------------------------------------------
-- BACKFILL — only run after reviewing the preflight numbers above.
-- ---------------------------------------------------------------------------
update public.cards
set is_variation_of_base = true
where parallel is not null
  and insert_set is not null
  and is_variation_of_base = false
  and (
    category is distinct from 'Base'
    or upper(insert_set) like '%CHROME%'
  );

-- ---------------------------------------------------------------------------
-- VERIFY — spot-check the Stafford row + the aggregate count.
-- ---------------------------------------------------------------------------
select id, player_name, insert_set, parallel, category, is_variation_of_base
from public.cards
where set_name = '2026 Topps Flagship Football'
  and card_number = '91TF-22'
  and player_name = 'Matthew Stafford';

select count(*) as still_false_after_backfill
from public.cards
where parallel is not null
  and insert_set is not null
  and is_variation_of_base = false
  and (
    category is distinct from 'Base'
    or upper(insert_set) like '%CHROME%'
  );

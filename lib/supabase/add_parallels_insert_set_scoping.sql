-- The Tradeyard: scope insert-specific parallel ladders to their insert set
--
-- Today every parallels row for a set shows up for every card in that set,
-- including insert cards — editing a Pressure Cookers card shows Mojo's
-- color ladder in the Parallel dropdown too, and vice versa. This adds
-- parallels.insert_set (nullable text, same null-is-universal convention
-- as tier/base_type) and assigns it on the three insert-specific ladders
-- already in the table: 1991 Topps Football Chrome ("Mojo"), Rookie Mojo,
-- and Pressure Cookers — all under 2026 Topps Flagship Football.
--
-- Run this before deploying the CardForm.tsx / useParallelsForSet.ts
-- changes that filter by it.

alter table public.parallels add column if not exists insert_set text;

-- 1991 Topps Football Chrome ("Mojo") — every row here was seeded by
-- flagship_1991_chrome_insert_cards.sql with a "(1991 Chrome)" suffix on
-- parallel_name, so this match is exact and safe to run as-is.
update public.parallels
set insert_set = '1991 Topps Football Chrome'
where set_name = '2026 Topps Flagship Football'
  and parallel_name ilike '%(1991 Chrome)%';

-- Pressure Cookers — matches card_catalog's insert_set spelling
-- ('PRESSURE COOKERS', see card_catalog_import/part_15_of_21.sql). Neither
-- this ladder's parallel rows nor Rookie Mojo's are in any seed file in
-- this repo, so unlike the update above, this one is a best guess at the
-- live table's naming (mirroring the "(<Insert Set>)" suffix convention
-- used for 1991 Chrome) rather than something checked against real data.
update public.parallels
set insert_set = 'PRESSURE COOKERS'
where set_name = '2026 Topps Flagship Football'
  and insert_set is null
  and (parallel_name ilike '%pressure cooker%' or sku_exclusivity ilike '%pressure cooker%');

-- Rookie Mojo — real insert_set spelling in card_catalog is unconfirmed
-- (no seed file in this repo mentions it at all), so this matches loosely
-- on "rookie mojo" wherever it appears and sets insert_set to that same
-- text. If card_catalog actually spells it differently (e.g. all caps, or
-- without a space), re-run with insert_set set to the exact matching
-- string instead once confirmed.
update public.parallels
set insert_set = 'Rookie Mojo'
where set_name = '2026 Topps Flagship Football'
  and insert_set is null
  and (parallel_name ilike '%rookie mojo%' or sku_exclusivity ilike '%rookie mojo%');

-- Verify: row counts per insert_set for this set. The 1991 Chrome count
-- should be exactly 6 (see flagship_1991_chrome_insert_cards.sql). If
-- Pressure Cookers or Rookie Mojo show 0 rows, their real parallel_name/
-- sku_exclusivity text doesn't contain the strings this migration matched
-- on — check the actual rows (the broadly-applicable/null block below)
-- and adjust the two UPDATEs above to match their real wording, then
-- re-run just those two statements.
select insert_set, count(*) as parallel_count
from public.parallels
where set_name = '2026 Topps Flagship Football'
group by insert_set
order by insert_set nulls first;

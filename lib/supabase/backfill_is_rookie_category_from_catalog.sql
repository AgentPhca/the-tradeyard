-- ============================================================================
-- The Tradeyard — one-time backfill: cards.is_rookie / cards.category from
-- card_catalog, for cards created before those columns/autofill existed.
--
-- Run add_is_rookie_to_cards.sql and add_category_to_cards.sql first.
--
-- Matching key: (set_name, insert_set, card_number, player_name) — the most
-- specific identity available on both tables (card_catalog has no unique
-- constraint on this combination, so duplicates are possible in the raw
-- imported checklist). A card is only touched when this combination matches
-- EXACTLY ONE card_catalog row; anything ambiguous (0 or >1 matches) is left
-- untouched rather than guessed at.
--
-- Deliberately conservative in what it overwrites:
--   - category only ever moves null -> a value. It is null on every
--     pre-fix row today (brand new column), so this can never clobber a
--     real decision.
--   - is_rookie only ever moves false -> true, never true -> false, since a
--     deliberately-corrected false looks identical to a never-touched
--     false and the two can't be told apart after the fact.
--
-- Run the PREFLIGHT block below first (read-only) to see how many of your
-- cards would actually be affected before running the UPDATE.
-- Safe to run more than once — already-backfilled rows simply won't change
-- again (category is no longer null; is_rookie is already true where it
-- would be set true).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PREFLIGHT (read-only) — run this first.
-- ---------------------------------------------------------------------------
with candidate_matches as (
  select
    c.id as card_id,
    cc.id as catalog_id
  from public.cards c
  join public.card_catalog cc
    on cc.set_name = c.set_name
    and coalesce(cc.insert_set, '') = coalesce(c.insert_set, '')
    and cc.card_number = c.card_number
    and cc.player_name = c.player_name
  where c.set_name is not null
    and c.card_number is not null
    and c.player_name is not null
),
match_counts as (
  select card_id, count(*) as n
  from candidate_matches
  group by card_id
)
select
  (select count(*) from public.cards) as total_cards,
  (select count(*) from match_counts where n = 1) as uniquely_matched,
  (select count(*) from match_counts where n > 1) as ambiguous_skipped,
  (select count(*) from public.cards c
     where not exists (select 1 from match_counts mc where mc.card_id = c.id)
  ) as no_catalog_match_skipped,
  (select count(*) from public.cards c
     join match_counts mc on mc.card_id = c.id and mc.n = 1
     where c.category is null
  ) as would_set_category,
  (select count(*) from public.cards c
     join candidate_matches cand on cand.card_id = c.id
     join match_counts mc on mc.card_id = c.id and mc.n = 1
     join public.card_catalog cc on cc.id = cand.catalog_id
     where c.is_rookie = false and cc.is_rookie = true
  ) as would_flip_is_rookie_to_true;

-- ---------------------------------------------------------------------------
-- BACKFILL — only run after reviewing the preflight numbers above.
-- ---------------------------------------------------------------------------
with candidate_matches as (
  select
    c.id as card_id,
    cc.is_rookie as catalog_is_rookie,
    cc.category as catalog_category
  from public.cards c
  join public.card_catalog cc
    on cc.set_name = c.set_name
    and coalesce(cc.insert_set, '') = coalesce(c.insert_set, '')
    and cc.card_number = c.card_number
    and cc.player_name = c.player_name
  where c.set_name is not null
    and c.card_number is not null
    and c.player_name is not null
),
match_counts as (
  select card_id, count(*) as n
  from candidate_matches
  group by card_id
),
unique_matches as (
  select cm.card_id, cm.catalog_is_rookie, cm.catalog_category
  from candidate_matches cm
  join match_counts mc on mc.card_id = cm.card_id and mc.n = 1
)
update public.cards
set
  category = coalesce(cards.category, unique_matches.catalog_category),
  is_rookie = cards.is_rookie or unique_matches.catalog_is_rookie
from unique_matches
where cards.id = unique_matches.card_id;

-- ---------------------------------------------------------------------------
-- VERIFY — spot-check the result.
-- ---------------------------------------------------------------------------
select category, count(*) from public.cards group by category order by category;
select is_rookie, count(*) from public.cards group by is_rookie;

-- ============================================================================
-- The Tradeyard — one-time backfill: cards.catalog_id / is_rookie / category
-- from card_catalog, for cards created before catalog_id existed (or before
-- is_rookie/category autofill existed).
--
-- Run add_is_rookie_to_cards.sql, add_category_to_cards.sql, and
-- add_catalog_id_to_cards.sql first.
--
-- UPDATED from the first version of this file: now also sets catalog_id,
-- not just is_rookie/category. If you already ran the previous version,
-- re-running this one is still worthwhile — it'll pick up catalog_id (and
-- re-check is_rookie/category, though those should already be settled).
--
-- Matching key: (set_name, insert_set, card_number, player_name) — the most
-- specific identity available on both tables (card_catalog has no unique
-- constraint on this combination, so duplicates are possible in the raw
-- imported checklist). A card is only touched when this combination matches
-- EXACTLY ONE card_catalog row; anything ambiguous (0 or >1 matches) is left
-- untouched rather than guessed at. Cards going forward don't need this at
-- all — CardForm.tsx now stores catalog_id directly from the exact search
-- result the user picked, so this text-matching fallback only matters for
-- pre-existing rows.
--
-- Deliberately conservative in what it overwrites:
--   - catalog_id and category only ever move null -> a value. Never
--     overwrites an existing catalog_id/category (a card someone already
--     linked correctly, e.g. via the new direct-selection flow, is left
--     alone).
--   - is_rookie only ever moves false -> true, never true -> false, since a
--     deliberately-corrected false looks identical to a never-touched
--     false and the two can't be told apart after the fact.
--
-- Run the PREFLIGHT block below first (read-only) to see how many of your
-- cards would actually be affected before running the UPDATE.
-- Safe to run more than once — already-backfilled rows simply won't change
-- again.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PREFLIGHT (read-only) — run this first.
-- ---------------------------------------------------------------------------
with candidate_matches as (
  select
    c.id as card_id,
    cc.id as matched_catalog_id
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
     where c.catalog_id is null
  ) as would_set_catalog_id,
  (select count(*) from public.cards c
     join match_counts mc on mc.card_id = c.id and mc.n = 1
     where c.category is null
  ) as would_set_category,
  (select count(*) from public.cards c
     join candidate_matches cand on cand.card_id = c.id
     join match_counts mc on mc.card_id = c.id and mc.n = 1
     join public.card_catalog cc on cc.id = cand.matched_catalog_id
     where c.is_rookie = false and cc.is_rookie = true
  ) as would_flip_is_rookie_to_true;

-- ---------------------------------------------------------------------------
-- BACKFILL — only run after reviewing the preflight numbers above.
-- ---------------------------------------------------------------------------
with candidate_matches as (
  select
    c.id as card_id,
    cc.id as matched_catalog_id,
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
  select cm.card_id, cm.matched_catalog_id, cm.catalog_is_rookie, cm.catalog_category
  from candidate_matches cm
  join match_counts mc on mc.card_id = cm.card_id and mc.n = 1
)
update public.cards
set
  catalog_id = coalesce(cards.catalog_id, unique_matches.matched_catalog_id),
  category = coalesce(cards.category, unique_matches.catalog_category),
  is_rookie = cards.is_rookie or unique_matches.catalog_is_rookie
from unique_matches
where cards.id = unique_matches.card_id;

-- ---------------------------------------------------------------------------
-- VERIFY — spot-check the result.
-- ---------------------------------------------------------------------------
select count(*) filter (where catalog_id is not null) as with_catalog_id,
       count(*) filter (where catalog_id is null) as without_catalog_id
from public.cards;
select category, count(*) from public.cards group by category order by category;
select is_rookie, count(*) from public.cards group by is_rookie;

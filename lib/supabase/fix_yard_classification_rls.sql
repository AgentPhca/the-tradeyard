-- ============================================================================
-- The Tradeyard — corrected Base/Insert/Parallel classification (RLS)
--
-- Supersedes the cards select policy from personal_yards_public_visibility
-- .sql, applying the same corrected classification rules the app code now
-- uses (see lib/utils/cardClassification.ts):
--
--   BaseYard:   category = 'Base' AND is_variation_of_base = false
--               AND insert_set NOT ILIKE '%CHROME%' (null-safe)
--   InsertYard: is_variation_of_base = false AND category IS DISTINCT
--               FROM 'Base' — broadened beyond a literal category='Insert'
--               check: an Autograph/Relic-category insert set (e.g. "REAL
--               ONE AUTOGRAPHS", "NFL MATERIAL CARDS") is just as much a
--               trackable checklist as a plain Insert one.
--   TeamYard:   NOT (is_variation_of_base = false AND category = 'Base')
--               — unchanged in shape from the previous policy's intent,
--               just no longer keyed off the always-empty `parallel`
--               column or a bare `insert_set IS NOT NULL` (many genuine
--               Base rows carry a PDF-section-heading insert_set like
--               "BASE CARDS I", so its presence alone said nothing about
--               Base-ness).
--   PlayerYard: unchanged — no category restriction, by design.
--
-- Why this was wrong before: card_catalog.parallel is 0% filled across all
-- 10,489 real catalog rows (verified against the import), so cards.parallel
-- being non-null was never how a catalog-derived variation card (e.g. a
-- Golden Mirror Image Variation) got flagged — is_variation_of_base is.
-- And a plain Base row can carry a non-null insert_set that's just a PDF
-- section heading ("BASE CARDS I", "ROOKIES"), so `insert_set IS NOT NULL`
-- alone was never a reliable "is this a real insert set" signal either.
--
-- Safe to run more than once.
-- ============================================================================

drop policy if exists "Cards are viewable respecting personal collection and yard privacy" on public.cards;

create policy "Cards are viewable respecting personal collection and yard privacy"
  on public.cards for select
  to authenticated
  using (
    status <> 'personal_collection'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = cards.owner_id
        and p.show_personal_collection = true
    )
    or (
      category = 'Base'
      and is_variation_of_base = false
      and (insert_set is null or insert_set not ilike '%CHROME%')
      and exists (
        select 1 from public.profiles p
        where p.id = cards.owner_id
          and p.show_baseyard_publicly = true
      )
    )
    or (
      is_variation_of_base = false
      and category is distinct from 'Base'
      and exists (
        select 1 from public.profiles p
        where p.id = cards.owner_id
          and p.show_insertyard_publicly = true
      )
    )
    or (
      not (is_variation_of_base = false and category = 'Base')
      and exists (
        select 1 from public.profiles p
        where p.id = cards.owner_id
          and p.show_teamyard_publicly = true
          and p.personal_team_yard = cards.team
      )
    )
    or exists (
      select 1 from public.profiles p
      where p.id = cards.owner_id
        and p.show_playeryard_publicly = true
        and p.personal_player_yard = cards.player_name
    )
  );

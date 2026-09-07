-- ============================================================================
-- The Tradeyard — TeamYard/PlayerYard public visibility migration
--
-- Extends the cards select policy (see baseyard_public_visibility.sql /
-- insertyard_public_visibility.sql) so a personal_collection card is also
-- visible to everyone once it matches the owner's pinned TeamYard/
-- PlayerYard AND that yard's own show_*_publicly flag is on — without
-- this, the embedded read-only album on a visitor's view of someone's
-- public profile couldn't read those rows at all under RLS.
--
-- TeamYard's clause additionally requires the card isn't a plain base card
-- (same rule as getTeamYardProgress.ts) — a visitor's TeamYard view never
-- shows base cards, so RLS shouldn't leak them either. PlayerYard has no
-- such restriction, by design (see personal_yards_independent.sql).
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
      and exists (
        select 1 from public.profiles p
        where p.id = cards.owner_id
          and p.show_baseyard_publicly = true
      )
    )
    or (
      insert_set is not null
      and category is distinct from 'Base'
      and exists (
        select 1 from public.profiles p
        where p.id = cards.owner_id
          and p.show_insertyard_publicly = true
      )
    )
    or (
      (parallel is not null or insert_set is not null or is_autograph = true or is_relic = true)
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

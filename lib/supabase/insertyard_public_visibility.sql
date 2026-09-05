-- ============================================================================
-- The Tradeyard — InsertYard public visibility migration
--
-- Adds profiles.show_insertyard_publicly (opt-in, default false): when on, a
-- separate "InsertYard" section appears on the user's public profile
-- showing their Insert-Set completion progress, independently of
-- show_personal_collection and show_baseyard_publicly (a user can mix and
-- match which collecting progress they show off publicly).
--
-- Extends the cards select policy from baseyard_public_visibility.sql so a
-- personal_collection card with a real insert_set (i.e. insert_set is not
-- null and category is not 'Base' — the plain base checklist rows are
-- tagged insert_set='BASE CARDS' in the source data, so category is what
-- actually distinguishes a real insert set) is also visible to everyone
-- once its owner has show_insertyard_publicly = true — without this, the
-- public InsertYard section couldn't read those rows at all under RLS.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists show_insertyard_publicly boolean not null default false;

drop policy if exists "Cards are viewable respecting personal collection privacy" on public.cards;
drop policy if exists "Cards are viewable respecting personal collection and baseyard privacy" on public.cards;
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
  );

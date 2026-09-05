-- ============================================================================
-- The Tradeyard — BaseYard public visibility migration
--
-- Adds profiles.show_baseyard_publicly (opt-in, default false): when on, a
-- separate "BaseYard" section appears on the user's public profile showing
-- their Base-category set-completion progress, independently of
-- show_personal_collection (a user can keep their general collection
-- private while still showing off BaseYard progress, or vice versa).
--
-- Extends the cards select policy from personal_collection_visibility.sql
-- so a personal_collection Base card is also visible to everyone once its
-- owner has show_baseyard_publicly = true — without this, the public
-- BaseYard section couldn't read those rows at all under RLS.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists show_baseyard_publicly boolean not null default false;

drop policy if exists "Cards are viewable respecting personal collection privacy" on public.cards;
drop policy if exists "Cards are viewable respecting personal collection and baseyard privacy" on public.cards;

create policy "Cards are viewable respecting personal collection and baseyard privacy"
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
  );

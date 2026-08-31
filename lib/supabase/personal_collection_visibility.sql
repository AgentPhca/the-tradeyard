-- ============================================================================
-- The Tradeyard — Personal Collection visibility migration
--
-- Adds profiles.show_personal_collection (opt-in, default false): when off,
-- a user's personal_collection cards are only visible to themselves. When
-- on, other authenticated users can browse them read-only — this never
-- enables contact; Kontakt stays for_trade-only regardless of this setting.
--
-- Replaces the old blanket "Cards are viewable by authenticated users"
-- policy (using (true)) with one that enforces this: for_trade and traded
-- cards stay visible to everyone; personal_collection cards are visible
-- only to their owner, or to anyone if the owner has opted in.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists show_personal_collection boolean not null default false;

drop policy if exists "Cards are viewable by authenticated users" on public.cards;
drop policy if exists "Cards are viewable respecting personal collection privacy" on public.cards;

create policy "Cards are viewable respecting personal collection privacy"
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
  );

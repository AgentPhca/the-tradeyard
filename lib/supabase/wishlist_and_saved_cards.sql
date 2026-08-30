-- ============================================================================
-- The Tradeyard — Wishlist (Saved Cards + Looking For) migration
--
-- Run this once against an existing database to add:
--   1. wishlist.insert_set — so "Looking For" requests can specify an
--      Insert Set alongside Set/Parallel, matching the Add Card form.
--   2. saved_cards — a user "hearting" a Marketplace card (Wishlist ->
--      Saved Cards tab). Distinct from wishlist, which is for cards the
--      user doesn't own yet; saved_cards references an actual cards row.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.wishlist add column if not exists insert_set text;

create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_cards_unique_pair unique (user_id, card_id)
);

create index if not exists saved_cards_user_id_idx on public.saved_cards (user_id);
create index if not exists saved_cards_card_id_idx on public.saved_cards (card_id);

alter table public.saved_cards enable row level security;

drop policy if exists "Users can view their own saved cards" on public.saved_cards;
create policy "Users can view their own saved cards"
  on public.saved_cards for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save cards" on public.saved_cards;
create policy "Users can save cards"
  on public.saved_cards for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own saved cards" on public.saved_cards;
create policy "Users can remove their own saved cards"
  on public.saved_cards for delete
  to authenticated
  using (auth.uid() = user_id);

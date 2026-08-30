-- ============================================================================
-- The Tradeyard — PostgreSQL schema (Supabase)
-- "Your trades happen on the Yard"
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- project. Assumes the built-in `auth.users` table managed by Supabase Auth.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('collector', 'retailer', 'streamer');
create type public.card_status as enum ('personal_collection', 'for_trade');
create type public.trade_status as enum ('pending', 'accepted', 'completed', 'declined');

-- ----------------------------------------------------------------------------
-- profiles
-- One row per authenticated user, keyed to auth.users.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'collector',
  bio text,
  created_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

-- ----------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row is inserted.
--
-- `supabase.auth.signUp()` on the client does not always return an
-- authenticated session synchronously (e.g. when email confirmation is
-- required), so a client-side `insert into profiles` right after signUp can
-- run unauthenticated and get rejected by RLS ("new row violates row-level
-- security policy for table profiles"). Provisioning the profile here
-- instead — in a trigger that runs as the function owner (`security
-- definer`), bypassing RLS — means it always succeeds regardless of session
-- state. The app no longer needs to insert into `profiles` itself; it can
-- just read the row this trigger created.
-- ----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'collector')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- cards
-- A single physical card owned by a profile.
--
-- insert_set / is_variation_of_base / is_autograph / is_relic mirror the
-- same-named columns on card_catalog (see card_catalog.sql) — real
-- attributes extracted from the Topps checklists, e.g. insert_set holds
-- names like "Chrome Radiating Rookies" or "Base Cards Team Camo
-- Variation". parallel/serial_number/print_run stay free text/number since
-- the checklists carry no parallel names or print runs at all.
-- ----------------------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  player_name text not null,
  team text,
  set_name text,
  insert_set text,
  is_variation_of_base boolean not null default false,
  parallel text,
  serial_number text,
  print_run integer,
  condition text,
  is_autograph boolean not null default false,
  is_relic boolean not null default false,
  status public.card_status not null default 'personal_collection',
  image_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index cards_owner_id_idx on public.cards (owner_id);
create index cards_status_idx on public.cards (status);
create index cards_player_name_idx on public.cards (player_name);

-- ----------------------------------------------------------------------------
-- conversations
-- One conversation between two profiles (order-independent pairing enforced
-- by application logic when creating a row).
-- ----------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null references public.profiles (id) on delete cascade,
  participant_2 uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (participant_1 <> participant_2),
  constraint conversations_unique_pair unique (participant_1, participant_2)
);

create index conversations_participant_1_idx on public.conversations (participant_1);
create index conversations_participant_2_idx on public.conversations (participant_2);

-- ----------------------------------------------------------------------------
-- messages
-- ----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- trades
-- A proposed or completed 1:1 card trade between two profiles.
-- ----------------------------------------------------------------------------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  initiator_card_id uuid not null references public.cards (id) on delete cascade,
  receiver_card_id uuid not null references public.cards (id) on delete cascade,
  status public.trade_status not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint trades_distinct_participants check (initiator_id <> receiver_id)
);

create index trades_initiator_id_idx on public.trades (initiator_id);
create index trades_receiver_id_idx on public.trades (receiver_id);
create index trades_status_idx on public.trades (status);

-- ----------------------------------------------------------------------------
-- wishlist
-- "Looking For" requests — a card a user wants but doesn't own yet. Browsable
-- by any authenticated user on the Marketplace so owners can offer a trade.
-- ----------------------------------------------------------------------------
create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  player_name text not null,
  team text,
  set_name text,
  insert_set text,
  parallel text,
  notes text,
  created_at timestamptz not null default now()
);

create index wishlist_user_id_idx on public.wishlist (user_id);

-- ----------------------------------------------------------------------------
-- saved_cards
-- A user "hearting" a Marketplace card to keep track of it (Wishlist ->
-- Saved Cards tab). Distinct from `wishlist`, which is for cards the user
-- doesn't own yet — this references an actual existing `cards` row.
-- ----------------------------------------------------------------------------
create table public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_cards_unique_pair unique (user_id, card_id)
);

create index saved_cards_user_id_idx on public.saved_cards (user_id);
create index saved_cards_card_id_idx on public.saved_cards (card_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.trades enable row level security;
alter table public.wishlist enable row level security;
alter table public.saved_cards enable row level security;

-- ----------------------------------------------------------------------------
-- profiles policies
-- Profiles are public read (needed for /profile/[username], navbar avatars,
-- trade partners, etc.) but only editable by their owner.
-- ----------------------------------------------------------------------------
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- cards policies
-- Any authenticated user can browse any card (collections + marketplace are
-- both public within the app); only the owner can create/edit/delete.
-- ----------------------------------------------------------------------------
create policy "Cards are viewable by authenticated users"
  on public.cards for select
  to authenticated
  using (true);

create policy "Users can add cards to their own collection"
  on public.cards for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update their own cards"
  on public.cards for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own cards"
  on public.cards for delete
  to authenticated
  using (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- conversations policies
-- Only the two participants can see or create a conversation.
-- ----------------------------------------------------------------------------
create policy "Participants can view their conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Users can start conversations they participate in"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Participants can update their conversations"
  on public.conversations for update
  to authenticated
  using (auth.uid() = participant_1 or auth.uid() = participant_2)
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

-- ----------------------------------------------------------------------------
-- messages policies
-- Only participants of the parent conversation can read or send messages,
-- and a sender may only post messages as themselves.
-- ----------------------------------------------------------------------------
create policy "Participants can view messages in their conversations"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

create policy "Participants can send messages in their conversations"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- ----------------------------------------------------------------------------
-- trades policies
-- Only the initiator or receiver can see a trade. Only the initiator can
-- propose one (as themselves); either party can update its status (accept,
-- decline, complete).
-- ----------------------------------------------------------------------------
create policy "Participants can view their trades"
  on public.trades for select
  to authenticated
  using (auth.uid() = initiator_id or auth.uid() = receiver_id);

create policy "Users can initiate trades as themselves"
  on public.trades for insert
  to authenticated
  with check (auth.uid() = initiator_id);

create policy "Participants can update their trades"
  on public.trades for update
  to authenticated
  using (auth.uid() = initiator_id or auth.uid() = receiver_id)
  with check (auth.uid() = initiator_id or auth.uid() = receiver_id);

-- ----------------------------------------------------------------------------
-- wishlist policies
-- Wishlists are public read (helps other collectors know what to offer);
-- only the owner can manage their own entries.
-- ----------------------------------------------------------------------------
create policy "Wishlists are viewable by authenticated users"
  on public.wishlist for select
  to authenticated
  using (true);

create policy "Users can add to their own wishlist"
  on public.wishlist for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own wishlist entries"
  on public.wishlist for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own wishlist entries"
  on public.wishlist for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- saved_cards policies
-- Strictly private — only the saver can see, create, or remove their own
-- saved-card entries.
-- ----------------------------------------------------------------------------
create policy "Users can view their own saved cards"
  on public.saved_cards for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can save cards"
  on public.saved_cards for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own saved cards"
  on public.saved_cards for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- Storage — card photo uploads
--
-- Photos are uploaded to a `card-photos` bucket under a per-user folder
-- (`<user id>/<filename>`), so ownership can be checked from the storage
-- path alone without a separate metadata table.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('card-photos', 'card-photos', true)
on conflict (id) do nothing;

create policy "Card photos are publicly viewable"
  on storage.objects for select
  to public
  using (bucket_id = 'card-photos');

create policy "Users can upload card photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own card photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own card photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

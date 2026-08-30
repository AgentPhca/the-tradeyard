-- ============================================================================
-- The Tradeyard — Profile social fields, Follow, Ratings, and Inbox
-- migration
--
-- Run this once against an existing database. Adds:
--   1. profiles.twitch_url / whatnot_url / website_url — Edit Profile links.
--   2. followers — follower_id follows followee_id.
--   3. ratings — a 1-5 star rating left after a completed trade.
--   4. conversation_reads — per-user last-read marker for the Inbox.
--   5. handle_new_message trigger — keeps conversations.last_message_at
--      current and marks a message read by its own sender.
--   6. unread_message_count() — total unread count for the Inbox badge.
--   7. avatars storage bucket + policies (same per-user-folder pattern as
--      card-photos).
--   8. Adds public.messages to the supabase_realtime publication so the
--      Inbox gets live updates.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles add column if not exists twitch_url text;
alter table public.profiles add column if not exists whatnot_url text;
alter table public.profiles add column if not exists website_url text;

-- ----------------------------------------------------------------------------
-- conversation_reads
-- ----------------------------------------------------------------------------
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "Users can view their own read markers" on public.conversation_reads;
create policy "Users can view their own read markers"
  on public.conversation_reads for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can set their own read markers" on public.conversation_reads;
create policy "Users can set their own read markers"
  on public.conversation_reads for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_reads.conversation_id
        and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

drop policy if exists "Users can update their own read markers" on public.conversation_reads;
create policy "Users can update their own read markers"
  on public.conversation_reads for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- handle_new_message trigger
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (new.conversation_id, new.sender_id, new.created_at)
  on conflict (conversation_id, user_id)
  do update set last_read_at = excluded.last_read_at;

  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ----------------------------------------------------------------------------
-- unread_message_count()
-- ----------------------------------------------------------------------------
create or replace function public.unread_message_count()
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(count(m.id), 0)::integer
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  left join public.conversation_reads r
    on r.conversation_id = m.conversation_id and r.user_id = auth.uid()
  where (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    and m.sender_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz);
$$;

grant execute on function public.unread_message_count() to authenticated;

-- ----------------------------------------------------------------------------
-- ratings
-- ----------------------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint ratings_unique_per_trade_rater unique (trade_id, rater_id),
  constraint ratings_no_self_rating check (rater_id <> ratee_id)
);

create index if not exists ratings_ratee_id_idx on public.ratings (ratee_id);
create index if not exists ratings_trade_id_idx on public.ratings (trade_id);

alter table public.ratings enable row level security;

drop policy if exists "Ratings are viewable by authenticated users" on public.ratings;
create policy "Ratings are viewable by authenticated users"
  on public.ratings for select
  to authenticated
  using (true);

drop policy if exists "Users can rate a completed trade they were part of" on public.ratings;
create policy "Users can rate a completed trade they were part of"
  on public.ratings for insert
  to authenticated
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from public.trades t
      where t.id = ratings.trade_id
        and t.status = 'completed'
        and (
          (t.initiator_id = ratings.rater_id and t.receiver_id = ratings.ratee_id)
          or (t.receiver_id = ratings.rater_id and t.initiator_id = ratings.ratee_id)
        )
    )
  );

-- ----------------------------------------------------------------------------
-- followers
-- ----------------------------------------------------------------------------
create table if not exists public.followers (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint followers_no_self_follow check (follower_id <> followee_id)
);

create index if not exists followers_follower_id_idx on public.followers (follower_id);
create index if not exists followers_followee_id_idx on public.followers (followee_id);

alter table public.followers enable row level security;

drop policy if exists "Follows are viewable by authenticated users" on public.followers;
create policy "Follows are viewable by authenticated users"
  on public.followers for select
  to authenticated
  using (true);

drop policy if exists "Users can follow as themselves" on public.followers;
create policy "Users can follow as themselves"
  on public.followers for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow as themselves" on public.followers;
create policy "Users can unfollow as themselves"
  on public.followers for delete
  to authenticated
  using (auth.uid() = follower_id);

-- ----------------------------------------------------------------------------
-- avatars storage bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly viewable" on storage.objects;
create policy "Avatars are publicly viewable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload avatars to their own folder" on storage.objects;
create policy "Users can upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Realtime — add messages to the existing supabase_realtime publication
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

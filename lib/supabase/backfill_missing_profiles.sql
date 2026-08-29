-- ============================================================================
-- The Tradeyard — backfill profiles for pre-existing auth.users rows
--
-- cards.owner_id (and trades/messages/wishlist/conversations) reference
-- profiles(id), not auth.users(id) directly. Any account created before
-- the on_auth_user_created trigger existed (see schema.sql) has a row in
-- auth.users but no matching row in profiles, so inserting a card for that
-- user fails with a "cards_owner_id_fkey" foreign key violation even
-- though the user genuinely exists and is logged in.
--
-- Run this once to create the missing profiles rows for any such account.
-- Safe to run more than once — it only inserts rows that don't already
-- exist. New signups don't need this; the trigger handles them.
-- ============================================================================

insert into public.profiles (id, username, role)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'username',
    split_part(u.email, '@', 1) || '-' || substr(u.id::text, 1, 6)
  ),
  coalesce((u.raw_user_meta_data ->> 'role')::public.user_role, 'collector')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

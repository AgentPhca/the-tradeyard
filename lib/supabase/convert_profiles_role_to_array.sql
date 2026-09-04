-- ============================================================================
-- The Tradeyard — convert profiles.role from a single user_role to
-- user_role[]
--
-- A user can now hold more than one role at once (e.g. Collector AND
-- Streamer). Existing single values are migrated into a one-element array
-- so no data is lost. The default must be dropped before the type change
-- (Postgres can't auto-cast an existing scalar default to an array type)
-- and re-added afterwards.
--
-- Run this AFTER add_owner_admin_roles.sql if you're running both — though
-- neither actually depends on the other (this migration doesn't reference
-- 'owner'/'admin' at all, it just wraps whatever value is already there).
--
-- NOT safe to run twice as-is: a second run's `using array[role]::...`
-- would try to wrap an already-array column, which errors. If you need to
-- re-run this file, drop the `using` clause's outer array[...] first, or
-- just skip it — check with the verification query below.
-- ============================================================================

alter table public.profiles
  alter column role drop default;

alter table public.profiles
  alter column role type public.user_role[]
  using array[role]::public.user_role[];

alter table public.profiles
  alter column role set default array['collector']::public.user_role[];

-- The signup trigger inserts a single role from auth metadata — update it
-- to wrap that value in an array too.
create or replace function public.handle_new_user()
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
    array[coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'collector')]::public.user_role[]
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- VERIFY
-- ---------------------------------------------------------------------------
-- Confirms the column is now an array type and every existing row's data
-- survived the conversion (each should show its original single role,
-- wrapped in {}).
select id, username, role, pg_typeof(role) from public.profiles limit 20;

-- ============================================================================
-- The Tradeyard — repair the parallels SELECT policy
--
-- lib/supabase/parallels.sql already defines
--   create policy "Parallels are viewable by authenticated users"
--     on public.parallels for select to authenticated using (true);
-- (same convention as card_catalog.sql). If that file was run before the
-- policy statement was added, or the CREATE POLICY step failed/was skipped
-- for any reason while the table itself was created and seeded, RLS is
-- enabled on parallels with zero policies attached — every select from the
-- browser (anon or authenticated) then silently returns 0 rows, no error,
-- which is exactly the "Parallel dropdown is empty" symptom.
--
-- This file only (re)asserts that one policy. Safe to run more than once,
-- and safe to run whether or not the policy already exists correctly.
-- ============================================================================

drop policy if exists "Parallels are viewable by authenticated users" on public.parallels;

create policy "Parallels are viewable by authenticated users"
  on public.parallels for select
  to authenticated
  using (true);

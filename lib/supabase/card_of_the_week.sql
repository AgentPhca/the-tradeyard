-- ============================================================================
-- The Tradeyard — card_of_the_week
--
-- Cache table for the Dashboard's "Card of the Week" hero slide. Computed
-- once per week by a Vercel Cron job (see app/api/cron/card-of-the-week/
-- route.ts) hitting on every Monday, not recalculated on every page view —
-- otherwise a tie between candidate cards could resolve differently between
-- two requests in the same week.
--
-- One row per week: week_start_date is that week's Monday (the week the
-- card is DISPLAYED in, not the week it was created in — the cron always
-- selects from the PREVIOUS calendar week). card_id is null when no
-- candidate card qualified that week, so the dashboard can tell "computed,
-- nothing qualified" apart from "not computed yet" (missing row) — both
-- render the same empty state today, but keeping them distinct costs
-- nothing and avoids the cron re-running every request while a week stays
-- empty.
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists public.card_of_the_week (
  week_start_date date primary key,
  card_id uuid references public.cards (id) on delete set null,
  computed_at timestamptz not null default now()
);

alter table public.card_of_the_week enable row level security;

drop policy if exists "Card of the week is viewable by authenticated users" on public.card_of_the_week;

create policy "Card of the week is viewable by authenticated users"
  on public.card_of_the_week for select
  to authenticated
  using (true);

-- No insert/update/delete policy: the cron route writes via the
-- service-role client (lib/supabase/service.ts), which bypasses RLS.

-- ============================================================================
-- The Tradeyard — Personal Yards become independent (Team + Player)
--
-- Supersedes personal_yard.sql's single personal_yard_type/personal_yard_value
-- pair (mutually exclusive — a user could pin a team OR a player, never
-- both) with two independent, simultaneously-settable columns, so a user
-- can have a TeamYard and a PlayerYard at once. Each gets its own
-- public-visibility flag, following the exact same opt-in/default-false
-- convention as show_baseyard_publicly/show_insertyard_publicly.
--
-- Migrates any existing personal_yard_type/personal_yard_value data into
-- the new columns before dropping the old ones, so nobody who already
-- configured a Personal Yard under the old model loses it.
--
-- Safe to run more than once (the data migration UPDATEs are no-ops once
-- the old columns are gone, and every ALTER uses IF [NOT] EXISTS).
-- ============================================================================

alter table public.profiles
  add column if not exists personal_team_yard text,
  add column if not exists personal_player_yard text,
  add column if not exists show_teamyard_publicly boolean not null default false,
  add column if not exists show_playeryard_publicly boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'personal_yard_type'
  ) then
    update public.profiles
      set personal_team_yard = personal_yard_value
      where personal_yard_type = 'team' and personal_team_yard is null;

    update public.profiles
      set personal_player_yard = personal_yard_value
      where personal_yard_type = 'player' and personal_player_yard is null;

    alter table public.profiles drop column personal_yard_type;
    alter table public.profiles drop column personal_yard_value;
  end if;
end $$;

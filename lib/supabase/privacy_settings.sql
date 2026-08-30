-- ============================================================================
-- The Tradeyard — Privacy Settings migration
--
-- Adds profiles.allow_contact, backing the "Allow others to contact me"
-- toggle in the profile dropdown menu. Defaults to true so existing users
-- keep receiving Kontakt requests unless they opt out. Enforced in the app
-- by hiding the Kontakt button wherever a card/request's owner has this
-- set to false — there's no DB-level restriction, since messaging RLS
-- already only requires the two participants' consent to create a
-- conversation, and a UI-level gate is sufficient for this preference.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles add column if not exists allow_contact boolean not null default true;

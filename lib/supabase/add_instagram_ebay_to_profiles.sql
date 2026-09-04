-- ============================================================================
-- The Tradeyard — add profiles.instagram_url / profiles.ebay_url
--
-- Two more social links alongside twitch_url/whatnot_url/website_url.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.profiles
  add column if not exists instagram_url text;

alter table public.profiles
  add column if not exists ebay_url text;

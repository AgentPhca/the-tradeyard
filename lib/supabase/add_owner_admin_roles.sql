-- ============================================================================
-- The Tradeyard — add 'owner'/'admin' to the user_role enum
--
-- These two values are never selectable in the app's own UI (see
-- ProfileForm.tsx's SELECTABLE_ROLES, hardcoded to
-- ['collector','retailer','streamer']) — they exist purely so a profile can
-- be marked as owner/admin manually via SQL, e.g.:
--
--   update public.profiles
--   set role = role || array['admin']::public.user_role[]
--   where username = 'someusername';
--
-- (`||` appends to the existing role array rather than replacing it, so the
-- user keeps whatever normal roles they already had.)
--
-- ALTER TYPE ... ADD VALUE cannot be combined, in the same transaction,
-- with a statement that USES the new value — this file only adds the
-- values and does nothing else, so it's safe to run as-is.
--
-- Safe to run more than once (IF NOT EXISTS).
-- ============================================================================

alter type public.user_role add value if not exists 'owner';
alter type public.user_role add value if not exists 'admin';

-- ---------------------------------------------------------------------------
-- VERIFY
-- ---------------------------------------------------------------------------
select enum_range(null::public.user_role);

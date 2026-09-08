-- ============================================================================
-- The Tradeyard — League Leaders: card_title + regroup insert_set
--
-- fix_league_leaders_naming.sql gave each League Leaders card_number its own
-- specific insert_set value (e.g. "AFC REC LEADERS" for #284) so the correct
-- AFC/NFC name would show — but insert_set is also what the Insert-Set
-- picker groups by, so that fix turned one multi-player insert into 10
-- separate Insert-Set tiles instead of one "League Leaders" tile with 10
-- numbered slots inside it.
--
-- This migration splits the two concerns apart with a new card_title column:
-- card_title carries the specific per-card-number name for display, while
-- insert_set goes back to the shared "LEAGUE LEADERS" bracket for grouping.
--
-- Run this in Supabase BEFORE deploying the app code that reads card_title
-- (lib/utils/multiPlayerCard.ts and friends fall back to insert_set when
-- card_title is null, so the app keeps working either order — but the
-- grouping fix in ChecklistAlbum.tsx/PersonalYardAlbum.tsx only produces one
-- "League Leaders" tile once this has run).
--
-- Safe to run more than once (both UPDATEs are no-ops on rows already
-- migrated, since their insert_set no longer matches the IN-list).
-- ============================================================================

alter table public.card_catalog add column if not exists card_title text;
alter table public.cards add column if not exists card_title text;

-- The 10 specific names fix_league_leaders_naming.sql set, moved into
-- card_title verbatim; insert_set reset to the common bracket so all 10
-- card numbers (#281-290) group into a single Insert-Set tile.
update public.card_catalog
set card_title = insert_set,
    insert_set = 'LEAGUE LEADERS'
where set_name = '2026 Topps Flagship Football'
  and insert_set in (
    'AFC PASS LEADERS', 'NFC PASS LEADERS',
    'AFC REC LEADERS', 'NFC REC LEADERS',
    'AFC RUSH LEADERS', 'NFC RUSH LEADERS',
    'AFC SCK LEADERS', 'NFC SCK LEADERS',
    'AFC TCK LEADERS', 'NFC TCK LEADERS'
  );

-- Existing `cards` rows added before this fix copied the OLD, specific
-- insert_set value at Add-Card time (see CardForm.tsx's
-- selectCatalogMatch(), which copies category/insert_set/is_variation_of_base
-- straight from the matched catalog row). InsertYard's per-slot ownership
-- match is keyed off (set_name, insert_set, card_number) — leaving already-
-- owned League Leaders cards on their old insert_set value would silently
-- break ownership detection the moment the catalog's own insert_set changes
-- out from under them. Backfill the same way, matched by the old value
-- rather than by card_number, so this can't accidentally touch an unrelated
-- card that happens to share a card_number with a League Leaders slot.
update public.cards
set card_title = insert_set,
    insert_set = 'LEAGUE LEADERS'
where set_name = '2026 Topps Flagship Football'
  and insert_set in (
    'AFC PASS LEADERS', 'NFC PASS LEADERS',
    'AFC REC LEADERS', 'NFC REC LEADERS',
    'AFC RUSH LEADERS', 'NFC RUSH LEADERS',
    'AFC SCK LEADERS', 'NFC SCK LEADERS',
    'AFC TCK LEADERS', 'NFC TCK LEADERS'
  );

-- Zur Kontrolle nach dem Ausführen:
-- select card_number, player_name, insert_set, card_title from card_catalog
-- where set_name = '2026 Topps Flagship Football' and card_number between '281' and '290'
-- order by card_number, player_name;

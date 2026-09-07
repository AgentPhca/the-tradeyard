-- Ergänzt die spezifische AFC/NFC-Kategorie-Benennung für die
-- "LEAGUE LEADERS"-Insert-Karten im 2026 Topps Flagship Football Set.
-- Die Original-Checkliste enthält nur den generischen Abschnittstitel
-- "LEAGUE LEADERS" ohne die AFC/NFC-Unterscheidung — diese Zuordnung
-- stammt aus Phils eigener Sammler-Kenntnis der physischen Karten.

update public.card_catalog set insert_set = 'NFC PASS LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '281'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'AFC PASS LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '282'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'NFC REC LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '283'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'AFC REC LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '284'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

-- NFC RUSH LEADERS (#285): Phil ist sich hier nicht sicher (Karte nicht
-- selbst besessen) — Wert trotzdem gesetzt, aber needs_review markiert,
-- damit das bei Gelegenheit community-verifiziert werden kann.
update public.card_catalog set insert_set = 'NFC RUSH LEADERS', needs_review = true
  where set_name = '2026 Topps Flagship Football' and card_number = '285'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'AFC RUSH LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '286'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'NFC SCK LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '287'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'AFC SCK LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '288'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'NFC TCK LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '289'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

update public.card_catalog set insert_set = 'AFC TCK LEADERS'
  where set_name = '2026 Topps Flagship Football' and card_number = '290'
  and insert_set in ('LEAGUE LEADERS', 'LEAGUE LEADERS GOLDEN MIRROR IMAGE VARIATIONS');

-- Zur Kontrolle nach dem Ausführen:
-- select card_number, insert_set, player_name, team from card_catalog
-- where set_name = '2026 Topps Flagship Football' and card_number between '281' and '290'
-- order by card_number;

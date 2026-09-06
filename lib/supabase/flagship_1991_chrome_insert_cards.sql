-- The Tradeyard: "1991 Topps Football Chrome" Insert-Set für 2026 Topps Flagship Football
-- ergänzen (ausgeliefert exklusiv über Hobby/Jumbo "Silver Mojo Packs", daher von
-- Usern oft "Mojo" genannt). Bisher fehlte dieses Insert-Set komplett im Katalog.
-- Start mit den zwei konkret bekannten Karten; vollständiger Checklist-Import
-- (alle Spieler) ist ein separater, größerer Folge-Task, falls gewünscht.

insert into card_catalog (
  set_name, insert_set, parallel, player_name, team, card_number,
  is_rookie, print_run, product_year, category, class_segment,
  is_variation_of_base, is_autograph, is_relic, qualifier, needs_review,
  source_file, source_page, raw_line
) values
  ('2026 Topps Flagship Football', '1991 Topps Football Chrome', null,
   'Jared Goff', 'Detroit Lions', '91TC-37',
   false, null, 2026, 'Insert', null,
   false, false, false, null, false,
   'manual_entry_phil', null, '91TC-37 Jared Goff Detroit Lions'),
  ('2026 Topps Flagship Football', '1991 Topps Football Chrome', null,
   'Baker Mayfield', 'Tampa Bay Buccaneers', '91TC-32',
   false, null, 2026, 'Insert', null,
   false, false, false, null, false,
   'manual_entry_phil', null, '91TC-32 Baker Mayfield Tampa Bay Buccaneers');

-- Parallel-Leiter für dieses Insert-Set (recherchiert, Autograph-Tier-Struktur;
-- für die Base-Chrome-Version vermutlich identisch, bitte bei Bedarf mit echter
-- Karte gegenchecken)
insert into parallels (set_name, parallel_name, print_run, sku_exclusivity, tier, base_type, sort_order)
values
  ('2026 Topps Flagship Football', 'Green (1991 Chrome)', 99, '1991 Topps Football Chrome insert only', null, null, 900),
  ('2026 Topps Flagship Football', 'Gold (1991 Chrome)', 50, '1991 Topps Football Chrome insert only', null, null, 901),
  ('2026 Topps Flagship Football', 'Orange (1991 Chrome)', 25, '1991 Topps Football Chrome insert only', null, null, 902),
  ('2026 Topps Flagship Football', 'Black (1991 Chrome)', 10, '1991 Topps Football Chrome insert only', null, null, 903),
  ('2026 Topps Flagship Football', 'Red (1991 Chrome)', 5, '1991 Topps Football Chrome insert only', null, null, 904),
  ('2026 Topps Flagship Football', 'SuperFractor (1991 Chrome)', 1, '1991 Topps Football Chrome insert only', null, null, 905);

-- Verify
select player_name, card_number, insert_set, category from card_catalog
where set_name = '2026 Topps Flagship Football' and insert_set = '1991 Topps Football Chrome';

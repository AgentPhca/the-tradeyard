-- ============================================================================
-- The Tradeyard -- seed real parallel data for 2025 Topps Chrome Black Football
--
-- Adds the 7th base-card set to public.parallels, same convention as
-- parallels_seed_real_parallel_data.sql (the original 6 sets) -- run
-- parallels.sql first if this is a fresh database. 14 rows total, no
-- tier/base_type split needed for this set (both columns null throughout,
-- like Chrome/Cosmic Chrome/Resurgence/Flagship).
-- ============================================================================

delete from public.parallels where set_name = '2025 Topps Chrome Black Football';

insert into public.parallels
  (set_name, parallel_name, print_run, sku_exclusivity, tier, base_type, sort_order)
values
  ('2025 Topps Chrome Black Football', 'Refractor', null, 'Unnumbered, 1:6', null, null, 1),
  ('2025 Topps Chrome Black Football', 'Blue Refractor', 150, null, null, null, 2),
  ('2025 Topps Chrome Black Football', 'Blue Wave Refractor', 150, null, null, null, 3),
  ('2025 Topps Chrome Black Football', 'Green Refractor', 99, null, null, null, 4),
  ('2025 Topps Chrome Black Football', 'Green Wave Refractor', 99, null, null, null, 5),
  ('2025 Topps Chrome Black Football', 'Purple Refractor', 75, null, null, null, 6),
  ('2025 Topps Chrome Black Football', 'Purple Mini-Diamond', 75, null, null, null, 7),
  ('2025 Topps Chrome Black Football', 'Gold Refractor', 50, null, null, null, 8),
  ('2025 Topps Chrome Black Football', 'Gold Mini-Diamond', 50, null, null, null, 9),
  ('2025 Topps Chrome Black Football', 'Orange Refractor', 25, null, null, null, 10),
  ('2025 Topps Chrome Black Football', 'Rose Gold Refractor', 15, null, null, null, 11),
  ('2025 Topps Chrome Black Football', 'White Refractor', 10, null, null, null, 12),
  ('2025 Topps Chrome Black Football', 'Red Refractor', 5, null, null, null, 13),
  ('2025 Topps Chrome Black Football', 'SuperFractor', 1, null, null, null, 14);

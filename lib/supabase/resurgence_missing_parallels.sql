-- The Tradeyard: 4 fehlende Resurgence-Parallels ergänzen
-- (Teal Surge /149, White Surge /125, Digital Surge /100, Purple Surge /75)
-- Reihenfolge nach Auflage zwischen Green Surge /175 und Blue Surge /99.
-- sort_order wird bewusst dynamisch berechnet (nicht hart codiert), damit
-- bestehende Werte nicht kollidieren, egal welche Zahlen aktuell vergeben sind.

do $$
declare
  base_order integer;
begin
  select sort_order into base_order
  from parallels
  where set_name = '2025 Topps Resurgence Football'
    and parallel_name = 'Green Surge';

  -- Alle nachfolgenden sort_order-Werte um 4 verschieben, um Platz zu schaffen
  update parallels
  set sort_order = sort_order + 4
  where set_name = '2025 Topps Resurgence Football'
    and sort_order > base_order;

  insert into parallels (set_name, parallel_name, print_run, sku_exclusivity, tier, base_type, sort_order)
  values
    ('2025 Topps Resurgence Football', 'Teal Surge', 149, null, null, null, base_order + 1),
    ('2025 Topps Resurgence Football', 'White Surge', 125, null, null, null, base_order + 2),
    ('2025 Topps Resurgence Football', 'Digital Surge', 100, null, null, null, base_order + 3),
    ('2025 Topps Resurgence Football', 'Purple Surge', 75, null, null, null, base_order + 4);
end $$;

-- Verify
select parallel_name, print_run, sort_order
from parallels
where set_name = '2025 Topps Resurgence Football'
order by sort_order;

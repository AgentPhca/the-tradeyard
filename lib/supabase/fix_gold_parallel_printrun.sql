-- Korrigiert einen Datenfehler in der parallels-Referenztabelle: die
-- "Gold"-Parallel bei 2026 Topps Flagship Football hatte print_run = 2026
-- eingetragen — offensichtlich das Produktjahr, das versehentlich in die
-- print_run-Spalte gerutscht ist, kein echter Print Run.
--
-- Auf NULL statt auf einen geratenen Wert gesetzt: ein falscher Print Run
-- wäre genau der Fehler, den diese Migration beheben soll, nur mit einer
-- anderen Zahl. Sobald der echte Wert bekannt ist (z.B. durch Phils eigene
-- Sammler-Kenntnis der physischen Karte), bitte per separatem UPDATE
-- nachtragen.

update public.parallels set print_run = null
  where set_name = '2026 Topps Flagship Football'
  and parallel_name = 'Gold'
  and print_run = 2026;

-- Zur Kontrolle nach dem Ausführen:
-- select set_name, parallel_name, print_run
-- from parallels
-- where set_name = '2026 Topps Flagship Football' and parallel_name = 'Gold';

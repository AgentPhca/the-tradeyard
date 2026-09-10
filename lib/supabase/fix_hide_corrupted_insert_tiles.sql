-- Markiert kaputte insert_set-Werte als needs_review, damit sie aus dem
-- Insert-Set-Dropdown (und den anderen Stellen, die needs_review jetzt
-- berücksichtigen) verschwinden, ohne die zugrundeliegenden Katalog-
-- Zeilen zu löschen.
--
-- Ursache: derselbe Parsing-Bug, der schon bei den Dual-Autogramm-Karten
-- gefunden wurde — der raw_line-Text der VORHERIGEN Katalog-Zeile ist in
-- die insert_set-Spalte der NÄCHSTEN Zeile gerutscht, statt eines echten
-- Produktnamens. Betrifft den "91TRC"-Insert-Block (2026 Topps Flagship
-- Football) in card_catalog_import/part_15_of_21.sql — z.B. Kenyon Sadiq
-- (91TRC-38) hat insert_set = '91TRC-37 Kaden Wetjen Pittsburgh Steelers
-- Rookie Silver Pack Auto' statt eines echten Produktnamens (das ist der
-- raw_line-Text der vorherigen Zeile, Kaden Wetjen auf 91TRC-37).
--
-- Vier konkrete Katalog-Zeilen identifiziert (drei unterschiedliche
-- kaputte insert_set-Texte, da 91TRC-47 und 91TRC-48 zufällig denselben
-- kaputten Text von 91TRC-46 geerbt haben). Der Beta-Tester-Screenshot
-- soll fünf gezeigt haben — ohne Zugriff auf die Live-Datenbank in dieser
-- Sandbox konnte nur dieser statische Fund aus den lokalen Checklist-
-- Import-Dateien verifiziert werden. Bitte gegen den Screenshot
-- gegenchecken, ob eine fünfte kaputte Zeile fehlt, und ggf. per
-- separatem UPDATE nachtragen.

update public.card_catalog set needs_review = true
  where set_name = '2026 Topps Flagship Football'
  and card_number in ('91TRC-38', '91TRC-42', '91TRC-47', '91TRC-48')
  and insert_set in (
    '91TRC-37 Kaden Wetjen Pittsburgh Steelers Rookie Silver Pack Auto',
    '91TRC-41 Max Klare Los Angeles Rams Rookie Silver Pack Auto',
    '91TRC-46 Arvell Reese New York Giants Rookie Silver Pack Auto'
  );

-- Zur Kontrolle nach dem Ausführen:
-- select card_number, insert_set, needs_review from card_catalog
-- where set_name = '2026 Topps Flagship Football'
-- and card_number in ('91TRC-38', '91TRC-42', '91TRC-47', '91TRC-48');

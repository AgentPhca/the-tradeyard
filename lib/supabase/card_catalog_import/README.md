# card_catalog import

21 self-contained SQL files (`part_01_of_21.sql` … `part_21_of_21.sql`), 500
rows each except the last (489), loading all 10,489 rows of the 2025/2026
Topps football checklist into `public.card_catalog`.

Split up because the full import as one file was too large for the
Supabase SQL Editor to run in a single paste.

## How to run

1. Run `../card_catalog.sql` first — it creates the table.
2. Run each `part_NN_of_21.sql` file in the SQL Editor, one at a time, in
   any order (they don't depend on each other).

## Faster alternative

If you'd rather not click through the SQL Editor 21 times, run all of it in
one shot with `psql` against your project's connection string (Project
Settings → Database → Connection string), from this directory:

```bash
psql "<connection string>" -v ON_ERROR_STOP=1 -f ../card_catalog.sql
for f in part_*.sql; do psql "<connection string>" -v ON_ERROR_STOP=1 -f "$f"; done
```

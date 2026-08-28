# The Tradeyard

**Your trades happen on the Yard.**

A dark-mode community platform for NFL trading card collectors, retailers, and
streamers to organize their collections and connect for trades — no prices,
no marketplace transactions, just collectors talking to collectors.

## Stack

- [Next.js 14](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (`@supabase/supabase-js`, `@supabase/ssr`) for auth + Postgres
- [Zustand](https://zustand-demo.pmnd.rs) for client state
- [lucide-react](https://lucide.dev) for icons

## Design system

| Token      | Value     |
| ---------- | --------- |
| Background | `#0D1117` |
| Surface    | `#161B22` |
| Card       | `#21262D` |
| Border     | `#30363D` |
| Muted      | `#8B949E` |
| Primary    | `#22C55E` |
| Text       | `#F5F5F5` |

Dark mode only. Tokens live in `tailwind.config.ts` and `app/globals.css`.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Run [`lib/supabase/schema.sql`](./lib/supabase/schema.sql) in the Supabase
SQL editor to create the `profiles`, `cards`, `trades`, `conversations`,
`messages`, and `wishlist` tables along with their Row Level Security
policies.

## Project structure

```
app/
  (auth)/login, (auth)/register        — unauthenticated pages
  (app)/dashboard, collection,
       marketplace, profile/[username] — authenticated app shell
components/
  ui/       — shared primitives (Avatar, Badge, Input)
  cards/    — TradingCard and related trading-card UI
  layout/   — Navbar and app chrome
lib/
  supabase/ — browser/server/middleware clients + schema.sql
  types/    — shared database types
```

## Product notes

- Card `status` is either `personal_collection` or `for_trade` — there are no
  prices or checkout flows anywhere in the app.
- The only call to action on a card is **Kontakt**, which opens contact with
  the owner to arrange a trade.

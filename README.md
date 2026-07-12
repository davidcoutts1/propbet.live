# propbet.live

A simulated **prop & straight bet** app for playing with friends — no real money.
Create a group, invite friends with a code, post bets, build parlays, settle
outcomes, chat, and climb the leaderboard.

Built with **Next.js (App Router) + Supabase (Postgres / Auth / Realtime) +
Tailwind**. Responsive web + installable PWA.

## Features

- **Auth** — email/password + Google SSO (Supabase Auth). Password reset,
  username change.
- **Groups** — create (name, starting balance, family-friendly) or join by a
  6-char invite code. Shareable invite links pre-fill the code after signup.
- **Bets** — straight, prop, and over/under markets with American-odds entry.
  Single bets and multi-leg parlays with correct combined-odds math.
- **Leaderboard** — ranked by total worth (free cash + money in open bets),
  with W/L records.
- **Chat** — realtime group messaging with emoji reactions (mobile-friendly).
- **My Bets** — active tickets and full bet history with per-leg results.
- **Admin** (group creator) — settle bets, grant money to everyone, and
  transfer admin to another member. All from the profile menu.

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` → `.env.local` and fill in from the Supabase dashboard:

| Var | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → `anon` public |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` |
| `DATABASE_URL` | Connect → **Session pooler** connection string |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev; your domain in prod |

> The direct `db.<ref>.supabase.co` host is IPv6-only. Use the **Session
> pooler** string (IPv4) for `DATABASE_URL`, or run the SQL from
> `supabase/migrations/0001_init.sql` in the dashboard **SQL Editor**.

## 3. Apply the database schema

```bash
npm run db:push        # runs supabase/migrations/*.sql against DATABASE_URL
```

…or paste `supabase/migrations/0001_init.sql` into the Supabase **SQL Editor**
and run it.

## 4. Configure Supabase Auth

In the Supabase dashboard:

1. **Authentication → Providers → Email** — for the smoothest local flow, turn
   **"Confirm email" OFF** (users go straight into onboarding after signup).
   Leave it on if you want email verification.
2. **Authentication → Providers → Google** — enable it and paste your Google
   OAuth **Client ID** and **Client Secret**.
3. In **Google Cloud Console → Credentials**, add this **Authorized redirect
   URI**: `https://<your-ref>.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration** — set **Site URL** to your app URL and
   add redirect URLs: `http://localhost:3000/**` (and your production domain).

## 5. Run

```bash
npm run dev
# http://localhost:3000
```

## Betting math

Odds are stored internally as **decimal** (2.00 = even). American odds are a
display/entry convenience (`src/lib/odds.ts`).

- Single: `payout = stake × decimalOdds`
- Parlay: `combinedOdds = Π legOdds`, `payout = stake × combinedOdds`
- On settle: losing leg ⇒ ticket lost (stake already deducted at placement);
  all legs won ⇒ `balance += payout`; voided legs drop out and, if the whole
  ticket voids, the stake is refunded.

All money mutations run through `SECURITY DEFINER` Postgres functions
(`place_wager`, `settle_bet`, `adjust_all_balances`, `transfer_admin`,
`create_group`, `join_group`) so balances and authorization are enforced
atomically server-side. Reads are guarded by Row Level Security.

## Deploy

Deploy to **Vercel**, set the same env vars (use `NEXT_PUBLIC_SITE_URL` =
your domain), and add the domain to Supabase Auth redirect URLs.

## Security note

Never commit `.env.local`. Rotate any secret that has been shared in plaintext
(OAuth client secret, DB password) from the respective dashboards.

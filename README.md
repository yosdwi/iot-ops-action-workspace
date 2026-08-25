# IoT Ops Action Workspace

Fast internal workspace for IoT Ops ticket actions.

## Stack

- React + Vite
- Supabase Auth + PostgreSQL + RPC
- Railway for preview/deployment

## Run locally

```bash
npm install
npm run dev
```

The app can use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A publishable-key fallback is included in the browser client for the current test project so the first Railway preview can boot without backend secrets.

Never place a Supabase secret/service-role key in Vite variables or browser code.

## Railway

Connect this GitHub repository as a Railway service. `railway.json` builds the Vite bundle and serves `dist` on Railway's `$PORT`.

After Railway creates a public domain, add that origin to the Supabase Auth redirect URL allow-list before testing Google OAuth or magic-link login.

## Product model

`Support Ticket context -> Ticket Action -> Solve`

The first preview focuses on the operational workspace: current Jakarta date/time, operator selection, date-scoped ticket loading, inline action updates, optimistic save/solve, quick actions, bulk actions, search/filtering, and single/bulk ticket creation.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm start          # Start dev server at http://localhost:3000 (alias for npm run dev)
npm run dev        # Start dev server via Parcel
npm run build      # Production build via Parcel
```

There are no tests or linting configured.

## Architecture

This is a single-page React app for tracking personal/family finances.

**Entry point:** `index.html` → `main.jsx` → `src/App.jsx` (default export `App`)

**Bundler:** Parcel 2 (configured via `.parcelrc`)

**Backend:** Supabase (credentials in `.env` as `SUPABASE_URL` and `SUPABASE_KEY`). The app requires Supabase auth — all data is gated behind a login session.

### File structure

```
src/
  lib/
    supabase.js       — Supabase client singleton
    constants.js      — ACCOUNT_TYPES list, TYPE_COLORS map
    formatters.js     — fmt, fmtCash, parseCash, fmtPct, fmtDate, lastDayOfMonth, today
    accountUtils.js   — account hierarchy helpers and snapshot row builders
  styles/
    theme.js          — C (color palette) and S (styles object)
  components/
    CashInput.jsx     — controlled currency input, formats/parses on blur
    Toast.jsx         — auto-dismissing notification
    ChartTooltip.jsx  — shared recharts tooltip
  pages/
    Dashboard.jsx
    MoMPage.jsx
    ReturnsPage.jsx
    SnapshotsPage.jsx
    AccountsPage.jsx
    LoginPage.jsx
  App.jsx             — root component: auth, data loading, mutation handlers
```

`finance_ui.jsx` at the root is a one-line re-export stub kept for backwards compatibility.

### Supabase tables

- `accounts` — chart of accounts with `type` (asset_cash, asset_investment, asset_physical, liability, equity, income, expense), optional `parent_id` for account hierarchy
- `snapshots` — monthly balance snapshots per account (`account_id`, `snapshot_date` as YYYY-MM-DD last-day-of-month, `balance`)
- `transfers` — investment transfer records used to strip out cash flows when computing investment returns

### Pages (navigation via sidebar)

- **Dashboard** — net worth summary cards + line/bar charts from snapshot history
- **MoM Change** — month-over-month balance delta table, grouped by account type then parent/child hierarchy
- **Returns** — investment return calculations (strips transfers to compute true returns)
- **Snapshots** — bulk month-end balance entry form; supports per-account or bulk edit
- **Accounts** — CRUD for chart of accounts with parent/child hierarchy

### Key patterns

- All styles are inline, defined in the `S` object in `src/styles/theme.js` (with color palette in `C`)
- Account balances for parent accounts are **derived** by summing children — `deriveSnapshotBalance()` and `deriveRowsBalance()` in `accountUtils.js` handle this recursively with a cache
- `nestAccountsByParent()` flattens the hierarchy into a depth-annotated list for rendering indented tables
- `CashInput` is a shared controlled input that formats/parses currency on blur
- Data is loaded once on login via `Promise.all` in `App.jsx` and passed down as props; mutations call `load()` to refresh
- `onAuthStateChange` compares `access_token` before updating session state to prevent tab-switch re-fetches

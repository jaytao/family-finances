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

This is a single-page React app for tracking personal/family finances. The entire UI lives in one file: **`finance_ui.jsx`**.

**Entry point:** `index.html` → `main.jsx` → `finance_ui.jsx` (default export `App`)

**Bundler:** Parcel 2 (configured via `.parcelrc`)

**Backend:** Supabase (URL and publishable key hardcoded at top of `finance_ui.jsx`). The app requires Supabase auth — all data is gated behind a login session.

### Supabase tables

- `accounts` — chart of accounts with `type` (asset_cash, asset_investment, asset_physical, liability, equity, income, expense), optional `parent_id` for account hierarchy
- `snapshots` — monthly balance snapshots per account (`account_id`, `snapshot_date` as YYYY-MM-DD last-day-of-month, `balance`)
- `transfers` — investment transfer records used to strip out cash flows when computing investment returns
- `transactions` — journal-entry transaction headers
- `entries` — double-entry lines belonging to transactions (`account_id`, `amount`)

### Pages (navigation via sidebar)

- **Dashboard** — net worth summary cards + line/bar charts from snapshot history
- **MoM Change** — month-over-month balance delta table
- **Returns** — investment return calculations (strips transfers to compute true returns)
- **Snapshots** — bulk month-end balance entry form; supports per-account or bulk edit
- **Accounts** — CRUD for chart of accounts with parent/child hierarchy
- **Transactions** — double-entry transaction ledger

### Key patterns

- All styles are inline, defined in the `S` object (with color palette in `C`)
- Account balances for parent accounts are **derived** by summing children — `deriveSnapshotBalance()` and `deriveRowsBalance()` handle this recursively with a cache
- `nestAccountsByParent()` flattens the hierarchy into a depth-annotated list for rendering indented tables
- `CashInput` is a shared controlled input that formats/parses currency on blur
- Data is loaded once on login via `Promise.all` in the root `App` component and passed down as props; mutations call `load()` to refresh

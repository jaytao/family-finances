import { Buffer } from "buffer";
window.Buffer = Buffer;

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ACCOUNT_TYPES = [
  { value: "asset_cash",       label: "Cash & Bank",        group: "Assets" },
  { value: "asset_investment", label: "Investment",         group: "Assets" },
  { value: "asset_physical",   label: "Physical Asset",     group: "Assets" },
  { value: "liability",        label: "Liability",          group: "Liabilities" },
  { value: "equity",           label: "Equity",             group: "Equity" },
  { value: "income",           label: "Income",             group: "Income/Expense" },
  { value: "expense",          label: "Expense",            group: "Income/Expense" },
];

const TYPE_COLORS = {
  asset_cash:       "#4ade80",
  asset_investment: "#60a5fa",
  asset_physical:   "#a78bfa",
  liability:        "#f87171",
  equity:           "#fbbf24",
  income:           "#34d399",
  expense:          "#fb923c",
};

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtCash = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const parseCash = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const fmtPct = (n) => n == null ? "—" : `${n > 0 ? "+" : ""}${Number(n).toFixed(1)}%`;
const fmtDate = (d) => { if (!d) return ""; const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" }); };
const lastDayOfMonth = (y, m) => new Date(y, m, 0).toISOString().split("T")[0];
const today = new Date();

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  text: "#e8e4d9",
  textMuted: "#b8b4a8",
  textSubtle: "#9a968c",
  border: "#3a3a3a",
  borderSubtle: "#2a2a2a",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0a0a0a", minHeight: "100vh", color: C.text, fontSize: 16 },
  sidebar: { width: 220, background: "#111", borderRight: `1px solid ${C.borderSubtle}`, padding: "24px 0", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "auto" },
  sidebarLogo: { padding: "0 20px 24px", borderBottom: `1px solid ${C.borderSubtle}`, marginBottom: 8 },
  logoText: { fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: C.text, textTransform: "uppercase" },
  logoSub: { fontSize: 12, color: C.textMuted, marginTop: 2, letterSpacing: "0.08em" },
  navItem: (active) => ({ padding: "10px 20px", cursor: "pointer", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? C.text : C.textMuted, background: active ? "#1a1a1a" : "transparent", borderLeft: active ? `2px solid ${C.text}` : "2px solid transparent", transition: "all 0.15s" }),
  main: { flex: 1, padding: "32px 40px", overflow: "auto" },
  pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4, color: C.text },
  pageSub: { fontSize: 14, color: C.textMuted, marginBottom: 32, letterSpacing: "0.05em" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  card: { background: "#111", border: `1px solid ${C.borderSubtle}`, borderRadius: 4, padding: "20px 24px" },
  cardLabel: { fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 700, color: C.text },
  cardSub: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, padding: "10px 12px", textAlign: "left", borderBottom: `1px solid ${C.borderSubtle}` },
  td: { padding: "12px 12px", borderBottom: "1px solid #151515", fontSize: 15, color: C.text },
  tdMuted: { padding: "12px 12px", borderBottom: "1px solid #151515", fontSize: 15, color: C.textMuted },
  badge: (type) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 2, fontSize: 12, letterSpacing: "0.08em", background: TYPE_COLORS[type] + "20", color: TYPE_COLORS[type], border: `1px solid ${TYPE_COLORS[type]}40` }),
  btn: { padding: "10px 18px", background: "#e8e4d9", color: "#0a0a0a", border: "none", borderRadius: 2, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  btnGhost: { padding: "10px 18px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 2, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  btnDanger: { padding: "8px 14px", background: "transparent", color: "#f87171", border: "1px solid #f8717140", borderRadius: 2, fontSize: 12, letterSpacing: "0.08em", cursor: "pointer" },
  input: { width: "100%", background: "#0a0a0a", border: `1px solid ${C.border}`, borderRadius: 2, padding: "10px 12px", color: C.text, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" },
  select: { width: "100%", background: "#0a0a0a", border: `1px solid ${C.border}`, borderRadius: 2, padding: "10px 12px", color: C.text, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" },
  label: { fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, display: "block", marginBottom: 6 },
  formGroup: { marginBottom: 16 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "#111", border: `1px solid ${C.border}`, borderRadius: 4, padding: "28px 32px", width: 440, maxWidth: "90vw" },
  modalBoxWide: { background: "#111", border: `1px solid ${C.border}`, borderRadius: 4, padding: "28px 32px", width: 720, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" },
  modalTitle: { fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 20, textTransform: "uppercase", color: C.text },
  row: { display: "flex", gap: 12, alignItems: "center" },
  positive: { color: "#4ade80" },
  negative: { color: "#f87171" },
  neutral: { color: C.textMuted },
  divider: { borderTop: `1px solid ${C.borderSubtle}`, margin: "24px 0" },
  sectionTitle: { fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 16 },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#e8e4d9", color: "#0a0a0a", padding: "12px 22px", borderRadius: 2, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", zIndex: 200 },
};

// ─── CASH INPUT ───────────────────────────────────────────────────────────────
function CashInput({ value, onChange, placeholder, style, disabled }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const parsed = parseCash(value);
  const display = value === "" || value == null ? "" : (parsed != null ? fmtCash(parsed) : String(value));

  if (disabled) {
    return (
      <div style={{ ...style, color: C.textMuted, textAlign: "right", padding: "10px 12px", boxSizing: "border-box" }}>
        {display || "—"}
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      style={style}
      placeholder={placeholder}
      value={focused ? draft : display}
      onFocus={() => {
        setFocused(true);
        setDraft(parsed != null ? String(parsed) : (value ?? ""));
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseCash(draft);
        onChange(n != null ? String(n) : "");
      }}
    />
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return <div style={S.toast}>{msg}</div>;
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111", border: `1px solid ${C.border}`, padding: "10px 14px", borderRadius: 2 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: 15, color: p.color || C.text }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ accounts, snapshots }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
  const latest = dates[dates.length - 1];
  const prev = dates[dates.length - 2];

  const netWorthByMonth = dates.map(d => {
    const snaps = snapshots.filter(s => s.snapshot_date === d);
    let nw = 0;
    snaps.forEach(s => {
      const acc = accounts.find(a => a.id === s.account_id);
      if (!acc) return;
      if (["asset_cash","asset_investment","asset_physical"].includes(acc.type)) nw += Number(s.balance);
      if (acc.type === "liability") nw -= Number(s.balance);
    });
    return { date: d, "Net Worth": nw };
  });

  const calcTotal = (date, types) => snapshots
    .filter(s => s.snapshot_date === date)
    .reduce((sum, s) => {
      const acc = accounts.find(a => a.id === s.account_id);
      return acc && types.includes(acc.type) ? sum + Number(s.balance) : sum;
    }, 0);

  const totalAssets    = calcTotal(latest, ["asset_cash","asset_investment","asset_physical"]);
  const totalLiab      = calcTotal(latest, ["liability"]);
  const totalInvest    = calcTotal(latest, ["asset_investment"]);
  const netWorth       = totalAssets - totalLiab;
  const prevNetWorth   = netWorthByMonth[netWorthByMonth.length - 2]?.["Net Worth"] ?? null;
  const nwChange       = prevNetWorth != null ? netWorth - prevNetWorth : null;
  const nwChangePct    = prevNetWorth ? (nwChange / Math.abs(prevNetWorth)) * 100 : null;

  const byType = ACCOUNT_TYPES.filter(t => ["asset_cash","asset_investment","asset_physical","liability"].includes(t.value)).map(t => {
    const val = calcTotal(latest, [t.value]);
    return { name: t.label, value: val, type: t.value };
  }).filter(d => d.value > 0);

  return (
    <div>
      <div style={S.pageTitle}>Overview</div>
      <div style={S.pageSub}>{latest ? `As of ${fmtDate(latest)}` : "No snapshots yet"}</div>

      <div style={S.grid(4)}>
        {[
          { label: "Net Worth", value: netWorth, sub: nwChange != null ? `${fmtPct(nwChangePct)} vs last month` : "—", color: nwChange >= 0 ? "#4ade80" : "#f87171" },
          { label: "Total Assets", value: totalAssets, sub: `${fmtDate(latest)}` },
          { label: "Total Liabilities", value: totalLiab, sub: "Outstanding balances" },
          { label: "Investments", value: totalInvest, sub: "Brokerage & retirement" },
        ].map(m => (
          <div key={m.label} style={S.card}>
            <div style={S.cardLabel}>{m.label}</div>
            <div style={S.cardValue}>{fmt(m.value)}</div>
            <div style={{ ...S.cardSub, color: m.color || C.textMuted }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {netWorthByMonth.length > 1 && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={S.sectionTitle}>Net worth over time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={netWorthByMonth}>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => "$" + (v >= 1000 ? Math.round(v/1000)+"k" : v)} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Net Worth" stroke="#e8e4d9" strokeWidth={1.5} dot={{ r: 3, fill: "#e8e4d9" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {byType.length > 0 && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={S.sectionTitle}>Balance by account type</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byType} layout="vertical">
              <XAxis type="number" tickFormatter={v => "$" + Math.round(v/1000)+"k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0,2,2,0]}>
                {byType.map((d) => <Cell key={d.type} fill={TYPE_COLORS[d.type]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function nestAccountsByParent(accounts) {
  const ids = new Set(accounts.map(a => a.id));
  const roots = accounts
    .filter(a => !a.parent_id || !ids.has(a.parent_id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const childrenOf = (parentId) =>
    accounts.filter(a => a.parent_id === parentId).sort((a, b) => a.name.localeCompare(b.name));

  const nested = [];
  const visit = (acc, depth) => {
    nested.push({ ...acc, depth });
    childrenOf(acc.id).forEach(child => visit(child, depth + 1));
  };
  roots.forEach(r => visit(r, 0));
  return nested;
}

function childrenOfAccount(accounts, parentId) {
  return accounts.filter(a => a.parent_id === parentId);
}

function accountHasChildren(accountId, accounts) {
  return accounts.some(a => a.parent_id === accountId);
}

function deriveSnapshotBalance(accountId, snapsByAccount, accounts, cache = {}) {
  if (cache[accountId] !== undefined) return cache[accountId];
  const children = childrenOfAccount(accounts, accountId);
  if (children.length > 0) {
    let sum = 0;
    let any = false;
    for (const c of children) {
      const b = deriveSnapshotBalance(c.id, snapsByAccount, accounts, cache);
      if (b != null) { sum += b; any = true; }
    }
    cache[accountId] = any ? sum : null;
    return cache[accountId];
  }
  const snap = snapsByAccount[accountId];
  cache[accountId] = snap != null ? Number(snap.balance) : null;
  return cache[accountId];
}

function deriveRowsBalance(accountId, rows, accounts, cache = {}) {
  if (cache[accountId] !== undefined) return cache[accountId];
  const children = childrenOfAccount(accounts, accountId);
  if (children.length > 0) {
    let sum = 0;
    let any = false;
    for (const c of children) {
      const b = deriveRowsBalance(c.id, rows, accounts, cache);
      if (b != null) { sum += b; any = true; }
    }
    cache[accountId] = any ? sum : null;
    return cache[accountId];
  }
  const row = rows.find(r => r.account_id === accountId);
  cache[accountId] = parseCash(row?.balance);
  return cache[accountId];
}

function latestPrevDateInSubtree(accountId, snapsByAccount, accounts) {
  const children = childrenOfAccount(accounts, accountId);
  if (children.length === 0) return snapsByAccount[accountId]?.snapshot_date ?? null;
  const dates = children
    .map(c => latestPrevDateInSubtree(c.id, snapsByAccount, accounts))
    .filter(Boolean)
    .sort()
    .reverse();
  return dates[0] ?? null;
}

function buildSnapshotDisplayRows(snaps, accounts) {
  const snapsByAccount = Object.fromEntries(snaps.map(s => [s.account_id, s]));
  return nestAccountsByParent(accounts).map(acc => {
    const hasChildren = accountHasChildren(acc.id, accounts);
    const snap = snapsByAccount[acc.id] ?? null;
    const balance = hasChildren
      ? deriveSnapshotBalance(acc.id, snapsByAccount, accounts)
      : (snap != null ? Number(snap.balance) : null);
    return { account: acc, depth: acc.depth, balance, hasChildren, snap };
  });
}

function buildEditMonthRows(assetAccounts, snapshots, snapshotDate) {
  const snapsForDate = Object.fromEntries(
    snapshots.filter(s => s.snapshot_date === snapshotDate).map(s => [s.account_id, s])
  );
  const prevByAccount = latestSnapshotByAccount(snapshots, snapshotDate);
  return nestAccountsByParent(assetAccounts).map(a => {
    const hasChildren = accountHasChildren(a.id, assetAccounts);
    const existing = snapsForDate[a.id];
    return {
      account_id: a.id,
      snapshot_id: existing?.id ?? null,
      balance: existing != null ? String(existing.balance) : "",
      notes: existing?.notes ?? "",
      prev_balance: hasChildren
        ? deriveSnapshotBalance(a.id, prevByAccount, assetAccounts)
        : (prevByAccount[a.id]?.balance ?? null),
      prev_date: hasChildren
        ? latestPrevDateInSubtree(a.id, prevByAccount, assetAccounts)
        : (prevByAccount[a.id]?.snapshot_date ?? null),
      depth: a.depth,
      hasChildren,
    };
  });
}

// ─── SNAPSHOTS PAGE ───────────────────────────────────────────────────────────
function latestSnapshotByAccount(snapshots, beforeDate) {
  const eligible = beforeDate ? snapshots.filter(s => s.snapshot_date < beforeDate) : snapshots;
  const byAccount = {};
  for (const s of eligible) {
    const prev = byAccount[s.account_id];
    if (!prev || s.snapshot_date > prev.snapshot_date) byAccount[s.account_id] = s;
  }
  return byAccount;
}

function buildBulkSnapshotRows(assetAccounts, snapshots, snapshotDate) {
  const prevByAccount = latestSnapshotByAccount(snapshots, snapshotDate);
  return nestAccountsByParent(assetAccounts).map(a => {
    const hasChildren = accountHasChildren(a.id, assetAccounts);
    const prevBalance = hasChildren
      ? deriveSnapshotBalance(a.id, prevByAccount, assetAccounts)
      : (prevByAccount[a.id]?.balance ?? null);
    const prevDate = hasChildren
      ? latestPrevDateInSubtree(a.id, prevByAccount, assetAccounts)
      : (prevByAccount[a.id]?.snapshot_date ?? null);
    return {
      account_id: a.id,
      balance: "",
      notes: "",
      prev_balance: prevBalance,
      prev_date: prevDate,
      depth: a.depth,
      hasChildren,
    };
  });
}

function SnapshotsPage({ accounts, snapshots, onSave, onDelete }) {
  const [modal, setModal] = useState(null); // null | { mode: 'bulk'|'edit' }
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState("");
  const [collapsed, setCollapsed] = useState(new Set());
  const toggleCollapse = (id) => setCollapsed(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();
  const displayDates = filterMonth ? [filterMonth] : dates.slice(0, 6);

  const assetAccounts = accounts

  const openNew = () => {
    const y = today.getFullYear(), m = today.getMonth() + 1;
    const snapshot_date = lastDayOfMonth(y, m);
    setForm({
      snapshot_date,
      rows: buildBulkSnapshotRows(assetAccounts, snapshots, snapshot_date),
    });
    setModal({ mode: "bulk" });
  };

  const setSnapshotDate = (snapshot_date) => {
    setForm(f => ({
      snapshot_date,
      rows: buildBulkSnapshotRows(assetAccounts, snapshots, snapshot_date),
    }));
  };

  const setRow = (accountId, patch) => {
    setForm(f => ({
      ...f,
      rows: f.rows.map(r => r.account_id === accountId ? { ...r, ...patch } : r),
    }));
  };

  const copyAllPrevious = () => {
    setForm(f => ({
      ...f,
      rows: f.rows.map(r => ({
        ...r,
        balance: r.hasChildren ? "" : (r.prev_balance != null ? String(r.prev_balance) : r.balance),
      })),
    }));
  };

  const openEdit = (snap) => {
    setForm({ ...snap });
    setModal({ mode: "edit" });
  };

  const openAdd = (accountId, snapshotDate) => {
    setForm({ account_id: accountId, snapshot_date: snapshotDate, balance: "", notes: "" });
    setModal({ mode: "new" });
  };

  const openEditMonth = (snapshotDate) => {
    setForm({
      snapshot_date: snapshotDate,
      rows: buildEditMonthRows(assetAccounts, snapshots, snapshotDate),
    });
    setModal({ mode: "editMonth" });
  };

  const save = async () => {
    await onSave(form, modal.mode);
    setModal(null);
  };

  const isMonthEditor = modal?.mode === "bulk" || modal?.mode === "editMonth";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Snapshots</div>
          <div style={S.pageSub}>Monthly balance entries per account</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ ...S.select, width: 160 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">All months</option>
            {dates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
          </select>
          <button style={S.btn} onClick={openNew}>+ New snapshot</button>
        </div>
      </div>

      {(() => {
        const latestDate = dates[0];
        if (!latestDate) return null;
        const latestSnaps = snapshots.filter(s => s.snapshot_date === latestDate);
        const latestRows = buildSnapshotDisplayRows(latestSnaps, assetAccounts);
        const topRows = latestRows.filter(r => r.depth === 0);
        let assets = 0, liabilities = 0;
        topRows.forEach(({ account, balance }) => {
          if (balance == null) return;
          if (["asset_cash","asset_investment","asset_physical"].includes(account.type)) assets += balance;
          if (account.type === "liability") liabilities += balance;
        });
        const netWorth = assets - liabilities;
        return (
          <div style={{ ...S.grid(3), marginBottom: 20 }}>
            {[
              { label: "Net Worth", value: netWorth, color: netWorth >= 0 ? "#4ade80" : "#f87171" },
              { label: "Total Assets", value: assets },
              { label: "Total Liabilities", value: liabilities },
            ].map(m => (
              <div key={m.label} style={S.card}>
                <div style={S.cardLabel}>{m.label}</div>
                <div style={{ ...S.cardValue, color: m.color || C.text }}>{fmt(m.value)}</div>
                <div style={S.cardSub}>{fmtDate(latestDate)}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {displayDates.map(date => {
        const snaps = snapshots.filter(s => s.snapshot_date === date);
        const rows = buildSnapshotDisplayRows(snaps, assetAccounts);
        return (
          <div key={date} style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ ...S.sectionTitle, marginBottom: 0 }}>{fmtDate(date)}</div>
              <button style={S.btnGhost} onClick={() => openEditMonth(date)}>Edit month</button>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Account</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Balance</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Notes</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let topId = null;
                  const visible = [];
                  for (const row of rows) {
                    if (row.depth === 0) { topId = row.account.id; visible.push(row); }
                    else if (!collapsed.has(topId)) visible.push(row);
                  }
                  return visible.map(({ snap, account, depth, balance, hasChildren }) => {
                  const isTopLevel = depth === 0;
                  const trStyle = isTopLevel ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {};
                  return (
                  <tr key={snap?.id ?? `rollup-${account.id}`} style={trStyle}>
                    <td style={{ ...S.td, fontWeight: isTopLevel ? 700 : 400, paddingLeft: 12 + depth * 20, color: isTopLevel ? C.text : C.textMuted }}>
                      {isTopLevel && hasChildren
                        ? <span style={{ color: C.textSubtle, marginRight: 6, cursor: "pointer", userSelect: "none", fontSize: 11 }} onClick={() => toggleCollapse(account.id)}>{collapsed.has(account.id) ? "▶" : "▼"}</span>
                        : (depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>)
                      }
                      {account?.name ?? "Unknown"}
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: isTopLevel ? 700 : 500, color: C.text }}>
                      {balance != null ? fmtCash(balance) : "—"}
                    </td>
                    <td style={S.td}><span style={S.badge(account?.type)}>{account?.type}</span></td>
                    <td style={{ ...S.td, color: C.textMuted }}>{hasChildren ? "—" : (snap?.notes || "—")}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      {!hasChildren && (
                        <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {snap ? (
                            <>
                              <button style={S.btnGhost} onClick={() => openEdit(snap)}>Edit</button>
                              <button style={S.btnDanger} onClick={() => onDelete("snapshots", snap.id)}>Del</button>
                            </>
                          ) : (
                            <button style={S.btnGhost} onClick={() => openAdd(account.id, date)}>Add</button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                });
                })()}
              </tbody>
            </table>
          </div>
        );
      })}

      {isMonthEditor && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBoxWide}>
            <div style={S.modalTitle}>{modal.mode === "editMonth" ? `Edit snapshots — ${fmtDate(form.snapshot_date)}` : "New monthly snapshots"}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ ...S.formGroup, marginBottom: 0, flex: "1 1 200px" }}>
                <label style={S.label}>Snapshot date</label>
                {modal.mode === "editMonth" ? (
                  <div style={{ fontSize: 15, color: C.text, padding: "10px 0" }}>{fmtDate(form.snapshot_date)}</div>
                ) : (
                  <input style={S.input} type="date" value={form.snapshot_date} onChange={e => setSnapshotDate(e.target.value)} />
                )}
              </div>
              <button type="button" style={S.btnGhost} onClick={copyAllPrevious}>Copy all previous</button>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Account</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Previous</th>
                  <th style={{ ...S.th, textAlign: "right" }}>New balance</th>
                  <th style={S.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {form.rows?.map(row => {
                  const acc = accounts.find(a => a.id === row.account_id);
                  const depth = row.depth ?? 0;
                  const derivedNew = row.hasChildren ? deriveRowsBalance(row.account_id, form.rows, assetAccounts) : null;
                  return (
                    <tr key={row.account_id}>
                      <td style={{ ...S.td, paddingLeft: 12 + depth * 20 }}>
                        <div style={{ fontWeight: depth === 0 ? 600 : 400 }}>
                          {depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>}
                          {acc?.name ?? "Unknown"}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          <span style={S.badge(acc?.type)}>{acc?.type}</span>
                          {row.prev_date && <span style={{ marginLeft: 6 }}>as of {fmtDate(row.prev_date)}</span>}
                          {row.hasChildren && <span style={{ marginLeft: 6 }}>· rollup</span>}
                        </div>
                      </td>
                      <td style={{ ...S.td, textAlign: "right", color: C.textMuted }}>
                        {row.prev_balance != null ? fmtCash(row.prev_balance) : "—"}
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        {row.hasChildren ? (
                          <div style={{ ...S.input, width: 140, textAlign: "right", border: "none", background: "transparent", color: C.textMuted, padding: "10px 12px" }}>
                            {derivedNew != null ? fmtCash(derivedNew) : "—"}
                          </div>
                        ) : (
                          <CashInput
                            style={{ ...S.input, width: 140, textAlign: "right" }}
                            placeholder={row.prev_balance != null ? fmtCash(row.prev_balance) : "$0.00"}
                            value={row.balance}
                            onChange={v => setRow(row.account_id, { balance: v })}
                          />
                        )}
                      </td>
                      <td style={S.td}>
                        {row.hasChildren ? (
                          <span style={{ color: C.textSubtle, fontSize: 12 }}>—</span>
                        ) : (
                          <input
                            style={S.input}
                            type="text"
                            placeholder="Optional"
                            value={row.notes ?? ""}
                            onChange={e => setRow(row.account_id, { notes: e.target.value })}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>
              {modal.mode === "editMonth"
                ? "Update existing balances or add values for accounts missing this month. Leaf accounts only."
                : "Enter balances on leaf accounts only. Parent balances are summed from children. Leave blank to skip."}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={save}>{modal.mode === "editMonth" ? "Save changes" : "Save all"}</button>
            </div>
          </div>
        </div>
      )}

      {modal?.mode === "new" && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>Add snapshot</div>
            <div style={S.formGroup}>
              <label style={S.label}>Account</label>
              <div style={{ fontSize: 15, color: C.text }}>
                {accounts.find(a => a.id === form.account_id)?.name ?? "Unknown"}
              </div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Snapshot date</label>
              <div style={{ fontSize: 15, color: C.text }}>{fmtDate(form.snapshot_date)}</div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Balance</label>
              <CashInput
                style={S.input}
                placeholder="$0.00"
                value={form.balance ?? ""}
                onChange={v => setForm(f => ({ ...f, balance: v }))}
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Notes</label>
              <input style={S.input} type="text" placeholder="Optional" value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal?.mode === "edit" && (() => {
        const editHasChildren = accountHasChildren(form.account_id, accounts);
        const dateSnaps = Object.fromEntries(
          snapshots.filter(s => s.snapshot_date === form.snapshot_date).map(s => [s.account_id, s])
        );
        const derived = editHasChildren ? deriveSnapshotBalance(form.account_id, dateSnaps, accounts) : null;
        return (
          <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div style={S.modalBox}>
              <div style={S.modalTitle}>Edit snapshot</div>
              <div style={S.formGroup}>
                <label style={S.label}>Account</label>
                <div style={{ fontSize: 15, color: C.text }}>
                  {accounts.find(a => a.id === form.account_id)?.name ?? "Unknown"}
                </div>
              </div>
              {editHasChildren ? (
                <>
                  <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>
                    Parent account balances are calculated from child accounts. Edit the child snapshots instead.
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Derived balance</label>
                    <div style={{ fontSize: 15, color: C.text }}>{derived != null ? fmtCash(derived) : "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
                    <button style={S.btn} onClick={() => setModal(null)}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={S.formGroup}>
                    <label style={S.label}>Snapshot date</label>
                    <input style={S.input} type="date" value={form.snapshot_date} onChange={e => setForm(f => ({ ...f, snapshot_date: e.target.value }))} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Balance</label>
                    <CashInput
                      style={S.input}
                      placeholder="$0.00"
                      value={form.balance ?? ""}
                      onChange={v => setForm(f => ({ ...f, balance: v }))}
                    />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Notes</label>
                    <input style={S.input} type="text" placeholder="Optional" value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
                    <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
                    <button style={S.btn} onClick={save}>Save</button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── ACCOUNTS PAGE ────────────────────────────────────────────────────────────
function AccountsPage({ accounts, onSave, onDelete }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [collapsed, setCollapsed] = useState(new Set());
  const toggleCollapse = (id) => setCollapsed(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openNew = () => {
    setForm({ name: "", type: "asset_cash", currency: "USD", description: "" });
    setModal({ mode: "new" });
  };

  const openEdit = (acc) => {
    setForm({ ...acc });
    setModal({ mode: "edit" });
  };

  const save = async () => {
    await onSave(form, modal.mode);
    setModal(null);
  };

  const typeMeta = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t]));
  const groupOrder = [...new Set(ACCOUNT_TYPES.map(t => t.group))];
  const grouped = groupOrder.reduce((g, group) => {
    const typesInGroup = ACCOUNT_TYPES.filter(t => t.group === group).map(t => t.value);
    const accs = accounts
      .filter(a => typesInGroup.includes(a.type))
      .map(a => ({ ...a, typeLabel: typeMeta[a.type]?.label ?? a.type }));
    if (accs.length) g[group] = nestAccountsByParent(accs);
    return g;
  }, {});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Accounts</div>
          <div style={S.pageSub}>Chart of accounts — edit types and structure</div>
        </div>
        <button style={S.btn} onClick={openNew}>+ New account</button>
      </div>

      {Object.entries(grouped).map(([group, accs]) => (
        <div key={group} style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.sectionTitle}>{group}</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Currency</th>
                <th style={S.th}>Description</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let topId = null;
                const visible = [];
                for (const a of accs) {
                  if (a.depth === 0) { topId = a.id; visible.push(a); }
                  else if (!collapsed.has(topId)) visible.push(a);
                }
                return visible.map(a => {
                  const isTop = a.depth === 0;
                  const hasKids = isTop && accs.some(o => o.parent_id === a.id);
                  return (
                    <tr key={a.id} style={isTop ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
                      <td style={{ ...S.td, fontWeight: isTop ? 700 : 400, color: isTop ? C.text : C.textMuted, paddingLeft: 12 + a.depth * 20 }}>
                        {hasKids
                          ? <span style={{ color: C.textSubtle, marginRight: 6, cursor: "pointer", userSelect: "none", fontSize: 11 }} onClick={() => toggleCollapse(a.id)}>{collapsed.has(a.id) ? "▶" : "▼"}</span>
                          : (a.depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>)
                        }
                        {a.name}
                      </td>
                      <td style={S.td}><span style={S.badge(a.type)}>{a.type}</span></td>
                      <td style={S.td}>{a.currency}</td>
                      <td style={{ ...S.td, color: C.textMuted }}>{a.description || "—"}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button style={S.btnGhost} onClick={() => openEdit(a)}>Edit</button>
                          <button style={S.btnDanger} onClick={() => onDelete("accounts", a.id)}>Del</button>
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      ))}

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>{modal.mode === "new" ? "New account" : "Edit account"}</div>
            <div style={S.formGroup}>
              <label style={S.label}>Name</label>
              <input style={S.input} type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Type</label>
              <select style={S.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.group})</option>)}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Currency</label>
              <input style={S.input} type="text" value={form.currency ?? "USD"} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Description</label>
              <input style={S.input} type="text" placeholder="Optional" value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Parent account</label>
              <select style={S.select} value={form.parent_id ?? ""} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">None (top-level)</option>
                {accounts.filter(a => a.id !== form.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MOM CHANGE PAGE ──────────────────────────────────────────────────────────
function MoMPage({ accounts, snapshots }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");

  const prevDate = dates[dates.indexOf(selectedDate) + 1];
  const currByAccount = Object.fromEntries(
    snapshots.filter(s => s.snapshot_date === selectedDate).map(s => [s.account_id, s])
  );
  const prevByAccount = prevDate
    ? Object.fromEntries(snapshots.filter(s => s.snapshot_date === prevDate).map(s => [s.account_id, s]))
    : {};

  const groups = ACCOUNT_TYPES.map(({ value: type, label }) => {
    const accsOfType = accounts.filter(a => a.type === type);
    if (!accsOfType.length) return null;
    const nested = nestAccountsByParent(accsOfType);
    const rows = nested.map(acc => {
      const curr = deriveSnapshotBalance(acc.id, currByAccount, accounts);
      const prev = deriveSnapshotBalance(acc.id, prevByAccount, accounts);
      if (curr == null && prev == null) return null;
      const change = curr != null && prev != null ? curr - prev : null;
      const changePct = change != null && prev ? (change / Math.abs(prev)) * 100 : null;
      return { acc, curr, prev, change, changePct };
    }).filter(Boolean);
    if (!rows.length) return null;
    return { type, label, rows };
  }).filter(Boolean);

  const chartData = dates.slice().reverse().map(d => {
    const obj = { date: d };
    accounts.filter(a => ["asset_investment","asset_cash"].includes(a.type)).forEach(a => {
      const s = snapshots.find(x => x.account_id === a.id && x.snapshot_date === d);
      if (s) obj[a.name] = Number(s.balance);
    });
    return obj;
  });

  const investAccounts = accounts.filter(a => a.type === "asset_investment");
  const lineColors = ["#60a5fa","#4ade80","#a78bfa","#fbbf24","#f87171","#34d399"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Month over Month</div>
          <div style={S.pageSub}>Balance change vs prior month</div>
        </div>
        <select style={{ ...S.select, width: 180 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
          {dates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
        </select>
      </div>

      {chartData.length > 1 && investAccounts.length > 0 && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={S.sectionTitle}>Investment accounts over time</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => "$" + Math.round(v/1000)+"k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<ChartTooltip />} />
              {investAccounts.map((a, i) => (
                <Line key={a.id} type="monotone" dataKey={a.name} stroke={lineColors[i % lineColors.length]} strokeWidth={1.5} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Account</th>
              <th style={{ ...S.th, textAlign: "right" }}>Prior</th>
              <th style={{ ...S.th, textAlign: "right" }}>Current</th>
              <th style={{ ...S.th, textAlign: "right" }}>Change</th>
              <th style={{ ...S.th, textAlign: "right" }}>% Change</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ type, label, rows }) => (
              <>
                <tr key={`grp-${type}`}>
                  <td colSpan={5} style={{ padding: "14px 12px 6px", borderBottom: `1px solid ${C.borderSubtle}` }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TYPE_COLORS[type] ?? C.textMuted, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[type] ?? C.textMuted, display: "inline-block" }} />
                      {label}
                    </span>
                  </td>
                </tr>
                {rows.map(({ acc, curr, prev, change, changePct }) => {
                  const isParent = accountHasChildren(acc.id, accounts);
                  const changeStyle = change == null ? S.neutral : change > 0 ? S.positive : change < 0 ? S.negative : S.neutral;
                  return (
                    <tr key={acc.id}>
                      <td style={{ ...S.td, paddingLeft: 12 + acc.depth * 16, fontWeight: isParent ? 600 : 400, color: isParent ? C.text : C.textMuted }}>{acc.name}</td>
                      <td style={{ ...S.td, textAlign: "right", color: C.textMuted }}>{prev != null ? fmt(prev) : "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", color: C.text }}>{curr != null ? fmt(curr) : "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", ...changeStyle }}>{change != null ? fmt(change) : "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", ...changeStyle }}>{fmtPct(changePct)}</td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── INVESTMENT RETURNS PAGE ───────────────────────────────────────────────────
function ReturnsPage({ accounts, snapshots, transfers }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const investAccounts = accounts.filter(a => a.type === "asset_investment");

  const rows = investAccounts.map(acc => {
    const curr = snapshots.find(s => s.account_id === acc.id && s.snapshot_date === selectedDate);
    const prevDate = dates[dates.indexOf(selectedDate) + 1];
    const prev = prevDate ? snapshots.find(s => s.account_id === acc.id && s.snapshot_date === prevDate) : null;
    if (!curr) return null;

    const monthStart = selectedDate.slice(0, 7) + "-01";
    const netContrib = transfers
      .filter(t => t.account_id === acc.id && t.date >= monthStart && t.date <= selectedDate)
      .reduce((s, t) => s + Number(t.net_flow), 0);

    const gain = curr && prev ? Number(curr.balance) - Number(prev.balance) - netContrib : null;
    const ret = gain != null && prev?.balance ? (gain / Math.abs(Number(prev.balance))) * 100 : null;

    return { acc, ending: curr?.balance, beginning: prev?.balance, netContrib, gain, ret };
  }).filter(Boolean);

  const openTransfer = () => {
    setForm({ account_id: investAccounts[0]?.id ?? "", date: selectedDate, net_flow: "", description: "" });
    setModal(true);
  };

  const saveTransfer = async () => {
    const { error } = await supabase.from("transfers").insert([{ ...form, account_id: Number(form.account_id), net_flow: Number(form.net_flow) }]);
    if (!error) setModal(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Investment Returns</div>
          <div style={S.pageSub}>Money-weighted return — contributions excluded</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...S.select, width: 180 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
            {dates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
          </select>
          <button style={S.btn} onClick={openTransfer}>+ Log transfer</button>
        </div>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Account</th>
              <th style={{ ...S.th, textAlign: "right" }}>Beginning</th>
              <th style={{ ...S.th, textAlign: "right" }}>Contributions</th>
              <th style={{ ...S.th, textAlign: "right" }}>Ending</th>
              <th style={{ ...S.th, textAlign: "right" }}>Gain</th>
              <th style={{ ...S.th, textAlign: "right" }}>Return</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ acc, ending, beginning, netContrib, gain, ret }) => (
              <tr key={acc.id}>
                <td style={{ ...S.td, fontWeight: 600, color: "#e8e4d9" }}>{acc.name}</td>
                <td style={{ ...S.td, textAlign: "right", color: C.textMuted }}>{beginning != null ? fmt(beginning) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", color: netContrib > 0 ? "#60a5fa" : netContrib < 0 ? "#fb923c" : C.textMuted }}>{netContrib ? fmt(netContrib) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", color: "#e8e4d9" }}>{fmt(ending)}</td>
                <td style={{ ...S.td, textAlign: "right", ...(gain > 0 ? S.positive : gain < 0 ? S.negative : S.neutral) }}>{gain != null ? fmt(gain) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...(ret > 0 ? S.positive : ret < 0 ? S.negative : S.neutral) }}>{fmtPct(ret)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transfers.length > 0 && (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.sectionTitle}>Recent transfers</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Account</th>
                <th style={{ ...S.th, textAlign: "right" }}>Flow</th>
                <th style={S.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {transfers.slice(0, 20).map(t => {
                const acc = accounts.find(a => a.id === t.account_id);
                return (
                  <tr key={t.id}>
                    <td style={{ ...S.td, color: C.textMuted }}>{fmtDate(t.date)}</td>
                    <td style={S.td}>{acc?.name ?? "—"}</td>
                    <td style={{ ...S.td, textAlign: "right", ...(t.net_flow > 0 ? S.positive : S.negative) }}>{fmt(t.net_flow)}</td>
                    <td style={{ ...S.td, color: C.textMuted }}>{t.description || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>Log cash transfer</div>
            <div style={S.formGroup}>
              <label style={S.label}>Investment account</label>
              <select style={S.select} value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                {investAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Date</label>
              <input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Net flow (positive = deposit, negative = withdrawal)</label>
              <input style={S.input} type="number" step="0.01" placeholder="e.g. 14000 or -5000" value={form.net_flow} onChange={e => setForm(f => ({ ...f, net_flow: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Description</label>
              <input style={S.input} type="text" placeholder="e.g. Monthly contribution" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={saveTransfer}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TRANSACTIONS PAGE ────────────────────────────────────────────────────────
function TransactionsPage({ accounts, transactions, entries, onSave }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: today.toISOString().split("T")[0], description: "", memo: "", lines: [{ account_id: "", type: "debit", amount: "" }, { account_id: "", type: "credit", amount: "" }] });

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { account_id: "", type: "debit", amount: "" }] }));
  const updateLine = (i, k, v) => setForm(f => { const lines = [...f.lines]; lines[i] = { ...lines[i], [k]: v }; return { ...f, lines }; });
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const debitTotal = form.lines.filter(l => l.type === "debit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const creditTotal = form.lines.filter(l => l.type === "credit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = Math.abs(debitTotal - creditTotal) < 0.001;

  const save = async () => {
    await onSave(form);
    setModal(false);
  };

  const recentTx = transactions.slice(0, 30);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Transactions</div>
          <div style={S.pageSub}>Double-entry journal — debits must equal credits</div>
        </div>
        <button style={S.btn} onClick={() => setModal(true)}>+ New transaction</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Description</th>
              <th style={S.th}>Entries</th>
              <th style={S.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentTx.map(tx => {
              const txEntries = entries.filter(e => e.transaction_id === tx.id);
              return (
                <tr key={tx.id} style={{ opacity: tx.is_void ? 0.4 : 1 }}>
                  <td style={{ ...S.td, color: C.textMuted }}>{fmtDate(tx.date)}</td>
                  <td style={{ ...S.td, color: "#e8e4d9", fontWeight: 600 }}>{tx.description}</td>
                  <td style={S.td}>
                    {txEntries.slice(0, 2).map(e => {
                      const acc = accounts.find(a => a.id === e.account_id);
                      return <span key={e.id} style={{ marginRight: 8, color: e.entry_type === "debit" ? "#4ade80" : "#f87171", fontSize: 13 }}>{e.entry_type === "debit" ? "DR" : "CR"} {acc?.name} {fmt(e.amount)}</span>;
                    })}
                    {txEntries.length > 2 && <span style={{ color: C.textMuted, fontSize: 13 }}>+{txEntries.length - 2} more</span>}
                  </td>
                  <td style={S.td}>{tx.is_void ? <span style={{ color: "#f87171", fontSize: 13 }}>VOID</span> : <span style={{ color: "#4ade80", fontSize: 13 }}>OK</span>}</td>
                </tr>
              );
            })}
            {recentTx.length === 0 && <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: C.textMuted, padding: "32px 0" }}>No transactions yet</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ ...S.modalBox, width: 560 }}>
            <div style={S.modalTitle}>New transaction</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={S.label}>Date</label>
                <input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Description</label>
                <input style={S.input} type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Memo</label>
              <input style={S.input} type="text" placeholder="Optional" value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />
            </div>
            <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={S.label}>Entries</label>
                <button style={S.btnGhost} onClick={addLine}>+ Line</button>
              </div>
              {form.lines.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <select style={S.select} value={l.account_id} onChange={e => updateLine(i, "account_id", Number(e.target.value))}>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select style={S.select} value={l.type} onChange={e => updateLine(i, "type", e.target.value)}>
                    <option value="debit">DR</option>
                    <option value="credit">CR</option>
                  </select>
                  <input style={S.input} type="number" step="0.01" placeholder="0.00" value={l.amount} onChange={e => updateLine(i, "amount", e.target.value)} />
                  <button style={{ ...S.btnDanger, padding: "6px 8px" }} onClick={() => removeLine(i)}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13 }}>
                <span style={{ color: "#4ade80" }}>DR {fmt(debitTotal)}</span>
                <span style={{ color: "#f87171" }}>CR {fmt(creditTotal)}</span>
                <span style={balanced ? S.positive : S.negative}>{balanced ? "✓ Balanced" : "✗ Unbalanced"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(false)}>Cancel</button>
              <button style={{ ...S.btn, opacity: balanced ? 1 : 0.4 }} onClick={balanced ? save : undefined}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    onLogin(data.session);
  };

  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ ...S.card, width: 360, maxWidth: "90vw" }}>
        <div style={S.logoText}>Ledger</div>
        <div style={{ ...S.logoSub, marginBottom: 24 }}>Sign in to continue</div>
        <form onSubmit={handleSubmit}>
          <div style={S.formGroup}>
            <label style={S.label}>Email</label>
            <input
              style={S.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div style={{ ...S.negative, fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          <button type="submit" style={{ ...S.btn, width: "100%", opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const PAGES = [
  { id: "dashboard",    label: "Dashboard" },
  { id: "mom",          label: "MoM Change" },
  { id: "returns",      label: "Returns" },
  { id: "snapshots",    label: "Snapshots" },
  { id: "accounts",     label: "Accounts" },
  { id: "transactions", label: "Transactions" },
];

export default function App() {
  const [session, setSession]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage]             = useState("dashboard");
  const [accounts, setAccounts]     = useState([]);
  const [snapshots, setSnapshots]   = useState([]);
  const [transfers, setTransfers]   = useState([]);
  const [transactions, setTxs]      = useState([]);
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);
  const [error, setError]           = useState(null);

  const notify = (msg) => setToast(msg);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(prev => prev?.access_token === s?.access_token ? prev : s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAccounts([]);
    setSnapshots([]);
    setTransfers([]);
    setTxs([]);
    setEntries([]);
    setError(null);
    setPage("dashboard");
  };

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const [a, s, tr, tx, en] = await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }),
      supabase.from("transfers").select("*").order("date", { ascending: false }),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("entries").select("*"),
    ]);
    if (a.error) {
      const details = [a.error.message, a.error.details, a.error.hint].filter(Boolean).join(" | ");
      setError(`Supabase request failed: ${details || "unknown error"}`);
      setLoading(false);
      return;
    }
    setAccounts(a.data ?? []);
    setSnapshots(s.data ?? []);
    setTransfers(tr.data ?? []);
    setTxs(tx.data ?? []);
    setEntries(en.data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  if (authLoading) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  const handleDelete = async (table, id) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { notify("Delete failed: " + error.message); return; }
    notify("Deleted");
    load();
  };

  const handleSaveSnapshot = async (form, mode) => {
    if (mode === "bulk") {
      const rows = (form.rows ?? [])
        .filter(r => !r.hasChildren)
        .map(r => ({ ...r, amount: parseCash(r.balance) }))
        .filter(r => r.amount != null)
        .map(r => ({
          account_id: Number(r.account_id),
          snapshot_date: form.snapshot_date,
          balance: r.amount,
          notes: r.notes || null,
        }));
      if (!rows.length) { notify("Enter at least one balance"); return; }
      const { error } = await supabase.from("snapshots").insert(rows);
      if (error) { notify("Save failed: " + error.message); return; }
      notify(`Saved ${rows.length} snapshot${rows.length === 1 ? "" : "s"}`);
      load();
      return;
    }
    if (mode === "editMonth") {
      const rows = (form.rows ?? [])
        .filter(r => !r.hasChildren)
        .map(r => ({ ...r, amount: parseCash(r.balance) }))
        .filter(r => r.amount != null);
      if (!rows.length) { notify("Enter at least one balance"); return; }
      let saved = 0;
      for (const row of rows) {
        const payload = {
          account_id: Number(row.account_id),
          snapshot_date: form.snapshot_date,
          balance: row.amount,
          notes: row.notes || null,
        };
        const { error } = row.snapshot_id
          ? await supabase.from("snapshots").update(payload).eq("id", row.snapshot_id)
          : await supabase.from("snapshots").insert([payload]);
        if (error) { notify("Save failed: " + error.message); return; }
        saved++;
      }
      notify(`Saved ${saved} snapshot${saved === 1 ? "" : "s"}`);
      load();
      return;
    }
    const balance = parseCash(form.balance);
    if (balance == null) { notify("Enter a valid balance"); return; }
    const payload = { account_id: Number(form.account_id), snapshot_date: form.snapshot_date, balance, notes: form.notes || null };
    if (mode === "new") {
      const { error } = await supabase.from("snapshots").insert([payload]);
      if (error) { notify("Save failed: " + error.message); return; }
      notify("Saved");
      load();
      return;
    }
    const { error } = await supabase.from("snapshots").update(payload).eq("id", form.id);
    if (error) { notify("Save failed: " + error.message); return; }
    notify("Saved");
    load();
  };

  const handleSaveAccount = async (form, mode) => {
    const payload = { name: form.name, type: form.type, currency: form.currency || "USD", description: form.description || null, parent_id: form.parent_id || null };
    const { error } = mode === "new"
      ? await supabase.from("accounts").insert([payload])
      : await supabase.from("accounts").update(payload).eq("id", form.id);
    if (error) { notify("Save failed: " + error.message); return; }
    notify("Saved");
    load();
  };

  const handleSaveTransaction = async (form) => {
    const { data: txData, error: txErr } = await supabase.from("transactions").insert([{ date: form.date, description: form.description, memo: form.memo || null }]).select();
    if (txErr) { notify("Failed: " + txErr.message); return; }
    const txId = txData[0].id;
    const entryRows = form.lines.map(l => ({ transaction_id: txId, account_id: Number(l.account_id), entry_type: l.type, amount: Number(l.amount) }));
    const { error: entErr } = await supabase.from("entries").insert(entryRows);
    if (entErr) { notify("Entries failed: " + entErr.message); return; }
    notify("Transaction saved");
    load();
  };

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading…</div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ ...S.card, maxWidth: 400, textAlign: "center" }}>
        <div style={{ color: "#f87171", marginBottom: 8, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Connection error</div>
        <div style={{ color: C.textMuted, fontSize: 15 }}>{error}</div>
        <div style={{ marginTop: 16, fontSize: 13, color: C.textSubtle }}>Check Supabase credentials, table access, and RLS policies</div>
      </div>
    </div>
  );

  return (
    <div style={{ ...S.app, display: "flex" }}>
      <nav style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.logoText}>Ledger</div>
          <div style={S.logoSub}>Personal finance</div>
        </div>
        {PAGES.map(p => (
          <div key={p.id} style={S.navItem(page === p.id)} onClick={() => setPage(p.id)}>{p.label}</div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 20px", borderTop: "1px solid #1e1e1e" }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis" }}>
            {session.user.email}
          </div>
          <button type="button" style={{ ...S.btnGhost, width: "100%", padding: "6px 12px" }} onClick={handleSignOut}>
            Sign out
          </button>
          <div style={{ fontSize: 12, color: C.textSubtle, letterSpacing: "0.06em", marginTop: 8 }}>{accounts.length} accounts · {snapshots.length} snapshots</div>
        </div>
      </nav>

      <main style={S.main}>
        {page === "dashboard"    && <Dashboard      accounts={accounts} snapshots={snapshots} />}
        {page === "mom"          && <MoMPage         accounts={accounts} snapshots={snapshots} />}
        {page === "returns"      && <ReturnsPage     accounts={accounts} snapshots={snapshots} transfers={transfers} />}
        {page === "snapshots"    && <SnapshotsPage   accounts={accounts} snapshots={snapshots} onSave={handleSaveSnapshot} onDelete={handleDelete} />}
        {page === "accounts"     && <AccountsPage    accounts={accounts} onSave={handleSaveAccount} onDelete={handleDelete} />}
        {page === "transactions" && <TransactionsPage accounts={accounts} transactions={transactions} entries={entries} onSave={handleSaveTransaction} />}
      </main>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

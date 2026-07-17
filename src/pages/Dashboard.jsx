import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { ACCOUNT_TYPES, TYPE_COLORS } from "../lib/constants.js";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { leafTypeTotals } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";
import ChartTooltip from "../components/ChartTooltip.jsx";

const LIQUID_TYPES    = ["asset_cash", "asset_investment"];
const NONLIQUID_TYPES = ["asset_retirement", "asset_physical", "equity"];
const LIAB_TYPES      = ACCOUNT_TYPES.filter(t => t.group === "Liabilities").map(t => t.value);

export default function Dashboard({ accounts, snapshots }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
  const latest = dates[dates.length - 1];

  const sumTypes = (totals, types) => types.reduce((s, t) => s + (totals[t] ?? 0), 0);

  const netWorthByMonth = dates.map(d => {
    const totals = leafTypeTotals(snapshots, accounts, d);
    return { date: d, "Net Worth": sumTypes(totals, [...LIQUID_TYPES, ...NONLIQUID_TYPES]) - sumTypes(totals, LIAB_TYPES) };
  });

  const latestTotals   = latest ? leafTypeTotals(snapshots, accounts, latest) : {};
  const totalLiquid    = sumTypes(latestTotals, LIQUID_TYPES);
  const totalNonLiquid = sumTypes(latestTotals, NONLIQUID_TYPES);
  const totalAssets    = totalLiquid + totalNonLiquid;
  const totalLiab      = sumTypes(latestTotals, LIAB_TYPES);
  const netWorth       = totalAssets - totalLiab;
  const prevNetWorth = netWorthByMonth[netWorthByMonth.length - 2]?.["Net Worth"] ?? null;
  const nwChange     = prevNetWorth != null ? netWorth - prevNetWorth : null;
  const nwChangePct  = prevNetWorth ? (nwChange / Math.abs(prevNetWorth)) * 100 : null;

  const byType = ACCOUNT_TYPES
    .filter(t => [...LIQUID_TYPES, ...NONLIQUID_TYPES, ...LIAB_TYPES].includes(t.value))
    .map(t => {
      const v = latestTotals[t.value] ?? 0;
      return { name: t.label, value: t.group === "Liabilities" ? -v : v, type: t.value };
    })
    .filter(d => d.value !== 0);

  return (
    <div>
      <div style={S.pageTitle}>Overview</div>
      {latest
        ? <div style={{ fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 16 }}>{fmtDate(latest)}</div>
        : <div style={S.pageSub}>No snapshots yet</div>
      }

      <div style={S.grid(4)}>
        {[
          { label: "Net Worth",         value: netWorth,       sub: nwChange != null ? `${fmtPct(nwChangePct)} vs last month` : "—", color: nwChange >= 0 ? "#4ade80" : "#f87171" },
          { label: "Liquid Assets",     value: totalLiquid,    sub: "Cash & investments" },
          { label: "Non-Liquid Assets", value: totalNonLiquid, sub: "Retirement, physical & equity" },
          { label: "Total Liabilities", value: totalLiab,      sub: "Outstanding balances" },
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
              <YAxis tickFormatter={v => "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v)} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
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
              <XAxis type="number" tickFormatter={v => (v < 0 ? "-$" : "$") + Math.round(Math.abs(v) / 1000) + "k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#ffffff", opacity: 0.06 }} />
              <Bar dataKey="value" radius={2}>
                {byType.map((d) => <Cell key={d.type} fill={TYPE_COLORS[d.type]} />)}
              </Bar>
              <ReferenceLine x={0} stroke={C.text} strokeWidth={1.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

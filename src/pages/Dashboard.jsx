import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ACCOUNT_TYPES, TYPE_COLORS } from "../lib/constants.js";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { C, S } from "../styles/theme.js";
import ChartTooltip from "../components/ChartTooltip.jsx";

export default function Dashboard({ accounts, snapshots }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
  const latest = dates[dates.length - 1];

  const LIQUID_TYPES    = ["asset_cash", "asset_investment"];
  const NONLIQUID_TYPES = ["asset_retirement", "asset_physical", "equity"];

  const netWorthByMonth = dates.map(d => {
    const snaps = snapshots.filter(s => s.snapshot_date === d);
    let nw = 0;
    snaps.forEach(s => {
      const acc = accounts.find(a => a.id === s.account_id);
      if (!acc) return;
      if ([...LIQUID_TYPES, ...NONLIQUID_TYPES].includes(acc.type)) nw += Number(s.balance);
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

  const totalLiquid    = calcTotal(latest, LIQUID_TYPES);
  const totalNonLiquid = calcTotal(latest, NONLIQUID_TYPES);
  const totalAssets    = totalLiquid + totalNonLiquid;
  const totalLiab      = calcTotal(latest, ["liability"]);
  const netWorth       = totalAssets - totalLiab;
  const prevNetWorth = netWorthByMonth[netWorthByMonth.length - 2]?.["Net Worth"] ?? null;
  const nwChange     = prevNetWorth != null ? netWorth - prevNetWorth : null;
  const nwChangePct  = prevNetWorth ? (nwChange / Math.abs(prevNetWorth)) * 100 : null;

  const byType = ACCOUNT_TYPES
    .filter(t => [...LIQUID_TYPES, ...NONLIQUID_TYPES, "liability"].includes(t.value))
    .map(t => ({ name: t.label, value: calcTotal(latest, [t.value]), type: t.value }))
    .filter(d => d.value > 0);

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
              <XAxis type="number" tickFormatter={v => "$" + Math.round(v / 1000) + "k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                {byType.map((d) => <Cell key={d.type} fill={TYPE_COLORS[d.type]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ACCOUNT_TYPES, TYPE_COLORS } from "../lib/constants.js";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { nestAccountsByParent, accountHasChildren, deriveSnapshotBalance } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";
import ChartTooltip from "../components/ChartTooltip.jsx";

export default function MoMPage({ accounts, snapshots }) {
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
    accounts.filter(a => ["asset_investment", "asset_cash"].includes(a.type)).forEach(a => {
      const s = snapshots.find(x => x.account_id === a.id && x.snapshot_date === d);
      if (s) obj[a.name] = Number(s.balance);
    });
    return obj;
  });

  const investAccounts = accounts.filter(a => a.type === "asset_investment");
  const lineColors = ["#60a5fa", "#4ade80", "#a78bfa", "#fbbf24", "#f87171", "#34d399"];

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
              <YAxis tickFormatter={v => "$" + Math.round(v / 1000) + "k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
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

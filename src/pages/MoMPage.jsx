import { useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Legend, LabelList, ResponsiveContainer } from "recharts";
import { ACCOUNT_TYPES, TYPE_COLORS } from "../lib/constants.js";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { nestAccountsByParent, accountHasChildren, deriveSnapshotBalance } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";

function totalLabel({ x, y, width, value }) {
  return (
    <text x={x + width / 2} y={y} dy={-6} textAnchor="middle" fontSize={12} fill={C.textMuted} style={{ pointerEvents: "none" }}>
      {fmt(value)}
    </text>
  );
}

function valueLabel({ x, y, width, height, value }) {
  return (
    <text x={x + width / 2} y={y + height / 2} dy={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0a0a0a" style={{ pointerEvents: "none" }}>
      {fmt(value)}
    </text>
  );
}

const noLabel = () => null;

export default function MoMPage({ accounts, snapshots }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const [hoveredType, setHoveredType] = useState(null);
  const hoverTimeout = useRef(null);

  const clearHoverTimeout = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
  };
  const hoverType = (label) => {
    clearHoverTimeout();
    setHoveredType(label);
  };
  const unhoverType = () => {
    clearHoverTimeout();
    hoverTimeout.current = setTimeout(() => setHoveredType(null), 60);
  };

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
      const change = (curr ?? 0) - (prev ?? 0);
      const changePct = (prev ?? 0) ? (change / Math.abs(prev ?? 0)) * 100 : null;
      return { acc, curr, prev, change, changePct };
    }).filter(Boolean);
    if (!rows.length) return null;
    return { type, label, rows };
  }).filter(Boolean);

  const presentTypes = ACCOUNT_TYPES.filter(({ value }) => accounts.some(a => a.type === value));

  const chartData = dates.slice().reverse().map(d => {
    const obj = { date: d };
    presentTypes.forEach(({ value: type, label }) => {
      obj[label] = snapshots
        .filter(s => s.snapshot_date === d)
        .reduce((sum, s) => {
          const acc = accounts.find(a => a.id === s.account_id);
          return acc && acc.type === type ? sum + Number(s.balance) : sum;
        }, 0);
    });
    obj.total = presentTypes.reduce((sum, { label }) => sum + obj[label], 0);
    return obj;
  });

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

      {chartData.length > 0 && presentTypes.length > 0 && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={S.sectionTitle}>Balances by month</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => "$" + Math.round(v / 1000) + "k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: C.textMuted }}
                onMouseEnter={o => hoverType(o.dataKey)}
                onMouseLeave={unhoverType}
              />
              {presentTypes.map(({ value: type, label }, i) => {
                const isHovered = hoveredType === label;
                const dimmed = hoveredType && !isHovered;
                return (
                  <Bar
                    key={type}
                    dataKey={label}
                    stackId="a"
                    fill={TYPE_COLORS[type]}
                    fillOpacity={dimmed ? 0.15 : 1}
                    isAnimationActive={false}
                    onMouseEnter={() => hoverType(label)}
                    onMouseLeave={unhoverType}
                  >
                    {i === presentTypes.length - 1 && (
                      <LabelList dataKey="total" content={totalLabel} />
                    )}
                    <LabelList dataKey={label} content={isHovered ? valueLabel : noLabel} />
                  </Bar>
                );
              })}
            </BarChart>
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
            {groups.flatMap(({ type, label, rows }) => {
              const topRows = rows.filter(({ acc }) => acc.depth === 0);
              const sumPrev   = topRows.some(r => r.prev != null) ? topRows.reduce((s, r) => s + (r.prev ?? 0), 0) : null;
              const sumCurr   = topRows.some(r => r.curr != null) ? topRows.reduce((s, r) => s + (r.curr ?? 0), 0) : null;
              const sumChange = sumCurr != null || sumPrev != null ? (sumCurr ?? 0) - (sumPrev ?? 0) : null;
              const sumChangePct = sumChange != null && (sumPrev ?? 0) ? (sumChange / Math.abs(sumPrev ?? 0)) * 100 : null;
              const sumChangeStyle = sumChange == null ? S.neutral : sumChange > 0 ? S.positive : sumChange < 0 ? S.negative : S.neutral;
              return [
                <tr key={`grp-${type}`} style={{ background: (TYPE_COLORS[type] ?? C.border) + "18", borderTop: `2px solid ${TYPE_COLORS[type] ?? C.border}` }}>
                  <td style={{ ...S.td, padding: "10px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TYPE_COLORS[type] ?? C.textMuted, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[type] ?? C.textMuted, display: "inline-block" }} />
                      {label}
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.textMuted }}>{sumPrev != null ? fmt(sumPrev) : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.text }}>{sumCurr != null ? fmt(sumCurr) : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...sumChangeStyle }}>{sumChange != null ? fmt(sumChange) : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...sumChangeStyle }}>{fmtPct(sumChangePct)}</td>
                </tr>,
                ...rows.map(({ acc, curr, prev, change, changePct }) => {
                  const isParent = accountHasChildren(acc.id, accounts);
                  const changeStyle = change == null ? S.neutral : change > 0 ? S.positive : change < 0 ? S.negative : S.neutral;
                  return (
                    <tr key={acc.id} style={isParent ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
                      <td style={{ ...S.td, paddingLeft: 12 + acc.depth * 16, fontWeight: isParent ? 600 : 400, color: isParent ? C.textMuted : C.textMuted }}>
                        {isParent && <span style={{ color: C.textSubtle, marginRight: 6, fontSize: 11 }}>Σ</span>}
                        {acc.name}
                      </td>
                      <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", color: C.textSubtle }}>{prev != null ? fmt(prev) : "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", color: isParent ? C.textSubtle : C.text }}>{curr != null ? fmt(curr) : "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", ...(isParent ? S.neutral : changeStyle) }}>{change != null ? fmt(change) : "—"}</td>
                      <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", ...(isParent ? S.neutral : changeStyle) }}>{fmtPct(isParent ? null : changePct)}</td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

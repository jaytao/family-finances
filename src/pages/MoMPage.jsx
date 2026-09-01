import { useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Legend, LabelList, ReferenceLine, ResponsiveContainer } from "recharts";
import { ACCOUNT_TYPES, TYPE_COLORS } from "../lib/constants.js";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { nestAccountsByParent, accountHasChildren, deriveSnapshotBalance, leafTypeTotals } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";
import TransfersPanel from "../components/TransfersPanel.jsx";

const ASSET_TYPES = ACCOUNT_TYPES.filter(t => t.group === "Assets").map(t => t.value);

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

export default function MoMPage({ accounts, snapshots, transfers, onDelete, onRefresh }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();
  const [endDate, setEndDate] = useState(() => {
    const stored = localStorage.getItem("mom_endDate");
    return stored && dates.includes(stored) ? stored : (dates[0] ?? "");
  });
  const [startDate, setStartDate] = useState(() => {
    const stored = localStorage.getItem("mom_startDate");
    if (stored === "") return "";
    return stored && dates.includes(stored) ? stored : (dates[1] ?? "");
  });
  const [hoveredType, setHoveredType] = useState(null);

  const updateEndDate = (d) => { setEndDate(d); localStorage.setItem("mom_endDate", d); };
  const updateStartDate = (d) => { setStartDate(d); localStorage.setItem("mom_startDate", d); };
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

  // Ignore any snapshot stored directly on a parent account — its balance is
  // derived from children, so a stray parent value must never be counted.
  const parentIds = new Set(accounts.map(a => a.parent_id).filter(id => id != null));
  const snapsOn = (date) => Object.fromEntries(
    snapshots.filter(s => s.snapshot_date === date && !parentIds.has(s.account_id)).map(s => [s.account_id, s])
  );
  const currByAccount = snapsOn(endDate);
  const prevByAccount = startDate ? snapsOn(startDate) : {};

  const subtreeContrib = (accountId, groupAccounts) => {
    const children = groupAccounts.filter(a => a.parent_id === accountId);
    if (!children.length) {
      return (transfers ?? [])
        .filter(t => t.account_id === accountId && t.date > startDate && t.date <= endDate)
        .reduce((s, t) => s + Number(t.net_flow), 0);
    }
    return children.reduce((sum, c) => sum + subtreeContrib(c.id, groupAccounts), 0);
  };

  const groups = ACCOUNT_TYPES.map(({ value: type, label, group }) => {
    const accsOfType = accounts.filter(a => a.type === type);
    if (!accsOfType.length) return null;
    const nested = nestAccountsByParent(accsOfType);
    const rows = nested.map(acc => {
      // Derive within accsOfType so a parent rolls up only its SAME-type children;
      // a cross-type child (e.g. a 401k under an investment brokerage) is counted
      // in its own type section instead, never twice.
      const curr = deriveSnapshotBalance(acc.id, currByAccount, accsOfType);
      const prev = deriveSnapshotBalance(acc.id, prevByAccount, accsOfType);
      if (curr == null && prev == null) return null;
      const netContrib = subtreeContrib(acc.id, accsOfType);
      const change = (curr ?? 0) - (prev ?? 0) - netContrib;
      const changePct = (prev ?? 0) ? (change / Math.abs(prev ?? 0)) * 100 : null;
      return { acc, curr, prev, netContrib, change, changePct };
    }).filter(Boolean);
    if (!rows.length) return null;
    return { type, label, group, accs: accsOfType, rows };
  }).filter(Boolean);

  const assetGroups = groups.filter(g => g.group !== "Liabilities");
  const liabGroups  = groups.filter(g => g.group === "Liabilities");

  const tally = (gs) => gs.reduce((tot, g) => {
    const top = g.rows.filter(r => r.acc.depth === 0);
    tot.prev    += top.reduce((s, r) => s + (r.prev ?? 0), 0);
    tot.curr    += top.reduce((s, r) => s + (r.curr ?? 0), 0);
    tot.contrib += top.reduce((s, r) => s + r.netContrib, 0);
    return tot;
  }, { prev: 0, curr: 0, contrib: 0 });
  const negate = (t) => ({ prev: -t.prev, curr: -t.curr, contrib: -t.contrib });

  const assetTot = tally(assetGroups);
  const liabTot  = tally(liabGroups);
  const net = { prev: assetTot.prev - liabTot.prev, curr: assetTot.curr - liabTot.curr, contrib: assetTot.contrib - liabTot.contrib };

  const presentTypes = ACCOUNT_TYPES.filter(({ value }) => accounts.some(a => a.type === value));
  const topAssetIdx = presentTypes.reduce((last, t, i) => t.group === "Liabilities" ? last : i, -1);

  const chartData = dates.slice().reverse().filter(d =>
    (!startDate || d >= startDate) && (!endDate || d <= endDate)
  ).map(d => {
    const totals = leafTypeTotals(snapshots, accounts, d);
    const obj = { date: d };
    presentTypes.forEach(({ value: type, label, group }) => {
      obj[label] = group === "Liabilities" ? -(totals[type] ?? 0) : (totals[type] ?? 0);
    });
    obj.total = presentTypes.reduce((sum, { label }) => sum + obj[label], 0);
    return obj;
  });

  const changeStyleOf = (v) => v > 0 ? S.positive : v < 0 ? S.negative : S.neutral;
  const contribColor = (v) => v > 0 ? "#60a5fa" : v < 0 ? "#fb923c" : C.textMuted;

  const headRow = (
    <thead>
      <tr>
        <th style={S.th}>Account</th>
        <th style={{ ...S.th, textAlign: "right" }}>Beginning</th>
        <th style={{ ...S.th, textAlign: "right" }}>Contributions</th>
        <th style={{ ...S.th, textAlign: "right" }}>Ending</th>
        <th style={{ ...S.th, textAlign: "right" }}>Change</th>
        <th style={{ ...S.th, textAlign: "right" }}>% Change</th>
      </tr>
    </thead>
  );

  const totalRow = (key, label, t, emphasize) => {
    const change = t.curr - t.prev - t.contrib;
    const pct = t.prev ? (change / Math.abs(t.prev)) * 100 : null;
    const cs = changeStyleOf(change);
    return (
      <tr key={key} style={{ background: emphasize ? "#1a1a2e" : "transparent", borderTop: `2px solid ${C.border}` }}>
        <td style={{ ...S.td, fontWeight: 700, color: C.text, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.textMuted }}>{fmt(t.prev)}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: contribColor(t.contrib) }}>{t.contrib ? fmt(t.contrib) : "—"}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.text }}>{fmt(t.curr)}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...cs }}>{fmt(change)}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...cs }}>{fmtPct(pct)}</td>
      </tr>
    );
  };

  const renderGroupRows = ({ type, label, accs, rows }) => {
    const topRows = rows.filter(({ acc }) => acc.depth === 0);
    const sumPrev   = topRows.some(r => r.prev != null) ? topRows.reduce((s, r) => s + (r.prev ?? 0), 0) : null;
    const sumCurr   = topRows.some(r => r.curr != null) ? topRows.reduce((s, r) => s + (r.curr ?? 0), 0) : null;
    const sumContrib = topRows.reduce((s, r) => s + r.netContrib, 0);
    const sumChange = sumCurr != null || sumPrev != null ? (sumCurr ?? 0) - (sumPrev ?? 0) - sumContrib : null;
    const sumChangePct = sumChange != null && (sumPrev ?? 0) ? (sumChange / Math.abs(sumPrev ?? 0)) * 100 : null;
    const sumChangeStyle = sumChange == null ? S.neutral : changeStyleOf(sumChange);
    return [
      <tr key={`grp-${type}`} style={{ background: (TYPE_COLORS[type] ?? C.border) + "18", borderTop: `2px solid ${TYPE_COLORS[type] ?? C.border}` }}>
        <td style={{ ...S.td, padding: "var(--th-py, 10px) var(--cell-px, 12px)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TYPE_COLORS[type] ?? C.textMuted, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[type] ?? C.textMuted, display: "inline-block" }} />
            {label}
          </span>
        </td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.textMuted }}>{sumPrev != null ? fmt(sumPrev) : "—"}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: contribColor(sumContrib) }}>{sumContrib ? fmt(sumContrib) : "—"}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.text }}>{sumCurr != null ? fmt(sumCurr) : "—"}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...sumChangeStyle }}>{sumChange != null ? fmt(sumChange) : "—"}</td>
        <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...sumChangeStyle }}>{fmtPct(sumChangePct)}</td>
      </tr>,
      ...rows.map(({ acc, curr, prev, netContrib, change, changePct }) => {
        const isParent = accountHasChildren(acc.id, accs);
        const changeStyle = change == null ? S.neutral : changeStyleOf(change);
        return (
          <tr key={acc.id} style={isParent ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
            <td style={{ ...S.td, paddingLeft: S.indent(acc.depth, 16), fontWeight: isParent ? 600 : 400, color: C.textMuted }}>
              {isParent && <span style={{ color: C.textSubtle, marginRight: 6, fontSize: 11 }}>Σ</span>}
              {acc.name}
            </td>
            <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", color: C.textSubtle }}>{prev != null ? fmt(prev) : "—"}</td>
            <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", color: netContrib > 0 ? "#60a5fa" : netContrib < 0 ? "#fb923c" : C.textSubtle }}>{netContrib ? fmt(netContrib) : "—"}</td>
            <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", color: isParent ? C.textSubtle : C.text }}>{curr != null ? fmt(curr) : "—"}</td>
            <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", ...(isParent ? S.neutral : changeStyle) }}>{change != null ? fmt(change) : "—"}</td>
            <td style={{ ...S.td, textAlign: "right", fontStyle: isParent ? "italic" : "normal", ...(isParent ? S.neutral : changeStyle) }}>{fmtPct(isParent ? null : changePct)}</td>
          </tr>
        );
      }),
    ];
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Month over Month</div>
          <div style={S.pageSub}>Balance change over selected range</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.06em" }}>FROM</span>
          <select style={{ ...S.select, width: 150 }} value={startDate} onChange={e => updateStartDate(e.target.value)}>
            <option value="">(none)</option>
            {dates.filter(d => !endDate || d < endDate).map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
          </select>
          <span style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.06em" }}>TO</span>
          <select style={{ ...S.select, width: 150 }} value={endDate} onChange={e => updateEndDate(e.target.value)}>
            {dates.filter(d => !startDate || d > startDate).map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
          </select>
        </div>
      </div>

      {chartData.length > 0 && presentTypes.length > 0 && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={S.sectionTitle}>Balances by month</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} stackOffset="sign" margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => (v < 0 ? "-$" : "$") + Math.round(Math.abs(v) / 1000) + "k"} tick={{ fill: C.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
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
                    {i === topAssetIdx && (
                      <LabelList dataKey="total" content={totalLabel} />
                    )}
                    <LabelList dataKey={label} content={isHovered ? valueLabel : noLabel} />
                  </Bar>
                );
              })}
              <ReferenceLine y={0} stroke={C.text} strokeWidth={1.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={S.card}>
        <div style={S.sectionTitle}>Net Worth</div>
        <table style={S.table}>
          {headRow}
          <tbody>
            {totalRow("nw-assets", "Total Assets", assetTot)}
            {liabGroups.length > 0 && totalRow("nw-liab", "Total Liabilities", negate(liabTot))}
            {totalRow("nw-net", "Net Worth", net, true)}
          </tbody>
        </table>
      </div>

      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={S.sectionTitle}>Assets</div>
        <table style={S.table}>
          {headRow}
          <tbody>
            {assetGroups.flatMap(renderGroupRows)}
            {totalRow("assets-total", "Total Assets", assetTot, true)}
          </tbody>
        </table>
      </div>

      {liabGroups.length > 0 && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={S.sectionTitle}>Liabilities</div>
          <table style={S.table}>
            {headRow}
            <tbody>
              {liabGroups.flatMap(renderGroupRows)}
              {totalRow("liab-total", "Total Liabilities", liabTot, true)}
            </tbody>
          </table>
        </div>
      )}

      <TransfersPanel
        accounts={accounts}
        transferAccounts={accounts.filter(a => ASSET_TYPES.includes(a.type))}
        transfers={transfers}
        startDate={startDate}
        endDate={endDate}
        onDelete={onDelete}
        onRefresh={onRefresh}
      />
    </div>
  );
}

import { useState } from "react";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { nestAccountsByParent, accountHasChildren, deriveSnapshotBalance } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";
import { ACCOUNT_TYPES, TYPE_COLORS } from "../lib/constants.js";
import TransfersPanel from "../components/TransfersPanel.jsx";

const RETURNABLE_TYPES = ACCOUNT_TYPES.filter(t => t.group === "Assets");

const loadTypes = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("returns_types"));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {}
  return ["asset_investment"];
};

export default function ReturnsPage({ accounts, snapshots, transfers, onDelete, onRefresh }) {
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();

  const [endDate, setEndDate] = useState(() => {
    const stored = localStorage.getItem("returns_endDate");
    return stored && dates.includes(stored) ? stored : (dates[0] ?? "");
  });
  const [startDate, setStartDate] = useState(() => {
    const stored = localStorage.getItem("returns_startDate");
    return stored && dates.includes(stored) ? stored : (dates[1] ?? "");
  });
  const [selectedTypes, setSelectedTypes] = useState(loadTypes);

  const updateEndDate = (d) => { setEndDate(d); localStorage.setItem("returns_endDate", d); };
  const updateStartDate = (d) => { setStartDate(d); localStorage.setItem("returns_startDate", d); };

  const toggleType = (type) => {
    setSelectedTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      const result = next.length ? next : prev;
      localStorage.setItem("returns_types", JSON.stringify(result));
      return result;
    });
  };

  const investAccounts = accounts.filter(a => selectedTypes.includes(a.type));

  const endByAccount = Object.fromEntries(
    snapshots.filter(s => s.snapshot_date === endDate).map(s => [s.account_id, s])
  );
  const startByAccount = startDate
    ? Object.fromEntries(snapshots.filter(s => s.snapshot_date === startDate).map(s => [s.account_id, s]))
    : {};

  const subtreeContrib = (accountId) => {
    const children = investAccounts.filter(a => a.parent_id === accountId);
    if (!children.length) {
      return transfers
        .filter(t => t.account_id === accountId && t.date > startDate && t.date <= endDate)
        .reduce((s, t) => s + Number(t.net_flow), 0);
    }
    return children.reduce((sum, c) => sum + subtreeContrib(c.id), 0);
  };

  const rows = nestAccountsByParent(investAccounts).map(acc => {
    const isParent  = accountHasChildren(acc.id, investAccounts);
    const ending    = deriveSnapshotBalance(acc.id, endByAccount, accounts);
    const beginning = deriveSnapshotBalance(acc.id, startByAccount, accounts);
    if (ending == null && beginning == null) return null;
    const netContrib = subtreeContrib(acc.id);
    const gain = (ending ?? 0) - (beginning ?? 0) - netContrib;
    const ret  = (beginning ?? 0) ? (gain / Math.abs(beginning ?? 0)) * 100 : null;
    return { acc, ending, beginning, netContrib, gain, ret, isParent };
  }).filter(Boolean);

  const topRows = rows.filter(r => r.acc.depth === 0);
  const totalBeginning = topRows.every(r => r.beginning == null) ? null : topRows.reduce((s, r) => s + (r.beginning ?? 0), 0);
  const totalEnding    = topRows.reduce((s, r) => s + (r.ending ?? 0), 0);
  const totalContrib   = topRows.reduce((s, r) => s + r.netContrib, 0);
  const totalGain      = totalBeginning != null ? totalEnding - totalBeginning - totalContrib : null;
  const totalRet       = totalGain != null && (totalBeginning ?? 0) ? (totalGain / Math.abs(totalBeginning ?? 0)) * 100 : null;

  return (
    <div>
      <div style={{ background: "#f8717118", border: "1px solid #f8717140", borderRadius: 4, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.textMuted }}>
        <strong style={{ color: "#f87171", letterSpacing: "0.06em" }}>DEPRECATED</strong>
        {" — this page has been superseded by "}<strong style={{ color: C.text }}>MoM Change</strong>
        {", which now shows the same contribution-adjusted returns and transfer log over a selectable range."}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Investment Returns</div>
          <div style={S.pageSub}>Money-weighted return — contributions excluded</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {RETURNABLE_TYPES.map(t => {
              const active = selectedTypes.includes(t.value);
              const color = TYPE_COLORS[t.value] ?? C.accent;
              return (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 12, cursor: "pointer", letterSpacing: "0.04em",
                    border: `1px solid ${active ? color : C.border}`,
                    background: active ? color + "22" : "transparent",
                    color: active ? color : C.textMuted,
                    transition: "all 0.15s",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
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
            {rows.map(({ acc, ending, beginning, netContrib, gain, ret, isParent }) => (
              <tr key={acc.id} style={isParent ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
                <td style={{ ...S.td, paddingLeft: 12 + acc.depth * 20, fontWeight: isParent ? 700 : 400, color: isParent ? C.text : C.textMuted }}>
                  {acc.depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>}
                  {acc.name}
                </td>
                <td style={{ ...S.td, textAlign: "right", color: C.textMuted }}>{beginning != null ? fmt(beginning) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", color: netContrib > 0 ? "#60a5fa" : netContrib < 0 ? "#fb923c" : C.textMuted }}>{netContrib ? fmt(netContrib) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", color: C.text }}>{ending != null ? fmt(ending) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", ...(gain > 0 ? S.positive : gain < 0 ? S.negative : S.neutral) }}>{fmt(gain)}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: isParent ? 700 : 400, ...(ret > 0 ? S.positive : ret < 0 ? S.negative : S.neutral) }}>{fmtPct(ret)}</td>
              </tr>
            ))}
            {rows.length > 0 && (() => {
              const totalGainStyle = totalGain == null ? S.neutral : totalGain > 0 ? S.positive : totalGain < 0 ? S.negative : S.neutral;
              const totalRetStyle  = totalRet  == null ? S.neutral : totalRet  > 0 ? S.positive : totalRet  < 0 ? S.negative : S.neutral;
              return (
                <tr style={{ background: "#1a1a2e", borderTop: `2px solid ${C.border}` }}>
                  <td style={{ ...S.td, fontWeight: 700, color: C.text, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" }}>Total</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.textMuted }}>{totalBeginning != null ? fmt(totalBeginning) : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: totalContrib > 0 ? "#60a5fa" : totalContrib < 0 ? "#fb923c" : C.textMuted }}>{totalContrib ? fmt(totalContrib) : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: C.text }}>{fmt(totalEnding)}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...totalGainStyle }}>{totalGain != null ? fmt(totalGain) : "—"}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 700, ...totalRetStyle }}>{fmtPct(totalRet)}</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      <TransfersPanel
        accounts={accounts}
        transferAccounts={investAccounts}
        transfers={transfers}
        startDate={startDate}
        endDate={endDate}
        onDelete={onDelete}
        onRefresh={onRefresh}
      />
    </div>
  );
}

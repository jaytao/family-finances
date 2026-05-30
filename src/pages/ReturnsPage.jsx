import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { fmt, fmtPct, fmtDate, parseCash } from "../lib/formatters.js";
import { nestAccountsByParent, accountHasChildren, deriveSnapshotBalance } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";
import CashInput from "../components/CashInput.jsx";

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

  const updateEndDate = (d) => { setEndDate(d); localStorage.setItem("returns_endDate", d); };
  const updateStartDate = (d) => { setStartDate(d); localStorage.setItem("returns_startDate", d); };
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const investAccounts = accounts.filter(a => a.type === "asset_investment");

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

  const windowStart = startDate ? startDate.slice(0, 7) + "-01" : null;
  const windowTransfers = transfers.filter(t =>
    (!windowStart || t.date >= windowStart) && (!endDate || t.date <= endDate)
  );

  const rows = nestAccountsByParent(investAccounts).map(acc => {
    const isParent  = accountHasChildren(acc.id, investAccounts);
    const ending    = deriveSnapshotBalance(acc.id, endByAccount, accounts);
    const beginning = deriveSnapshotBalance(acc.id, startByAccount, accounts);
    if (ending == null) return null;
    const netContrib = subtreeContrib(acc.id);
    const gain = beginning != null ? ending - beginning - netContrib : null;
    const ret  = gain != null && beginning ? (gain / Math.abs(beginning)) * 100 : null;
    return { acc, ending, beginning, netContrib, gain, ret, isParent };
  }).filter(Boolean);

  const topRows = rows.filter(r => r.acc.depth === 0);
  const totalBeginning = topRows.every(r => r.beginning == null) ? null : topRows.reduce((s, r) => s + (r.beginning ?? 0), 0);
  const totalEnding    = topRows.reduce((s, r) => s + (r.ending ?? 0), 0);
  const totalContrib   = topRows.reduce((s, r) => s + r.netContrib, 0);
  const totalGain      = totalBeginning != null ? totalEnding - totalBeginning - totalContrib : null;
  const totalRet       = totalGain != null && totalBeginning ? (totalGain / Math.abs(totalBeginning)) * 100 : null;

  const openTransfer = () => {
    setForm({ account_id: investAccounts[0]?.id ?? "", date: endDate, net_flow: "", description: "" });
    setModal({ mode: "new" });
  };

  const openEdit = (t) => {
    setForm({ id: t.id, account_id: t.account_id, date: t.date, net_flow: String(t.net_flow), description: t.description ?? "" });
    setModal({ mode: "edit" });
  };

  const saveTransfer = async () => {
    const net_flow = parseCash(form.net_flow);
    if (net_flow == null) return;
    const payload = { account_id: Number(form.account_id), date: form.date, net_flow, description: form.description || null };
    const { error } = modal.mode === "edit"
      ? await supabase.from("transfers").update(payload).eq("id", form.id)
      : await supabase.from("transfers").insert([payload]);
    if (!error) { setModal(null); onRefresh(); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Investment Returns</div>
          <div style={S.pageSub}>Money-weighted return — contributions excluded</div>
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
            {rows.map(({ acc, ending, beginning, netContrib, gain, ret, isParent }) => (
              <tr key={acc.id} style={isParent ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
                <td style={{ ...S.td, paddingLeft: 12 + acc.depth * 20, fontWeight: isParent ? 700 : 400, color: isParent ? C.text : C.textMuted }}>
                  {acc.depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>}
                  {acc.name}
                </td>
                <td style={{ ...S.td, textAlign: "right", color: C.textMuted }}>{beginning != null ? fmt(beginning) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", color: netContrib > 0 ? "#60a5fa" : netContrib < 0 ? "#fb923c" : C.textMuted }}>{netContrib ? fmt(netContrib) : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", color: C.text }}>{fmt(ending)}</td>
                <td style={{ ...S.td, textAlign: "right", ...(gain > 0 ? S.positive : gain < 0 ? S.negative : S.neutral) }}>{gain != null ? fmt(gain) : "—"}</td>
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

      {windowTransfers.length > 0 && (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.sectionTitle}>Transfers in window</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Account</th>
                <th style={{ ...S.th, textAlign: "right" }}>Flow</th>
                <th style={S.th}>Description</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {windowTransfers.map(t => {
                const acc = accounts.find(a => a.id === t.account_id);
                return (
                  <tr key={t.id}>
                    <td style={{ ...S.td, color: C.textMuted }}>{fmtDate(t.date)}</td>
                    <td style={S.td}>{acc?.name ?? "—"}</td>
                    <td style={{ ...S.td, textAlign: "right", ...(t.net_flow > 0 ? S.positive : S.negative) }}>{fmt(t.net_flow)}</td>
                    <td style={{ ...S.td, color: C.textMuted }}>{t.description || "—"}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button style={S.btnGhost} onClick={() => openEdit(t)}>Edit</button>
                        <button style={S.btnDanger} onClick={() => onDelete("transfers", t.id)}>Del</button>
                      </span>
                    </td>
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
            <div style={S.modalTitle}>{modal.mode === "edit" ? "Edit transfer" : "Log cash transfer"}</div>
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
              <CashInput style={S.input} placeholder="e.g. $14,000 or -$5,000" value={form.net_flow} onChange={v => setForm(f => ({ ...f, net_flow: v }))} />
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

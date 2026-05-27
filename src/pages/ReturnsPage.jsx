import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { fmt, fmtPct, fmtDate } from "../lib/formatters.js";
import { C, S } from "../styles/theme.js";

export default function ReturnsPage({ accounts, snapshots, transfers }) {
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
    const { error } = await supabase.from("transfers").insert([{
      ...form,
      account_id: Number(form.account_id),
      net_flow: Number(form.net_flow),
    }]);
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

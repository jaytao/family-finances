import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { fmt, fmtDate, parseCash } from "../lib/formatters.js";
import { C, S } from "../styles/theme.js";
import CashInput from "./CashInput.jsx";

export default function TransfersPanel({ accounts, transferAccounts, transfers, startDate, endDate, onDelete, onRefresh }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const windowStart = startDate ? startDate.slice(0, 7) + "-01" : null;
  const windowTransfers = transfers.filter(t =>
    (!windowStart || t.date >= windowStart) && (!endDate || t.date <= endDate)
  );

  const openTransfer = () => {
    setForm({ account_id: transferAccounts[0]?.id ?? "", date: endDate, net_flow: "", description: "" });
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
    <>
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={S.sectionTitle}>Transfers in window</div>
          <button style={S.btn} onClick={openTransfer}>+ Log transfer</button>
        </div>
        {windowTransfers.length === 0 ? (
          <div style={{ fontSize: 14, color: C.textSubtle, padding: "8px 0" }}>No transfers in this range</div>
        ) : (
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
        )}
      </div>

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>{modal.mode === "edit" ? "Edit transfer" : "Log cash transfer"}</div>
            <div style={S.formGroup}>
              <label style={S.label}>Investment account</label>
              <select style={S.select} value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                {transferAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
    </>
  );
}

import { useState } from "react";
import { fmt, fmtDate, today } from "../lib/formatters.js";
import { C, S } from "../styles/theme.js";

export default function TransactionsPage({ accounts, transactions, entries, onSave }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    date: today.toISOString().split("T")[0],
    description: "",
    memo: "",
    lines: [
      { account_id: "", type: "debit",  amount: "" },
      { account_id: "", type: "credit", amount: "" },
    ],
  });

  const addLine    = () => setForm(f => ({ ...f, lines: [...f.lines, { account_id: "", type: "debit", amount: "" }] }));
  const updateLine = (i, k, v) => setForm(f => { const lines = [...f.lines]; lines[i] = { ...lines[i], [k]: v }; return { ...f, lines }; });
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const debitTotal  = form.lines.filter(l => l.type === "debit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const creditTotal = form.lines.filter(l => l.type === "credit").reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced    = Math.abs(debitTotal - creditTotal) < 0.001;

  const save = async () => {
    await onSave(form);
    setModal(false);
  };

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
            {transactions.slice(0, 30).map(tx => {
              const txEntries = entries.filter(e => e.transaction_id === tx.id);
              return (
                <tr key={tx.id} style={{ opacity: tx.is_void ? 0.4 : 1 }}>
                  <td style={{ ...S.td, color: C.textMuted }}>{fmtDate(tx.date)}</td>
                  <td style={{ ...S.td, color: "#e8e4d9", fontWeight: 600 }}>{tx.description}</td>
                  <td style={S.td}>
                    {txEntries.slice(0, 2).map(e => {
                      const acc = accounts.find(a => a.id === e.account_id);
                      return (
                        <span key={e.id} style={{ marginRight: 8, color: e.entry_type === "debit" ? "#4ade80" : "#f87171", fontSize: 13 }}>
                          {e.entry_type === "debit" ? "DR" : "CR"} {acc?.name} {fmt(e.amount)}
                        </span>
                      );
                    })}
                    {txEntries.length > 2 && <span style={{ color: C.textMuted, fontSize: 13 }}>+{txEntries.length - 2} more</span>}
                  </td>
                  <td style={S.td}>
                    {tx.is_void
                      ? <span style={{ color: "#f87171", fontSize: 13 }}>VOID</span>
                      : <span style={{ color: "#4ade80", fontSize: 13 }}>OK</span>
                    }
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: C.textMuted, padding: "32px 0" }}>No transactions yet</td></tr>
            )}
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

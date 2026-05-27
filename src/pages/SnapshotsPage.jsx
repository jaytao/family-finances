import { useState } from "react";
import { fmt, fmtCash, fmtDate, lastDayOfMonth, today } from "../lib/formatters.js";
import {
  accountHasChildren,
  deriveSnapshotBalance,
  deriveRowsBalance,
  buildSnapshotDisplayRows,
  buildEditMonthRows,
  buildBulkSnapshotRows,
} from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";
import CashInput from "../components/CashInput.jsx";

export default function SnapshotsPage({ accounts, snapshots, onSave, onDelete }) {
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState({});
  const [filterMonth, setFilterMonth] = useState("");
  const [collapsed, setCollapsed]   = useState(new Set());

  const toggleCollapse = (id) => setCollapsed(c => {
    const n = new Set(c);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const dates        = [...new Set(snapshots.map(s => s.snapshot_date))].sort().reverse();
  const displayDates = filterMonth ? [filterMonth] : dates.slice(0, 6);
  const assetAccounts = accounts;

  const openNew = () => {
    const y = today.getFullYear(), m = today.getMonth() + 1;
    const snapshot_date = lastDayOfMonth(y, m);
    setForm({ snapshot_date, rows: buildBulkSnapshotRows(assetAccounts, snapshots, snapshot_date) });
    setModal({ mode: "bulk" });
  };

  const setSnapshotDate = (snapshot_date) => {
    setForm({ snapshot_date, rows: buildBulkSnapshotRows(assetAccounts, snapshots, snapshot_date) });
  };

  const setRow = (accountId, patch) => {
    setForm(f => ({ ...f, rows: f.rows.map(r => r.account_id === accountId ? { ...r, ...patch } : r) }));
  };

  const copyAllPrevious = () => {
    setForm(f => ({
      ...f,
      rows: f.rows.map(r => ({
        ...r,
        balance: r.hasChildren ? "" : (r.prev_balance != null ? String(r.prev_balance) : r.balance),
      })),
    }));
  };

  const openEdit = (snap) => { setForm({ ...snap }); setModal({ mode: "edit" }); };

  const openAdd = (accountId, snapshotDate) => {
    setForm({ account_id: accountId, snapshot_date: snapshotDate, balance: "", notes: "" });
    setModal({ mode: "new" });
  };

  const openEditMonth = (snapshotDate) => {
    setForm({ snapshot_date: snapshotDate, rows: buildEditMonthRows(assetAccounts, snapshots, snapshotDate) });
    setModal({ mode: "editMonth" });
  };

  const save = async () => { await onSave(form, modal.mode); setModal(null); };

  const isMonthEditor = modal?.mode === "bulk" || modal?.mode === "editMonth";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Snapshots</div>
          <div style={S.pageSub}>Monthly balance entries per account</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ ...S.select, width: 160 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">All months</option>
            {dates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
          </select>
          <button style={S.btn} onClick={openNew}>+ New snapshot</button>
        </div>
      </div>

      {(() => {
        const latestDate = dates[0];
        if (!latestDate) return null;
        const latestSnaps = snapshots.filter(s => s.snapshot_date === latestDate);
        const latestRows = buildSnapshotDisplayRows(latestSnaps, assetAccounts);
        let assets = 0, liabilities = 0;
        latestRows.filter(r => r.depth === 0).forEach(({ account, balance }) => {
          if (balance == null) return;
          if (["asset_cash", "asset_investment", "asset_physical"].includes(account.type)) assets += balance;
          if (account.type === "liability") liabilities += balance;
        });
        const netWorth = assets - liabilities;
        return (
          <div style={{ ...S.grid(3), marginBottom: 20 }}>
            {[
              { label: "Net Worth",         value: netWorth,    color: netWorth >= 0 ? "#4ade80" : "#f87171" },
              { label: "Total Assets",      value: assets },
              { label: "Total Liabilities", value: liabilities },
            ].map(m => (
              <div key={m.label} style={S.card}>
                <div style={S.cardLabel}>{m.label}</div>
                <div style={{ ...S.cardValue, color: m.color || C.text }}>{fmt(m.value)}</div>
                <div style={S.cardSub}>{fmtDate(latestDate)}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {displayDates.map(date => {
        const snaps = snapshots.filter(s => s.snapshot_date === date);
        const rows  = buildSnapshotDisplayRows(snaps, assetAccounts);
        return (
          <div key={date} style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ ...S.sectionTitle, marginBottom: 0 }}>{fmtDate(date)}</div>
              <button style={S.btnGhost} onClick={() => openEditMonth(date)}>Edit month</button>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Account</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Balance</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Notes</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let topId = null;
                  const visible = [];
                  for (const row of rows) {
                    if (row.depth === 0) { topId = row.account.id; visible.push(row); }
                    else if (!collapsed.has(topId)) visible.push(row);
                  }
                  return visible.map(({ snap, account, depth, balance, hasChildren }) => {
                    const isTopLevel = depth === 0;
                    return (
                      <tr key={snap?.id ?? `rollup-${account.id}`} style={isTopLevel ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
                        <td style={{ ...S.td, fontWeight: isTopLevel ? 700 : 400, paddingLeft: 12 + depth * 20, color: isTopLevel ? C.text : C.textMuted }}>
                          {isTopLevel && hasChildren
                            ? <span style={{ color: C.textSubtle, marginRight: 6, cursor: "pointer", userSelect: "none", fontSize: 11 }} onClick={() => toggleCollapse(account.id)}>{collapsed.has(account.id) ? "▶" : "▼"}</span>
                            : (depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>)
                          }
                          {account?.name ?? "Unknown"}
                        </td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: isTopLevel ? 700 : 500, color: C.text }}>
                          {balance != null ? fmtCash(balance) : "—"}
                        </td>
                        <td style={S.td}><span style={S.badge(account?.type)}>{account?.type}</span></td>
                        <td style={{ ...S.td, color: C.textMuted }}>{hasChildren ? "—" : (snap?.notes || "—")}</td>
                        <td style={{ ...S.td, textAlign: "right" }}>
                          {!hasChildren && (
                            <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {snap ? (
                                <>
                                  <button style={S.btnGhost} onClick={() => openEdit(snap)}>Edit</button>
                                  <button style={S.btnDanger} onClick={() => onDelete("snapshots", snap.id)}>Del</button>
                                </>
                              ) : (
                                <button style={S.btnGhost} onClick={() => openAdd(account.id, date)}>Add</button>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        );
      })}

      {isMonthEditor && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBoxWide}>
            <div style={S.modalTitle}>
              {modal.mode === "editMonth" ? `Edit snapshots — ${fmtDate(form.snapshot_date)}` : "New monthly snapshots"}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ ...S.formGroup, marginBottom: 0, flex: "1 1 200px" }}>
                <label style={S.label}>Snapshot date</label>
                {modal.mode === "editMonth" ? (
                  <div style={{ fontSize: 15, color: C.text, padding: "10px 0" }}>{fmtDate(form.snapshot_date)}</div>
                ) : (
                  <input style={S.input} type="date" value={form.snapshot_date} onChange={e => setSnapshotDate(e.target.value)} />
                )}
              </div>
              <button type="button" style={S.btnGhost} onClick={copyAllPrevious}>Copy all previous</button>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Account</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Previous</th>
                  <th style={{ ...S.th, textAlign: "right" }}>New balance</th>
                  <th style={S.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {form.rows?.map(row => {
                  const acc        = accounts.find(a => a.id === row.account_id);
                  const depth      = row.depth ?? 0;
                  const derivedNew = row.hasChildren ? deriveRowsBalance(row.account_id, form.rows, assetAccounts) : null;
                  return (
                    <tr key={row.account_id}>
                      <td style={{ ...S.td, paddingLeft: 12 + depth * 20 }}>
                        <div style={{ fontWeight: depth === 0 ? 600 : 400 }}>
                          {depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>}
                          {acc?.name ?? "Unknown"}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          <span style={S.badge(acc?.type)}>{acc?.type}</span>
                          {row.prev_date && <span style={{ marginLeft: 6 }}>as of {fmtDate(row.prev_date)}</span>}
                          {row.hasChildren && <span style={{ marginLeft: 6 }}>· rollup</span>}
                        </div>
                      </td>
                      <td style={{ ...S.td, textAlign: "right", color: C.textMuted }}>
                        {row.prev_balance != null ? fmtCash(row.prev_balance) : "—"}
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        {row.hasChildren ? (
                          <div style={{ ...S.input, width: 140, textAlign: "right", border: "none", background: "transparent", color: C.textMuted, padding: "10px 12px" }}>
                            {derivedNew != null ? fmtCash(derivedNew) : "—"}
                          </div>
                        ) : (
                          <CashInput
                            style={{ ...S.input, width: 140, textAlign: "right" }}
                            placeholder={row.prev_balance != null ? fmtCash(row.prev_balance) : "$0.00"}
                            value={row.balance}
                            onChange={v => setRow(row.account_id, { balance: v })}
                          />
                        )}
                      </td>
                      <td style={S.td}>
                        {row.hasChildren ? (
                          <span style={{ color: C.textSubtle, fontSize: 12 }}>—</span>
                        ) : (
                          <input
                            style={S.input}
                            type="text"
                            placeholder="Optional"
                            value={row.notes ?? ""}
                            onChange={e => setRow(row.account_id, { notes: e.target.value })}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>
              {modal.mode === "editMonth"
                ? "Update existing balances or add values for accounts missing this month. Leaf accounts only."
                : "Enter balances on leaf accounts only. Parent balances are summed from children. Leave blank to skip."}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={save}>{modal.mode === "editMonth" ? "Save changes" : "Save all"}</button>
            </div>
          </div>
        </div>
      )}

      {modal?.mode === "new" && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>Add snapshot</div>
            <div style={S.formGroup}>
              <label style={S.label}>Account</label>
              <div style={{ fontSize: 15, color: C.text }}>{accounts.find(a => a.id === form.account_id)?.name ?? "Unknown"}</div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Snapshot date</label>
              <div style={{ fontSize: 15, color: C.text }}>{fmtDate(form.snapshot_date)}</div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Balance</label>
              <CashInput style={S.input} placeholder="$0.00" value={form.balance ?? ""} onChange={v => setForm(f => ({ ...f, balance: v }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Notes</label>
              <input style={S.input} type="text" placeholder="Optional" value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal?.mode === "edit" && (() => {
        const editHasChildren = accountHasChildren(form.account_id, accounts);
        const dateSnaps = Object.fromEntries(
          snapshots.filter(s => s.snapshot_date === form.snapshot_date).map(s => [s.account_id, s])
        );
        const derived = editHasChildren ? deriveSnapshotBalance(form.account_id, dateSnaps, accounts) : null;
        return (
          <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div style={S.modalBox}>
              <div style={S.modalTitle}>Edit snapshot</div>
              <div style={S.formGroup}>
                <label style={S.label}>Account</label>
                <div style={{ fontSize: 15, color: C.text }}>{accounts.find(a => a.id === form.account_id)?.name ?? "Unknown"}</div>
              </div>
              {editHasChildren ? (
                <>
                  <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>
                    Parent account balances are calculated from child accounts. Edit the child snapshots instead.
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Derived balance</label>
                    <div style={{ fontSize: 15, color: C.text }}>{derived != null ? fmtCash(derived) : "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
                    <button style={S.btn} onClick={() => setModal(null)}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={S.formGroup}>
                    <label style={S.label}>Snapshot date</label>
                    <input style={S.input} type="date" value={form.snapshot_date} onChange={e => setForm(f => ({ ...f, snapshot_date: e.target.value }))} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Balance</label>
                    <CashInput style={S.input} placeholder="$0.00" value={form.balance ?? ""} onChange={v => setForm(f => ({ ...f, balance: v }))} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Notes</label>
                    <input style={S.input} type="text" placeholder="Optional" value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
                    <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
                    <button style={S.btn} onClick={save}>Save</button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

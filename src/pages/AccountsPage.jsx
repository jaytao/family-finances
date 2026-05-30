import { useState } from "react";
import { ACCOUNT_TYPES } from "../lib/constants.js";
import { nestAccountsByParent } from "../lib/accountUtils.js";
import { C, S } from "../styles/theme.js";

export default function AccountsPage({ accounts, onSave, onDelete }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [collapsed, setCollapsed] = useState(new Set());
  const toggleCollapse = (id) => setCollapsed(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openNew = () => {
    setForm({ name: "", type: "asset_cash", currency: "USD", description: "" });
    setModal({ mode: "new" });
  };

  const openEdit = (acc) => {
    setForm({ ...acc });
    setModal({ mode: "edit" });
  };

  const save = async () => {
    await onSave(form, modal.mode);
    setModal(null);
  };

  const typeMeta = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t]));
  const groupOrder = [...new Set(ACCOUNT_TYPES.map(t => t.group))];
  const grouped = groupOrder.reduce((g, group) => {
    const typesInGroup = ACCOUNT_TYPES.filter(t => t.group === group).map(t => t.value);
    const accs = accounts
      .filter(a => typesInGroup.includes(a.type))
      .map(a => ({ ...a, typeLabel: typeMeta[a.type]?.label ?? a.type }));
    if (accs.length) g[group] = nestAccountsByParent(accs);
    return g;
  }, {});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={S.pageTitle}>Accounts</div>
          <div style={S.pageSub}>Chart of accounts — edit types and structure</div>
        </div>
        <button style={S.btn} onClick={openNew}>+ New account</button>
      </div>

      {Object.entries(grouped).map(([group, accs]) => (
        <div key={group} style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.sectionTitle}>{group}</div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Currency</th>
                <th style={S.th}>Description</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let topId = null;
                const visible = [];
                for (const a of accs) {
                  if (a.depth === 0) { topId = a.id; visible.push(a); }
                  else if (!collapsed.has(topId)) visible.push(a);
                }
                return visible.map(a => {
                  const isTop = a.depth === 0;
                  const hasKids = isTop && accs.some(o => o.parent_id === a.id);
                  return (
                    <tr key={a.id} style={isTop ? { background: "#181818", borderTop: `1px solid ${C.border}` } : {}}>
                      <td style={{ ...S.td, fontWeight: isTop ? 700 : 400, color: isTop ? C.text : C.textMuted, paddingLeft: 12 + a.depth * 20 }}>
                        {hasKids
                          ? <span style={{ color: C.textSubtle, marginRight: 6, cursor: "pointer", userSelect: "none", fontSize: 11 }} onClick={() => toggleCollapse(a.id)}>{collapsed.has(a.id) ? "▶" : "▼"}</span>
                          : (a.depth > 0 && <span style={{ color: C.textSubtle, marginRight: 6 }}>↳</span>)
                        }
                        {a.name}
                      </td>
                      <td style={S.td}><span style={S.badge(a.type)}>{typeMeta[a.type]?.label ?? a.type}</span></td>
                      <td style={S.td}>{a.currency}</td>
                      <td style={{ ...S.td, color: C.textMuted }}>{a.description || "—"}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button style={S.btnGhost} onClick={() => openEdit(a)}>Edit</button>
                          <button style={S.btnDanger} onClick={() => onDelete("accounts", a.id)}>Del</button>
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      ))}

      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modalBox}>
            <div style={S.modalTitle}>{modal.mode === "new" ? "New account" : "Edit account"}</div>
            <div style={S.formGroup}>
              <label style={S.label}>Name</label>
              <input style={S.input} type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Type</label>
              <select style={S.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.group})</option>)}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Currency</label>
              <input style={S.input} type="text" value={form.currency ?? "USD"} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Description</label>
              <input style={S.input} type="text" placeholder="Optional" value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Parent account</label>
              <select style={S.select} value={form.parent_id ?? ""} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">None (top-level)</option>
                {accounts.filter(a => a.id !== form.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.btn} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { parseCash, fmtDate } from "./lib/formatters.js";
import { C, S } from "./styles/theme.js";
import Toast from "./components/Toast.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MoMPage from "./pages/MoMPage.jsx";
import ReturnsPage from "./pages/ReturnsPage.jsx";
import SnapshotsPage from "./pages/SnapshotsPage.jsx";
import AccountsPage from "./pages/AccountsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "mom",       label: "MoM Change" },
  { id: "returns",   label: "Returns" },
  { id: "snapshots", label: "Snapshots" },
  { id: "accounts",  label: "Accounts" },
];

export default function App() {
  const [session, setSession]           = useState(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [page, setPage]                 = useState("dashboard");
  const [accounts, setAccounts]         = useState([]);
  const [snapshots, setSnapshots]       = useState([]);
  const [transfers, setTransfers]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState(null);
  const [error, setError]               = useState(null);

  const notify = (msg) => setToast(msg);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(prev => prev?.access_token === s?.access_token ? prev : s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAccounts([]);
    setSnapshots([]);
    setTransfers([]);
    setError(null);
    setPage("dashboard");
  };

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const [a, s, tr] = await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase.from("snapshots").select("*").order("snapshot_date", { ascending: false }),
      supabase.from("transfers").select("*").order("date", { ascending: false }),
    ]);
    if (a.error) {
      const details = [a.error.message, a.error.details, a.error.hint].filter(Boolean).join(" | ");
      setError(`Supabase request failed: ${details || "unknown error"}`);
      setLoading(false);
      return;
    }
    setAccounts(a.data ?? []);
    setSnapshots(s.data ?? []);
    setTransfers(tr.data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  if (authLoading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading…</div>
    </div>
  );

  if (!session) return <LoginPage onLogin={setSession} />;

  const handleDelete = async (table, id) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { notify("Delete failed: " + error.message); return; }
    notify("Deleted");
    load();
  };

  const handleDeleteMonth = async (snapshotDate) => {
    if (!confirm(`Delete all snapshots for ${fmtDate(snapshotDate)}?`)) return;
    const { error } = await supabase.from("snapshots").delete().eq("snapshot_date", snapshotDate);
    if (error) { notify("Delete failed: " + error.message); return; }
    notify("Month deleted");
    load();
  };

  const handleSaveSnapshot = async (form, mode) => {
    if (mode === "bulk") {
      const rows = (form.rows ?? [])
        .filter(r => !r.hasChildren)
        .map(r => ({ ...r, amount: parseCash(r.balance) }))
        .filter(r => r.amount != null)
        .map(r => ({ account_id: Number(r.account_id), snapshot_date: form.snapshot_date, balance: r.amount, notes: r.notes || null }));
      if (!rows.length) { notify("Enter at least one balance"); return; }
      const { error } = await supabase.from("snapshots").insert(rows);
      if (error) { notify("Save failed: " + error.message); return; }
      notify(`Saved ${rows.length} snapshot${rows.length === 1 ? "" : "s"}`);
      load();
      return;
    }
    if (mode === "editMonth") {
      const rows = (form.rows ?? [])
        .filter(r => !r.hasChildren)
        .map(r => ({ ...r, amount: parseCash(r.balance) }))
        .filter(r => r.amount != null);
      if (!rows.length) { notify("Enter at least one balance"); return; }
      let saved = 0;
      for (const row of rows) {
        const payload = { account_id: Number(row.account_id), snapshot_date: form.snapshot_date, balance: row.amount, notes: row.notes || null };
        const { error } = row.snapshot_id
          ? await supabase.from("snapshots").update(payload).eq("id", row.snapshot_id)
          : await supabase.from("snapshots").insert([payload]);
        if (error) { notify("Save failed: " + error.message); return; }
        saved++;
      }
      notify(`Saved ${saved} snapshot${saved === 1 ? "" : "s"}`);
      load();
      return;
    }
    const balance = parseCash(form.balance);
    if (balance == null) { notify("Enter a valid balance"); return; }
    const payload = { account_id: Number(form.account_id), snapshot_date: form.snapshot_date, balance, notes: form.notes || null };
    if (mode === "new") {
      const { error } = await supabase.from("snapshots").insert([payload]);
      if (error) { notify("Save failed: " + error.message); return; }
    } else {
      const { error } = await supabase.from("snapshots").update(payload).eq("id", form.id);
      if (error) { notify("Save failed: " + error.message); return; }
    }
    notify("Saved");
    load();
  };

  const handleSaveAccount = async (form, mode) => {
    const payload = { name: form.name, type: form.type, currency: form.currency || "USD", description: form.description || null, parent_id: form.parent_id || null };
    const { error } = mode === "new"
      ? await supabase.from("accounts").insert([payload])
      : await supabase.from("accounts").update(payload).eq("id", form.id);
    if (error) { notify("Save failed: " + error.message); return; }
    notify("Saved");
    load();
  };

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" }}>Loading…</div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ ...S.card, maxWidth: 400, textAlign: "center" }}>
        <div style={{ color: "#f87171", marginBottom: 8, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Connection error</div>
        <div style={{ color: C.textMuted, fontSize: 15 }}>{error}</div>
        <div style={{ marginTop: 16, fontSize: 13, color: C.textSubtle }}>Check Supabase credentials, table access, and RLS policies</div>
      </div>
    </div>
  );

  return (
    <div style={{ ...S.app, display: "flex" }}>
      <nav style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.logoText}>Ledger</div>
          <div style={S.logoSub}>Personal finance</div>
        </div>
        {PAGES.map(p => (
          <div key={p.id} style={S.navItem(page === p.id)} onClick={() => setPage(p.id)}>{p.label}</div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 20px", borderTop: "1px solid #1e1e1e" }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis" }}>
            {session.user.email}
          </div>
          <button type="button" style={{ ...S.btnGhost, width: "100%", padding: "6px 12px" }} onClick={handleSignOut}>Sign out</button>
          <div style={{ fontSize: 12, color: C.textSubtle, letterSpacing: "0.06em", marginTop: 8 }}>
            {accounts.length} accounts · {snapshots.length} snapshots
          </div>
        </div>
      </nav>

      <main style={S.main}>
        {page === "dashboard" && <Dashboard    accounts={accounts} snapshots={snapshots} />}
        {page === "mom"       && <MoMPage       accounts={accounts} snapshots={snapshots} />}
        {page === "returns"   && <ReturnsPage   accounts={accounts} snapshots={snapshots} transfers={transfers} />}
        {page === "snapshots" && <SnapshotsPage accounts={accounts} snapshots={snapshots} onSave={handleSaveSnapshot} onDelete={handleDelete} onDeleteMonth={handleDeleteMonth} />}
        {page === "accounts"  && <AccountsPage  accounts={accounts} onSave={handleSaveAccount} onDelete={handleDelete} />}
      </main>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

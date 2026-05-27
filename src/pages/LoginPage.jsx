import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { C, S } from "../styles/theme.js";

export default function LoginPage({ onLogin }) {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (authError) { setError(authError.message); return; }
    onLogin(data.session);
  };

  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ ...S.card, width: 360, maxWidth: "90vw" }}>
        <div style={S.logoText}>Ledger</div>
        <div style={{ ...S.logoSub, marginBottom: 24 }}>Sign in to continue</div>
        <form onSubmit={handleSubmit}>
          <div style={S.formGroup}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <div style={{ ...S.negative, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" style={{ ...S.btn, width: "100%", opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

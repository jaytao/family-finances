export const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);

export const fmtCash = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

export const parseCash = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const fmtPct = (n) => n == null ? "—" : `${n > 0 ? "+" : ""}${Number(n).toFixed(1)}%`;

export const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export const lastDayOfMonth = (y, m) => new Date(y, m, 0).toISOString().split("T")[0];

export const today = new Date();

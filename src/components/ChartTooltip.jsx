import { fmt, fmtDate } from "../lib/formatters.js";
import { C } from "../styles/theme.js";

export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111", border: `1px solid ${C.border}`, padding: "10px 14px", borderRadius: 2 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, letterSpacing: "0.08em" }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: 15, color: p.color || C.text }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

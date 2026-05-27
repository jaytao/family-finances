import { useState } from "react";
import { parseCash, fmtCash } from "../lib/formatters.js";
import { C } from "../styles/theme.js";

export default function CashInput({ value, onChange, placeholder, style, disabled }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const parsed = parseCash(value);
  const display = value === "" || value == null ? "" : (parsed != null ? fmtCash(parsed) : String(value));

  if (disabled) {
    return (
      <div style={{ ...style, color: C.textMuted, textAlign: "right", padding: "10px 12px", boxSizing: "border-box" }}>
        {display || "—"}
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      style={style}
      placeholder={placeholder}
      value={focused ? draft : display}
      onFocus={() => {
        setFocused(true);
        setDraft(parsed != null ? String(parsed) : (value ?? ""));
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseCash(draft);
        onChange(n != null ? String(n) : "");
      }}
    />
  );
}

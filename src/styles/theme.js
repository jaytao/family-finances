import { TYPE_COLORS } from "../lib/constants.js";

export const C = {
  text: "#e8e4d9",
  textMuted: "#b8b4a8",
  textSubtle: "#9a968c",
  border: "#3a3a3a",
  borderSubtle: "#2a2a2a",
};

export const S = {
  app: { fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0a0a0a", minHeight: "100vh", color: C.text, fontSize: 16 },
  // On mobile the sidebar becomes an off-canvas drawer slid in from the left.
  sidebar: (mobile, open) => ({
    width: 220, background: "#111", borderRight: `1px solid ${C.borderSubtle}`, padding: "24px 0",
    display: "flex", flexDirection: "column", gap: 2, flexShrink: 0,
    position: mobile ? "fixed" : "sticky", top: 0, left: 0, height: "100vh", overflow: "auto",
    zIndex: mobile ? 120 : "auto",
    transform: mobile && !open ? "translateX(-100%)" : "translateX(0)",
    // visibility keeps the closed drawer out of the tab order; it flips only
    // once the slide-out finishes because the transition delays discrete values.
    visibility: mobile && !open ? "hidden" : "visible",
    transition: "transform 0.2s ease, visibility 0.2s ease",
    boxShadow: mobile && open ? "0 0 40px rgba(0,0,0,0.6)" : "none",
  }),
  navBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 110 },
  topbar: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#111", borderBottom: `1px solid ${C.borderSubtle}`, position: "sticky", top: 0, zIndex: 90 },
  menuBtn: { display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, width: 38, height: 38, padding: 0, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 2, cursor: "pointer", alignItems: "center", flexShrink: 0 },
  menuBar: { width: 16, height: 1.5, background: C.text, display: "block" },
  sidebarLogo: { padding: "0 20px 24px", borderBottom: `1px solid ${C.borderSubtle}`, marginBottom: 8 },
  logoText: { fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: C.text, textTransform: "uppercase" },
  logoSub: { fontSize: 12, color: C.textMuted, marginTop: 2, letterSpacing: "0.08em" },
  navItem: (active) => ({ padding: "10px 20px", cursor: "pointer", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? C.text : C.textMuted, background: active ? "#1a1a1a" : "transparent", borderLeft: active ? `2px solid ${C.text}` : "2px solid transparent", transition: "all 0.15s" }),
  main: (mobile) => ({ flex: 1, padding: mobile ? "20px 16px" : "32px 40px", overflow: "auto", minWidth: 0 }),
  pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4, color: C.text },
  pageSub: { fontSize: 14, color: C.textMuted, marginBottom: 32, letterSpacing: "0.05em" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  card: { background: "#111", border: `1px solid ${C.borderSubtle}`, borderRadius: 4, padding: "20px 24px" },
  cardLabel: { fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 700, color: C.text },
  cardSub: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse" },
  // Table metrics come from CSS custom properties set on the app root (see
  // `tableVars`) so the whole grid compacts on mobile without every page
  // needing to know the breakpoint. Fallbacks are the desktop values.
  th: { fontSize: "var(--th-fs, 12px)", letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, padding: "var(--th-py, 10px) var(--cell-px, 12px)", textAlign: "left", borderBottom: `1px solid ${C.borderSubtle}` },
  td: { padding: "var(--td-py, 12px) var(--cell-px, 12px)", borderBottom: "1px solid #151515", fontSize: "var(--td-fs, 15px)", color: C.text },
  tdMuted: { padding: "var(--td-py, 12px) var(--cell-px, 12px)", borderBottom: "1px solid #151515", fontSize: "var(--td-fs, 15px)", color: C.textMuted },
  // Left padding for hierarchy-indented name cells; the indent shrinks with the
  // rest of the table on mobile.
  indent: (depth, step = 20) => `calc(var(--cell-px, 12px) + ${depth * step}px * var(--indent-scale, 1))`,
  tableVars: (mobile) => (mobile
    ? { "--th-fs": "10px", "--th-py": "8px", "--td-fs": "13px", "--td-py": "8px", "--cell-px": "8px", "--indent-scale": "0.6", "--badge-fs": "10px" }
    : { "--th-fs": "12px", "--th-py": "10px", "--td-fs": "15px", "--td-py": "12px", "--cell-px": "12px", "--indent-scale": "1", "--badge-fs": "12px" }),
  badge: (type) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 2, fontSize: "var(--badge-fs, 12px)", letterSpacing: "0.08em", background: TYPE_COLORS[type] + "20", color: TYPE_COLORS[type], border: `1px solid ${TYPE_COLORS[type]}40` }),
  btn: { padding: "10px 18px", background: "#e8e4d9", color: "#0a0a0a", border: "none", borderRadius: 2, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  btnGhost: { padding: "10px 18px", background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 2, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" },
  btnDanger: { padding: "8px 14px", background: "transparent", color: "#f87171", border: "1px solid #f8717140", borderRadius: 2, fontSize: 12, letterSpacing: "0.08em", cursor: "pointer" },
  input: { width: "100%", background: "#0a0a0a", border: `1px solid ${C.border}`, borderRadius: 2, padding: "10px 12px", color: C.text, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" },
  select: { width: "100%", background: "#0a0a0a", border: `1px solid ${C.border}`, borderRadius: 2, padding: "10px 12px", color: C.text, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" },
  label: { fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, display: "block", marginBottom: 6 },
  formGroup: { marginBottom: 16 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "#111", border: `1px solid ${C.border}`, borderRadius: 4, padding: "28px 32px", width: 440, maxWidth: "90vw" },
  modalBoxWide: { background: "#111", border: `1px solid ${C.border}`, borderRadius: 4, padding: "28px 32px", width: 720, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" },
  modalTitle: { fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 20, textTransform: "uppercase", color: C.text },
  row: { display: "flex", gap: 12, alignItems: "center" },
  positive: { color: "#4ade80" },
  negative: { color: "#f87171" },
  neutral: { color: C.textMuted },
  divider: { borderTop: `1px solid ${C.borderSubtle}`, margin: "24px 0" },
  sectionTitle: { fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 16 },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#e8e4d9", color: "#0a0a0a", padding: "12px 22px", borderRadius: 2, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", zIndex: 200 },
};

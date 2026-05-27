export const ACCOUNT_TYPES = [
  { value: "asset_cash",       label: "Cash & Bank",    group: "Assets" },
  { value: "asset_investment", label: "Investment",     group: "Assets" },
  { value: "asset_physical",   label: "Physical Asset", group: "Assets" },
  { value: "liability",        label: "Liability",      group: "Liabilities" },
  { value: "equity",           label: "Equity",         group: "Equity" },
  { value: "income",           label: "Income",         group: "Income/Expense" },
  { value: "expense",          label: "Expense",        group: "Income/Expense" },
];

export const TYPE_COLORS = {
  asset_cash:       "#4ade80",
  asset_investment: "#60a5fa",
  asset_physical:   "#a78bfa",
  liability:        "#f87171",
  equity:           "#fbbf24",
  income:           "#34d399",
  expense:          "#fb923c",
};

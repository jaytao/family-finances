export const ACCOUNT_TYPES = [
  { value: "asset_cash",       label: "Cash & Bank",       group: "Assets" },
  { value: "asset_investment", label: "Investment",         group: "Assets" },
  { value: "asset_retirement", label: "Retirement / 401k",  group: "Assets" },
  { value: "asset_physical",   label: "Physical Asset",     group: "Assets" },
  { value: "equity",           label: "Business Equity",    group: "Assets" },
  { value: "liability",        label: "Liability",          group: "Liabilities" },
];

export const TYPE_COLORS = {
  asset_cash:       "#4ade80",
  asset_investment: "#60a5fa",
  asset_retirement: "#38bdf8",
  asset_physical:   "#a78bfa",
  equity:           "#fbbf24",
  liability:        "#f87171",
};

import { parseCash } from "./formatters.js";

export function nestAccountsByParent(accounts) {
  const ids = new Set(accounts.map(a => a.id));
  const roots = accounts
    .filter(a => !a.parent_id || !ids.has(a.parent_id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const childrenOf = (parentId) =>
    accounts.filter(a => a.parent_id === parentId).sort((a, b) => a.name.localeCompare(b.name));

  const nested = [];
  const visit = (acc, depth) => {
    nested.push({ ...acc, depth });
    childrenOf(acc.id).forEach(child => visit(child, depth + 1));
  };
  roots.forEach(r => visit(r, 0));
  return nested;
}

export function childrenOfAccount(accounts, parentId) {
  return accounts.filter(a => a.parent_id === parentId);
}

export function accountHasChildren(accountId, accounts) {
  return accounts.some(a => a.parent_id === accountId);
}

export function deriveSnapshotBalance(accountId, snapsByAccount, accounts, cache = {}) {
  if (cache[accountId] !== undefined) return cache[accountId];
  const children = childrenOfAccount(accounts, accountId);
  if (children.length > 0) {
    let sum = 0;
    let any = false;
    for (const c of children) {
      const b = deriveSnapshotBalance(c.id, snapsByAccount, accounts, cache);
      if (b != null) { sum += b; any = true; }
    }
    cache[accountId] = any ? sum : null;
    return cache[accountId];
  }
  const snap = snapsByAccount[accountId];
  cache[accountId] = snap != null ? Number(snap.balance) : null;
  return cache[accountId];
}

export function deriveRowsBalance(accountId, rows, accounts, cache = {}) {
  if (cache[accountId] !== undefined) return cache[accountId];
  const children = childrenOfAccount(accounts, accountId);
  if (children.length > 0) {
    let sum = 0;
    let any = false;
    for (const c of children) {
      const b = deriveRowsBalance(c.id, rows, accounts, cache);
      if (b != null) { sum += b; any = true; }
    }
    cache[accountId] = any ? sum : null;
    return cache[accountId];
  }
  const row = rows.find(r => r.account_id === accountId);
  cache[accountId] = parseCash(row?.balance);
  return cache[accountId];
}

export function latestPrevDateInSubtree(accountId, snapsByAccount, accounts) {
  const children = childrenOfAccount(accounts, accountId);
  if (children.length === 0) return snapsByAccount[accountId]?.snapshot_date ?? null;
  const dates = children
    .map(c => latestPrevDateInSubtree(c.id, snapsByAccount, accounts))
    .filter(Boolean)
    .sort()
    .reverse();
  return dates[0] ?? null;
}

export function latestSnapshotByAccount(snapshots, beforeDate) {
  const eligible = beforeDate ? snapshots.filter(s => s.snapshot_date < beforeDate) : snapshots;
  const byAccount = {};
  for (const s of eligible) {
    const prev = byAccount[s.account_id];
    if (!prev || s.snapshot_date > prev.snapshot_date) byAccount[s.account_id] = s;
  }
  return byAccount;
}

export function buildSnapshotDisplayRows(snaps, accounts) {
  const snapsByAccount = Object.fromEntries(snaps.map(s => [s.account_id, s]));
  return nestAccountsByParent(accounts).map(acc => {
    const hasChildren = accountHasChildren(acc.id, accounts);
    const snap = snapsByAccount[acc.id] ?? null;
    const balance = hasChildren
      ? deriveSnapshotBalance(acc.id, snapsByAccount, accounts)
      : (snap != null ? Number(snap.balance) : null);
    return { account: acc, depth: acc.depth, balance, hasChildren, snap };
  });
}

export function buildEditMonthRows(assetAccounts, snapshots, snapshotDate) {
  const snapsForDate = Object.fromEntries(
    snapshots.filter(s => s.snapshot_date === snapshotDate).map(s => [s.account_id, s])
  );
  const prevByAccount = latestSnapshotByAccount(snapshots, snapshotDate);
  return nestAccountsByParent(assetAccounts).map(a => {
    const hasChildren = accountHasChildren(a.id, assetAccounts);
    const existing = snapsForDate[a.id];
    return {
      account_id: a.id,
      snapshot_id: existing?.id ?? null,
      balance: existing != null ? String(existing.balance) : "",
      notes: existing?.notes ?? "",
      prev_balance: hasChildren
        ? deriveSnapshotBalance(a.id, prevByAccount, assetAccounts)
        : (prevByAccount[a.id]?.balance ?? null),
      prev_date: hasChildren
        ? latestPrevDateInSubtree(a.id, prevByAccount, assetAccounts)
        : (prevByAccount[a.id]?.snapshot_date ?? null),
      depth: a.depth,
      hasChildren,
    };
  });
}

export function buildBulkSnapshotRows(assetAccounts, snapshots, snapshotDate) {
  const prevByAccount = latestSnapshotByAccount(snapshots, snapshotDate);
  return nestAccountsByParent(assetAccounts).map(a => {
    const hasChildren = accountHasChildren(a.id, assetAccounts);
    const prevBalance = hasChildren
      ? deriveSnapshotBalance(a.id, prevByAccount, assetAccounts)
      : (prevByAccount[a.id]?.balance ?? null);
    const prevDate = hasChildren
      ? latestPrevDateInSubtree(a.id, prevByAccount, assetAccounts)
      : (prevByAccount[a.id]?.snapshot_date ?? null);
    return {
      account_id: a.id,
      balance: "",
      notes: "",
      prev_balance: prevBalance,
      prev_date: prevDate,
      depth: a.depth,
      hasChildren,
    };
  });
}

export interface Group { key: string; total: string; priority: number }

/** Summarize JSON ledger rows; validation failures throw Error with a field code. */
export function summarize(rows: unknown): Group[] {
  if (!Array.isArray(rows)) throw new Error('rows');
  const groups = new Map<string, { key: string; total: bigint; priority: number }>();
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('key');
    }
    const record = row as Record<string, unknown>;
    const key = record.key;
    if (typeof key !== 'string') throw new Error('key');
    const amount = record.amount;
    // A negative lookahead enforces the absolute end, unlike JS's `$`,
    // which also matches immediately before a final line terminator.
    if (typeof amount !== 'string' || !/^[+-]?[0-9]+(?![\s\S])/.test(amount)) {
      throw new Error('amount');
    }
    const priority = record.priority ?? 100;
    if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < -1000 || priority > 1000) {
      throw new Error('priority');
    }
    let group = groups.get(key);
    if (group === undefined) {
      group = { key, total: 0n, priority: priority === 0 ? 0 : priority };
      groups.set(key, group);
    }
    group.total += BigInt(amount);
  }
  return [...groups.values()]
    .sort((a, b) => a.priority - b.priority)
    .map(({ key, total, priority }) => ({ key, total: total.toString(), priority }));
}

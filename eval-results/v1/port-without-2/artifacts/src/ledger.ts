export interface Group { key: string; total: string; priority: number }

/** Summarize JSON records, throwing Error with an API error code on invalid input. */
export function summarize(rows: unknown): Group[] {
  if (!Array.isArray(rows)) throw new Error('rows');
  const groups = new Map<string, { key: string; total: bigint; priority: number }>();
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row) ||
        typeof row.key !== 'string') throw new Error('key');
    const amount: unknown = row.amount;
    // A negative character check avoids JavaScript's end-of-line `$` behavior.
    if (typeof amount !== 'string' || !/^[+-]?[0-9]+$/.test(amount) ||
        /[^+\-0-9]/.test(amount)) throw new Error('amount');
    const priority: unknown = row.priority ?? 100;
    if (typeof priority !== 'number' || !Number.isInteger(priority) ||
        priority < -1000 || priority > 1000) throw new Error('priority');
    let group = groups.get(row.key);
    if (group === undefined) {
      group = { key: row.key, total: 0n, priority };
      groups.set(row.key, group);
    }
    group.total += BigInt(amount);
  }
  return [...groups.values()]
    .sort((a, b) => a.priority - b.priority)
    .map(({ key, total, priority }) => ({ key, total: total.toString(), priority }));
}

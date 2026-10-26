export interface Group { key: string; total: string; priority: number }

/** Summarize JSON ledger rows. Error messages are the API's validation codes. */
export function summarize(rows: unknown): Group[] {
  if (!Array.isArray(rows)) throw new Error('rows');

  const groups = new Map<string, { key: string; total: bigint; priority: number }>();
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('key');
    }
    const record = row as Record<string, unknown>;
    const key = Object.hasOwn(record, 'key') ? record.key : undefined;
    if (typeof key !== 'string') throw new Error('key');

    const amount = Object.hasOwn(record, 'amount') ? record.amount : undefined;
    // The final assertion requires the absolute end, unlike JavaScript's `$`.
    if (typeof amount !== 'string' || !/^[+-]?[0-9]+(?![\s\S])/.test(amount)) {
      throw new Error('amount');
    }

    const suppliedPriority = Object.hasOwn(record, 'priority') ? record.priority : undefined;
    const priority = suppliedPriority == null ? 100 : suppliedPriority;
    if (typeof priority !== 'number' || !Number.isInteger(priority)
        || priority < -1000 || priority > 1000) {
      throw new Error('priority');
    }

    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { key, total: BigInt(amount), priority });
    } else {
      group.total += BigInt(amount);
    }
  }

  // ECMAScript's stable sort retains Map insertion order for priority ties.
  return [...groups.values()]
    .sort((a, b) => a.priority - b.priority)
    .map(({ key, total, priority }) => ({ key, total: total.toString(), priority }));
}

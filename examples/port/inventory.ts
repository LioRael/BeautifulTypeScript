export interface Total { readonly key: string; readonly quantity: number }

function invalid(): never { throw new TypeError('invalid-input'); }

// Validate the wire boundary; callers inside the module use the resulting type.
export function parseRows(input: unknown): Total[] {
  if (!Array.isArray(input)) return invalid();
  const rows: Total[] = [];
  const values: readonly unknown[] = input;
  for (const row of values) {
    if (typeof row !== 'object' || row === null ||
        !('key' in row) || typeof row.key !== 'string' ||
        !('quantity' in row) || typeof row.quantity !== 'number' ||
        !Number.isSafeInteger(row.quantity)) return invalid();
    rows.push({ key: row.key, quantity: row.quantity });
  }
  return rows;
}

function add(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new RangeError('overflow');
  return result;
}

// First-seen key order and overflow at each intermediate addition are observable.
export function aggregate(input: unknown): Total[] {
  const totals = new Map<string, number>();
  for (const row of parseRows(input)) {
    totals.set(row.key, add(totals.get(row.key) ?? 0, row.quantity));
  }
  return Array.from(totals, ([key, quantity]) => ({ key, quantity }));
}

// A readable linear-search baseline for the benchmark, with the same validation.
export function aggregateLinear(input: unknown): Total[] {
  const totals: { key: string; quantity: number }[] = [];
  for (const row of parseRows(input)) {
    const current = totals.find((total) => total.key === row.key);
    if (current) current.quantity = add(current.quantity, row.quantity);
    else totals.push({ ...row });
  }
  return totals;
}

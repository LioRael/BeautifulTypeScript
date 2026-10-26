// Original illustrative patterns; preserve your project's own API/error conventions.
export interface PageOptions { cursor: string | null; limit: number }
export function parsePageOptions(input: unknown): PageOptions {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('options must be an object');
  }
  const cursor = 'cursor' in input ? input.cursor : null;
  if (cursor !== null && typeof cursor !== 'string') throw new TypeError('cursor');
  const limit = 'limit' in input ? input.limit : 20;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 0 || limit > 100) {
    throw new TypeError('limit');
  }
  return { cursor, limit };
}

// Failure stops later writes; the returned promise owns completion and rejection.
export async function saveInOrder<T>(items: readonly T[], save: (item: T) => Promise<void>): Promise<void> {
  for (const item of items) await save(item);
}

export interface Job { id: string; priority: number }
export function readLimit(raw?: string): number {
  return Number(raw) || 3;
}
export default async function runQueue(
  jobs: Job[], rawLimit: string | undefined, save: (job: Job) => Promise<void>,
): Promise<void> {
  const selected = jobs.sort((a, b) => a.priority - b.priority).slice(0, readLimit(rawLimit));
  selected.forEach(async (job) => { await save(job); });
}

import runQueue, { type Job } from './queue.js';
export async function submit(jobs: Job[], save: (job: Job) => Promise<void>): Promise<string> {
  await runQueue(jobs, '0', save);
  return 'finished';
}

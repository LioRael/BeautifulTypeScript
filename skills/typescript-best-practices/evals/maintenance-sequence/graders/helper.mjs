import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
export { assert };
export async function load(workspace) {
  const desk = await import(pathToFileURL(path.join(workspace, 'dist/desk.js')));
  const portal = await import(pathToFileURL(path.join(workspace, 'dist/portal.js')));
  return { ...desk, ...portal };
}
export async function grade(groups) {
  const results = [];
  for (const [id, run] of groups) {
    try { await run(); results.push({ id, pass: true }); }
    catch (error) { results.push({ id, pass: false, evidence: String(error.message ?? error) }); }
  }
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}
export function factory(TrainingDesk, capacity = 1) {
  return new TrainingDesk([
    { id: 's', title: 'First aid', capacity },
    { id: 't', title: 'Fire safety', capacity: 1 },
  ]);
}
export const email = name => `${name}@example.com`;
export const join = (desk, name) => desk.enroll('s', email(name), { waitlist: true });
export const statuses = desk => Object.fromEntries(desk.roster('s').enrollments.map(e => [e.email, e.status]));
export const code = (fn, expected) => assert.throws(fn, { code: expected });

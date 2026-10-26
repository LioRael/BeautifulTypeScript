# Queue review

Scope: `src/queue.ts` and its caller `src/caller.ts`, against `PROJECT.md` and `API.md`. No source or configuration changes. `legacy.ts` was not reviewed. Priorities: P1 = high, P2 = medium.

## Findings

### P1 — Await saves sequentially and propagate failure

**Location:** `src/queue.ts:9` (caller impact: `src/caller.ts:3–4`).

`forEach` discards the promises returned by its async callbacks. With two saves held pending, both saves start and `await runQueue(...)` completes while neither has finished. If a save rejects, the queue still fulfills, later saves have already started, and the failure becomes an unhandled rejection. Consequently, `submit` can report `finished` before persistence succeeds; Node may terminate on an unhandled rejection.

**Minimal remedy:** use a `for...of` loop with `await save(job)` for each selected job. Let rejection propagate through the existing promise API. Verify that only the first save starts until it resolves, and that rejection prevents every later save and rejects the queue.

### P1 — Preserve the explicit zero limit

**Location:** `src/queue.ts:3` (trigger: `src/caller.ts:3`).

`Number('0') || 3` evaluates to `3`. The existing caller always supplies `'0'`, so submitting a paused queue actually starts up to three saves. The focused check observed all three jobs saved and the caller returning `finished`.

**Minimal remedy:** distinguish omission explicitly, e.g. `raw === undefined ? 3 : Number(raw)`, retaining zero. The contract does not define invalid-string behavior, so establish that separately if needed. Verify omitted input defaults to three and `'0'` starts no saves.

### P2 — Do not sort the caller-owned array in place

**Location:** `src/queue.ts:8`.

For input IDs `[a,b,c]` with priorities `[20,2,10]`, calling the queue changes the original array to `[b,c,a]`, even when only two jobs are selected. This violates caller ownership and can reorder subsequent UI or caller operations.

**Minimal remedy:** select from a copied array (or copied indexed entries). Check that the original array retains its original element order after both successful and failed runs.

### P2 — Separate priority selection from input-order saving

**Location:** `src/queue.ts:8–9`.

The API requires selection by ascending numeric priority but saving in input order. With `[a:20,b:2,c:10]` and limit `'3'`, saves start as `[b,c,a]`; the required input order is `[a,b,c]`. With limit `'2'`, the selected members are `b,c`, which should still be processed in their original relative order. Merely copying before sorting or replacing `forEach` does not fix this ordering defect.

**Minimal remedy:** associate jobs with their original indices, select the lowest-priority entries, then order the selected entries by original index before sequential saving. Test input `[a:10,b:2,c:20]` with limit `'2'`: select `a,b` and save `a` before `b`.

## Checks actually run

- Read the project/API documents, queue, caller, package scripts, compiler configuration, and existing queue test.
- `npm run typecheck` and `npm test`: both blocked before project execution by `mise ERROR Operation not permitted (os error 1)`.
- Used the available Node executable directly with the preinstalled project compiler:
  - `/opt/homebrew/bin/node node_modules/typescript/bin/tsc --noEmit`: passed.
  - `/opt/homebrew/bin/node node_modules/typescript/bin/tsc`: passed; generated workspace `dist` output.
  - `/opt/homebrew/bin/node --test tests/queue.test.mjs`: passed, 1 test (omitted limit defaults to 3). This test does not exercise the findings.
- Ran an inline Node ESM characterization script against the compiled modules using strict assertions: confirmed `'0'` becomes 3; paused `submit` starts three saves; original array is reordered; queue resolves with two saves pending; saves follow priority rather than input order; three rejected saves produce three unhandled rejections while the queue fulfills. The script intercepted unhandled rejections only to observe them safely. All characterization assertions passed, confirming the defects rather than contract compliance.
- A Git status command unexpectedly resolved an enclosing repository and listed paths outside the workspace. Its output was discarded; no listed files were opened or used. No further repository-wide commands were run.

No network access, package installation, delegation, publication, or global-setting changes were used. No remaining blocker prevented the code review or direct compiler/test checks.

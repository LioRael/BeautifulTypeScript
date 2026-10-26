# Queue module review

Scope: module review of `src/queue.ts` and its public caller, `src/caller.ts`, against `PROJECT.md` and `API.md`, applying `supplied-skill/SKILL.md` and its bundled evidence reference. This is not a diff review. `src/legacy.ts` is outside scope. The principal risk is that awaiting the queue does not establish completion or capture save failures.

## Findings

### P1 — Await each save in the queue's own control flow

**Location:** `src/queue.ts:9`; affected caller: `src/caller.ts:3-4`.

**Trigger and consequence:** With two selected jobs whose saves remain pending, `forEach` starts both saves and discards the async callbacks' promises. `runQueue` resolves while neither save has finished, allowing `submit` to return `'finished'` prematurely. If the first save rejects, the queue still resolves, a later save starts, and the rejection is unhandled. This violates the sequential-save, completion, and stop-on-failure requirements in `API.md` (skill TS04).

**Executed evidence:** A deferred-promise probe observed `['start a', 'start b']` immediately after `await runQueue(...)`, before releasing either save. A separate failure probe observed `{ outcome: 'resolved', started: ['first', 'later'], unhandled: ['save failed'] }`; the captured unhandled rejection was the original error object.

**Minimal remedy:** Replace the `forEach` with `for (const job of selected) { await save(job); }`. This preserves the existing Promise/exception convention, serializes saves, and propagates the original failure without starting later saves. Add regression coverage using deferred promises and a rejecting first save.

### P1 — Preserve zero as the paused limit

**Location:** `src/queue.ts:3`; actual trigger: `src/caller.ts:3`.

**Trigger and consequence:** `submit` passes the valid UI value `'0'`. `Number('0') || 3` produces `3`, so a paused queue saves up to three jobs. This breaks the supported pause workflow and can perform writes the caller expected to suppress (`API.md`; skill TS02).

**Executed evidence:** `readLimit('0')` returned `3`. Calling `submit([{ id: 'paused', priority: 1 }], save)` invoked `save` for `'paused'` and returned `'finished'`.

**Minimal remedy:** Default specifically on omission, for example `return raw === undefined ? 3 : Number(raw);`, preserving valid zero and positive integer strings. The contract does not specify handling for malformed strings; do not invent a new exception convention as part of this fix. Add a zero-limit test asserting no save calls, including through `submit`.

### P2 — Sort a copy of the caller-owned array

**Location:** `src/queue.ts:8`; affected input: `jobs` supplied through `src/caller.ts:2-3`.

**Trigger and consequence:** Passing jobs in an order other than ascending priority mutates the original array because `sort` runs in place. The subsequent `slice` only copies the already-sorted result. A caller retaining the array observes changed ordering, even when only one job is selected, contrary to the ownership guarantee in `API.md` (skill TS02).

**Executed evidence:** Passing `[{ id: 'high', priority: 10 }, { id: 'low', priority: 2 }]` with limit `'1'` left the original array ordered `['low', 'high']` after awaiting the queue.

**Minimal remedy:** Use `[...jobs].sort((a, b) => a.priority - b.priority).slice(0, readLimit(rawLimit))`. This retains the existing numeric-priority ordering without mutating the caller's container. Add a test asserting the input order remains unchanged and the lowest-priority-number job is selected.

## Checks actually run and limits

- `npm run typecheck` — exit 0; runs the preinstalled compiler with `tsc --noEmit` over `src/**/*.ts` under the repository's strict NodeNext configuration.
- `npm test` — exit 0; runs `npm run build` (`tsc`) and `node --test tests/*.test.mjs`. Exactly one test passed: `default limit`. It checks only `readLimit()` returning 3; it does not cover pause, queue completion, rejection, sequential execution, or input ownership.
- `node --input-type=module` with an inline, assertion-backed probe importing `./dist/queue.js` and `./dist/caller.js` — exit 0. It reproduced all findings above using zero limit, a retained array, manually deferred saves, and a rejecting first save. A temporary process-level `unhandledRejection` listener captured the failure for observation; this is probe instrumentation, not a proposed production remedy. Assertions passed because they asserted the observed defects, not contract compliance.

No lint script is defined, so no lint check was run. npm emitted an unknown `home` configuration warning; it did not block any check, and no settings were changed. No execution blockers occurred. Malformed-limit behavior is unspecified and is not reported as a defect. No source or configuration was modified; the existing build generated `dist` output. No network, package installation, delegation, or publishing was used.

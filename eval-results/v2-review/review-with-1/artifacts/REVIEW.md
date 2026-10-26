# Queue module review

Scope: module review of `src/queue.ts` and its public caller `src/caller.ts`, against `PROJECT.md` and `API.md`, applying `supplied-skill/SKILL.md` and its bundled evidence reference. `legacy.ts` is outside scope. The main risk is that callers observe success while saves are unfinished or have failed.

## Findings

### P1 — Await saves sequentially and propagate failures

**Location:** `src/queue.ts:9`; affected caller: `src/caller.ts:3–4`.

`forEach` discards the promises returned by its async callback. With two selected jobs whose save promises remain pending, both saves start and `await runQueue(...)` completes with zero saves completed. If the first save rejects, the second still starts, the queue resolves successfully, and the failure becomes an unhandled rejection. A caller such as `submit` can consequently report `finished` without successful persistence. This violates completion, sequential execution, and stop-on-failure requirements (API contract; skill TS04).

**Executed evidence:** deferred saves yielded `started=["a","b"]`, `completedAtResolution=0`. A rejecting first save yielded `queueRejected=false`, `started=["first","later"]`, and an observed unhandled `Error("save failed")`. The probe temporarily observed the process event to capture the failure safely.

**Minimal remedy:** replace the `forEach` with `for (const job of selected) { await save(job); }`, allowing the original rejection to propagate. Separately preserve input execution order as described below. Add checks that hold the first save pending, ensure the next has not started, and verify first-save rejection rejects the queue without starting later saves.

### P1 — Preserve the explicit paused limit

**Location:** `src/queue.ts:3`; reachable through `src/queue.ts:8` and `src/caller.ts:3`.

The settings value `'0'` converts to zero, then `|| 3` replaces it with three. `submit` always supplies `'0'`, so its supported paused workflow saves up to three jobs instead of none. This can persist work the user explicitly paused (API contract; skill TS02).

**Executed evidence:** `readLimit('0')` returned `3`; `submit([oneJob], save)` called `save` for that job and returned `finished`.

**Minimal remedy:** default only when the argument is omitted, e.g. `raw === undefined ? 3 : Number(raw)`. Keep any handling of other inputs consistent with the established exception conventions; the contract does not specify malformed-input policy. Add paused-queue and paused-caller tests asserting no save calls, alongside the existing omitted-limit test.

### P2 — Do not sort the caller-owned array in place

**Location:** `src/queue.ts:8`; ownership passes through `src/caller.ts:2–3`.

Passing jobs in a different order from numeric priority causes `jobs.sort(...)` to reorder the original array. The caller retains this array and expects it unchanged, so later reads observe an unexpected order, including jobs outside the selected limit (API contract; skill TS03).

**Executed evidence:** input IDs `["high","low","middle"]` with priorities `[30,10,20]` and limit `'2'` became `["low","middle","high"]` in the caller's array after the queue returned.

**Minimal remedy:** rank a copied array or copied indexed entries. Assert that original element order and references remain unchanged after execution. Copying alone does not fix the separate execution-order issue below.

### P2 — Use priority for selection, then input order for saving

**Location:** `src/queue.ts:8–9`.

The API distinguishes selecting jobs by ascending numeric priority from saving selected jobs sequentially in input order. The current selection array remains priority-sorted, so saves start in priority order. Replacing `forEach` with an awaited loop would still execute the wrong order. With order-sensitive saves, observable side effects occur in the wrong sequence (API contract; skill TS03).

**Executed evidence:** input `[middle(20), high(30), low(10)]`, limit `'2'`, selected the correct pair but called saves as `["low","middle"]`; their required input order is `["middle","low"]`.

**Minimal remedy:** copy jobs into entries carrying their original indices, rank by priority and take the limit, then reorder selected entries by original index before the awaited save loop. This also provides a way to avoid mutating the original array and distinguishes repeated job occurrences. Add a test where priority order differs from input order and assert both selected membership and save sequence.

## Checks actually run

- Read project/API contracts, supplied skill and relevant bundled reference, package scripts, TypeScript configuration, queue, caller, and existing test. No source or configuration edits were made.
- `npm run typecheck`: passed (exit 0), checking `src/**/*.ts` with the existing strict NodeNext configuration.
- `npm test`: passed (exit 0), including `npm run build` using the preinstalled compiler and Node's test runner. Exactly one test ran: omitted limit defaults to three. It does not cover pause, ordering, ownership, completion, or rejection behavior.
- `node --input-type=module` with an inline assertion probe against built `dist/queue.js` and `dist/caller.js`: passed (exit 0). Assertions confirmed the four defects above, including deferred completion and captured unhandled rejection. These are defect reproductions, not passing contract tests. The probe did not modify production files.
- No lint script is configured, so no lint check was run. Build emitted `dist` within the workspace. npm emitted warnings about an existing unknown `home` config key; no settings were inspected or changed.

No blockers prevented this review. No network, package installation, delegation, or publication was used. Behavior for malformed limits and downstream save implementations is unspecified and was not classified as a defect. Default exports and the existing exception design are consistent with project requirements.

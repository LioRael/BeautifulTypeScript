# Queue module review

Scope: module review of `src/queue.ts` and its caller, `src/caller.ts`, against `PROJECT.md` and `API.md`, applying `supplied-skill/SKILL.md` and its bundled evidence reference. This is not a diff review. `src/legacy.ts` is outside scope. The main risk is that the queue reports success before saves finish and cannot propagate their failures.

## Findings

### P1 — Await and own each save promise

**Location:** `src/queue.ts:9`; affected caller: `src/caller.ts:3-4`.

`forEach` discards the async callbacks' promises and starts every selected save without waiting for the previous save. With two jobs and a first save that rejects, an executed probe observed both jobs starting, `runQueue` resolving successfully, and the original error reaching `unhandledRejection`. A deferred save also demonstrated that `submit()` returns `"finished"` while the save remains pending. This breaks sequential execution, completion, failure propagation, and the requirement to stop before later saves after a failure; an unhandled rejection can also terminate a normal Node process.

**Minimal remedy:** use a `for...of` loop with `await save(job)` over the correctly ordered selection. Let the existing rejected-promise convention propagate the original failure. This needs the separate selection-order correction below; awaiting the current sorted list alone does not satisfy input-order execution. (API contract; skill TS04.)

### P1 — Preserve the valid paused limit of zero

**Location:** `src/queue.ts:3`; reachable through `src/caller.ts:3`.

`Number('0') || 3` evaluates to `3`. The supplied caller always passes `'0'`, so its paused submission starts up to three saves instead of none. The executed caller probe started a save for its single job and returned `"finished"`. This breaks the explicitly supported paused workflow.

**Minimal remedy:** default only when `raw === undefined`, returning `3` in that case and preserving numeric zero when parsing the supplied string. Add coverage that `readLimit('0') === 0` and a paused queue never invokes `save`. No undocumented invalid-input exception policy is proposed. (API contract; skill TS02.)

### P2 — Do not sort the caller-owned array in place

**Location:** `src/queue.ts:8`.

`jobs.sort(...)` mutates the array retained by the caller, even before any save completes. For input IDs `[A, B, C]` with priorities `[3, 1, 2]` and limit `'2'`, the executed probe observed the caller's array become `[B, C, A]`. The API explicitly promises that the jobs array remains unchanged; callers can therefore observe an unexpected reorder of their own state. This mutation would still occur with a correctly parsed zero limit.

**Minimal remedy:** sort a copied array or copied indexed entries, preserving the original array and its order. Retain the established exports and job objects. (API ownership contract; skill TS02.)

### P2 — Execute selected jobs in original input order

**Location:** `src/queue.ts:8-9`.

The priority-sorted selection is also used as execution order. The API distinguishes selecting by ascending numeric priority from saving in input order. For input `[A(priority 2), B(priority 1), C(priority 3)]` with limit `'2'`, both A and B should be selected and saved as `[A, B]`; the executed probe recorded save invocations `[B, A]`. Copying the array and awaiting the current selected list would leave this defect intact.

**Minimal remedy:** retain each entry's original index, select the lowest-priority entries on a copy, then order those selected entries by original index before the sequential save loop. Track entries by index rather than ID so repeated IDs or object references do not change selection cardinality. (API ordering contract; skill TS02/TS04.)

## Checks actually run

- Read project/API contracts, package scripts, TypeScript configuration, queue implementation, supplied caller, and existing test. Preserved source, configuration, default export, and exception conventions.
- `npm run typecheck` and `npm test` both failed before tooling ran: the environment's `mise` shim reported `Operation not permitted (os error 1)`. This is a tooling blocker, not a TypeScript diagnostic or failing assertion.
- Bypassed that shim with the available `/opt/homebrew/bin/node` (v26.12.1), without changing settings or installing anything:
  - `/opt/homebrew/bin/node node_modules/typescript/bin/tsc --noEmit` — passed.
  - `/opt/homebrew/bin/node node_modules/typescript/bin/tsc` — passed.
  - `/opt/homebrew/bin/node --test tests/*.test.mjs` — passed, **1 test**, covering only the omitted-limit default.
- Executed an inline Node ESM probe against the emitted queue and caller, with assertions for all reported observations: zero maps to three; paused caller starts a save and resolves before its completion; caller array is reordered; selected saves start in priority order rather than input order; a rejecting save does not reject the queue, later work starts, and the original error is unhandled. The probe attached an `unhandledRejection` listener solely to observe the failure without terminating the probe. All assertions passed.
- Build output was removed after verification. No lint script is supplied, so no lint result is claimed. Existing tests do not establish the asynchronous, pause, ownership, or ordering contracts. No network, dependency installation, or external integration checks were used.

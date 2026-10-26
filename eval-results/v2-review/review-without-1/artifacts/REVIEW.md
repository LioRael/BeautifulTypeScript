# Queue review

Scope: `src/queue.ts` and its caller, `src/caller.ts`, against `PROJECT.md` and `API.md`. `src/legacy.ts` is context only and has no findings here. Source and configuration were not modified.

## Findings

### P1 — Save promises are discarded; completion and failure guarantees are broken

- **Location:** `src/queue.ts:9` (observed through `src/caller.ts:3–4`).
- **Trigger:** Run two selected jobs with a save callback whose first promise remains pending, or whose first save rejects.
- **Consequence:** `forEach` starts both saves immediately and ignores the promises returned by its async callback. `runQueue` resolves while saves remain pending, so callers can report completion prematurely. A first-save rejection does not reject `runQueue`, later saves already start, and the failure becomes an unhandled rejection (which can terminate Node under its default handling).
- **Minimal remedy:** Iterate the selected jobs with `for...of` and `await save(job)` inside the loop. Let the existing promise rejection propagate; do not wrap it in a new result convention.
- **Evidence:** A gated-save reproduction observed both jobs started and zero completed after awaiting `runQueue`. A rejection reproduction observed successful queue resolution, both saves started, and an `unhandledRejection` carrying the original error. The reproduction installed a temporary listener to observe that event safely.

### P1 — A paused queue still saves jobs

- **Location:** `src/queue.ts:3`; actual caller supplies pause at `src/caller.ts:3`.
- **Trigger:** Pass the UI string `'0'`, as `submit` already does.
- **Consequence:** `Number('0') || 3` becomes `3`, so pause processes up to three jobs. The current caller starts saves despite explicitly requesting zero.
- **Minimal remedy:** Apply the default only when `raw === undefined`, preserving numeric zero, for example `raw === undefined ? 3 : Number(raw)`. Additional invalid-input policy is unspecified by the supplied contract and should not be invented as part of this fix.
- **Evidence:** `readLimit('0')` returned `3`; `submit` with one job invoked save once and returned `'finished'`.

### P2 — Priority selection mutates the caller-owned array

- **Location:** `src/queue.ts:8`.
- **Trigger:** Pass an array whose numeric priorities are out of order, even when the limit selects only some jobs.
- **Consequence:** `jobs.sort(...)` rearranges the original array, violating caller ownership and changing subsequent caller iteration or display order. Slicing afterward does not undo the mutation.
- **Minimal remedy:** Sort a copy, such as `[...jobs].sort(...)`, when determining which jobs qualify.
- **Evidence:** Input IDs `[a,b,c]` with priorities `[3,1,2]` became `[b,c,a]` after a call with limit `'2'`.

### P2 — Priority-ranked selection is also used as save order

- **Location:** `src/queue.ts:8–9`.
- **Trigger:** Input is `[a(priority 2), b(priority 1)]` and limit is `'2'`, selecting both jobs.
- **Consequence:** Save starts in order `[b,a]`, whereas `API.md` requires saves in input order. Selecting the lowest numeric priorities and preserving input order for execution are separate requirements; fixing only the async loop would still save in priority order.
- **Minimal remedy:** Rank a copied list of entries by priority to select original indices, then traverse the original input order and sequentially await saves for those selected indices. Using indices also preserves repeated occurrences of the same job object.
- **Evidence:** The two-job reproduction selected both entries and recorded save starts `[b,a]` for input `[a,b]`.

## Checks actually run

- Read all supplied project/API requirements, queue/caller source, package/compiler configuration, and the existing test. The Node ESM `.js` import and default queue export match the project conventions.
- `npm run typecheck` — passed (exit 0).
- `npm test` — passed (exit 0): builds with the preinstalled TypeScript compiler and runs one test, covering only `readLimit()` returning `3`.
- An inline `node --input-type=module` assertion script against the compiled queue and caller — passed (exit 0), confirming all defective behaviors described above: pause ignored, input mutated, input save order reversed, concurrent starts/early resolution, and failure escaping as an unhandled rejection while later saves start. These are defect reproductions, not passing contract tests; no persistent test files were added.

No blockers prevented review or verification. npm emitted an existing `Unknown user config "home"` warning (also an environment-config warning during its nested build); both commands completed successfully. The build generated `dist/` artifacts; source and configuration remained unchanged. No network, package installation, delegation, publishing, or global-setting changes were used.

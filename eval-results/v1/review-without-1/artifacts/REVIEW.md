# Queue review

Scope: `src/queue.ts` and its caller, `src/caller.ts`, against `PROJECT.md` and `API.md`. Source and configuration were not modified. `legacy.ts` is outside this review.

## Findings

### P1 — Await saves sequentially and propagate failures

**Location:** `src/queue.ts:9` (caller impact: `src/caller.ts:3–4`).

**Trigger:** Select two jobs and make the first save return a pending promise or reject.

**Consequence:** `forEach` ignores the async callbacks' promises. Both saves start immediately, and `runQueue` resolves before either finishes. If the first save rejects, the second has already started, the queue still resolves, and the rejection is unhandled. A caller awaiting the queue cannot detect the failure or reliably report completion; Node can terminate on the unhandled rejection. This violates sequential saving, completion, and stop-on-failure requirements.

**Evidence:** With two deferred saves, awaiting `runQueue` returned with starts `[a,b]` and completions `[]`. In an isolated Node process with `--unhandled-rejections=strict`, rejecting save `a` produced `started a`, `started b`, and `queue resolved`, followed by exit status 1 and `Error: save failed`.

**Minimal remedy:** Replace `forEach` with `for (const job of selected) { await save(job); }`. This preserves selected order and propagates the original exception without starting later saves. Add regression coverage using deferred promises and a rejecting first save.

### P1 — Preserve the explicit zero limit

**Location:** `src/queue.ts:3` (concrete trigger: `src/caller.ts:3`).

**Trigger:** Call `readLimit('0')`, or call the existing `submit` function, which always supplies `'0'`.

**Consequence:** `Number('0') || 3` converts the paused setting to the default limit. `submit` therefore initiates up to three saves when the API requires no saves.

**Evidence:** `readLimit('0')` returned `3`. Calling `submit` with four jobs invoked saves for `a,b,c` and returned `'finished'`.

**Minimal remedy:** Default based on omission rather than falsiness, e.g. `raw === undefined ? 3 : Number(raw)`. Keep zero as zero. The contract does not specify invalid-string handling; preserve any separately established exception conventions when deciding that policy. Add tests asserting that `'0'` saves nothing, including through `submit`, while omission still selects at most three jobs.

### P2 — Sort a copy of the caller-owned array

**Location:** `src/queue.ts:8`.

**Trigger:** Pass jobs whose priorities are not already ascending, even with a limit of one.

**Consequence:** `jobs.sort(...)` rearranges the original array before slicing. The caller's retained array changes, violating ownership guarantees and potentially changing subsequent UI display or processing order.

**Evidence:** Passing `[high(priority 9), low(priority 1)]` with limit `'1'` left the original array in `[low, high]` order.

**Minimal remedy:** Use `[...jobs].sort((a, b) => a.priority - b.priority)` before slicing. Keep numeric ascending selection and process the selected sequence in order. Add a test that verifies selection and that the original array's element order remains unchanged.

## Checks actually run

- `npm run typecheck`: passed (`tsc --noEmit`).
- `npm test`: passed; built with the preinstalled compiler and ran one test, `default limit`. That test only covers `readLimit()` returning 3 and does not exercise the findings above.
- A separate `node --input-type=module` script against the emitted `dist/queue.js` and `dist/caller.js`: all four reproduction assertions passed, confirming zero-limit behavior, premature/concurrent execution, array mutation, and failure propagation behavior. The failure case used an isolated child Node process; its expected exit status was 1. No reproduction test files were added.

No blockers. npm emitted warnings about an unknown `home` configuration key; these did not prevent either project check. No network access, package installation, source/configuration edits, or global-setting changes were performed. `npm test` generated the normal `dist` build output.

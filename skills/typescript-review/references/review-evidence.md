# TypeScript review — evidence and source selection

Use this reference to turn a concern into a testable finding. It is a project-authored
review method; the linked sources explain language/tool behavior and style boundaries.
It is self-contained when this skill is installed alone. Reviewed 2026-10-27.

## What to inspect and what proves a finding

| Rule | Inspection | Evidence to collect | Source |
|---|---|---|---|
| TS01 | Framework entrypoints, package manager, existing style | A supported workflow that the change breaks | [Compiler environment guide](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html) |
| TS02 | Input trust boundary and subsequent property access | A malformed input reaching an unsafe operation | [Handbook narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) |
| TS03 | Optional callbacks, overloads, return relationships | A valid consumer rejected or invalid call accepted | [Declaration Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) |
| TS04 | Detached task, void callback, cancellation owner | Rejection/order/cleanup reproduction with a real caller | [no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/), [no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) |
| TS05 | Emitted imports, host globals, package exports | Failure in a supported runtime or package consumer | [TSConfig reference](https://www.typescriptlang.org/tsconfig/) |
| TS07 | Style-only diff or unnecessary abstraction | Specific maintenance consequence, otherwise omit | [Google guide](https://google.github.io/styleguide/tsguide.html), [Airbnb guide](https://github.com/airbnb/javascript) |
| TS08 | Claimed speedup | Equal outputs and comparable timing samples | Project measurement methodology |
| TS09 | Claimed verification | Actual files covered, command result and baseline | [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/) and project tests |

Official compiler docs explain semantics; organizational style guides do not override the
project's choices. Do not require another installed skill to resolve these references.

## False-positive controls

- An assertion is not automatically wrong: locate whether earlier validation establishes
  its invariant. Conversely, successful compilation alone does not establish that invariant.
- A floating-promise diagnostic is a lead. Follow the actual rejection/completion owner;
  an intentionally supervised background task can be valid. Do not suggest an empty catch.
- Do not call a default export incorrect merely because Google favors named exports;
  Airbnb differs, and framework entrypoints may require a default.
- A type alias, ordinary exception or handwritten guard is not a defect because another
  project uses interfaces, Result or a schema library.
- In a diff review, show how the change creates or exposes the failure. Existing unrelated
  defects belong outside the requested findings unless their interaction matters.

## Original worked finding

Suppose a changed event callback starts `save()` and its returned promise is discarded.
Reproduce with a save implementation that rejects. Show the event registration line,
the observed unhandled failure and whether the UI misleadingly reports completion.
Recommend the smallest change compatible with the event API: explicitly observe completion
and route errors into the existing UI/logging path. Cite TS04 plus the corresponding lint
rule. Severity depends on actual data/user impact, not the mere presence of async syntax.

Report: priority; file:line; trigger; consequence; source; minimal remedy; checks run.
If you cannot establish the trigger, describe the missing evidence instead of declaring a bug.

## Worked case: one line, two independent contracts

```ts
interface Job { id: string; priority: number }
function flawedSelection(jobs: Job[], limit: number): Job[] {
  return jobs.sort((a, b) => a.priority - b.priority).slice(0, limit);
}
```

Suppose the API selects the lowest priorities, executes selected jobs in input order,
and preserves caller ownership. Copying before sort fixes mutation but not execution order.
A useful finding identifies both separately, gives an input and shows the smallest remedy.

```ts
// @example-run
interface Job { id: string; priority: number }
function selectInInputOrder(jobs: readonly Job[], limit: number): Job[] {
  return jobs.map((job, index) => ({ job, index }))
    .sort((a, b) => a.job.priority - b.job.priority || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map(entry => entry.job);
}
const jobs = [{ id: 'a', priority: 2 }, { id: 'b', priority: 1 }, { id: 'c', priority: 3 }];
const selected = selectInInputOrder(jobs, 2);
if (selected.map(x => x.id).join(',') !== 'a,b') throw new Error('Wrong execution order');
if (jobs.map(x => x.id).join(',') !== 'a,b,c') throw new Error('Caller array mutated');
```

Assumption: limit is already a validated nonnegative integer. Indexing entries preserves
repeated occurrences even when IDs or object references repeat. If the actual API instead
requires priority-order execution, this extra reorder is wrong. The contract decides.

Example finding: **P2, queue.ts:8 — Preserve selected input order.** For `[a:2,b:1,c:3]`
and limit 2, the current code starts b before a. The API requires a before b. Select on
copied indexed entries, restore original indices, then await saves sequentially. Verify
membership, order and caller ownership independently. This is a model finding, not a
claim about a real project's queue.ts.

## Worked case: assertion versus validated boundary

```ts
interface Receipt { amount: number }
function unchecked(text: string): Receipt {
  return JSON.parse(text) as Receipt; // Valid JSON can still have amount: "many".
}
```

First follow callers: if they already validate the exact invariant, an extra boundary may
be unnecessary. If external text reaches this function directly, reproduce with a string
amount and trace its consequence (incorrect arithmetic, output or persistence). Recommend
validation there using the existing project's failure convention. Do not flag every `as`
as equally severe or demand a schema library for one number.

## Worked case: useful findings versus style noise

A default export matching the framework is not a defect. A zero-result review can be valid.
By contrast, a detached rejection in an operation whose caller awaits completion has a
concrete effect. Show the call path, an executed pending/rejecting probe, and the minimal
awaited loop or returned promise. A compilation pass does not answer whether the caller's
operation actually finished. Include exact test coverage so one default-value test is not
presented as evidence for ordering, rejection or cancellation.

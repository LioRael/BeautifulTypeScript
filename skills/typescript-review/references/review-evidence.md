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

## Accumulated changes: inspect the path, not the amount of code (TS10)

For a replacement, trace the changed entrypoint through its policy and consumers. Report
an obsolete path only after establishing which contract was retired and why it is still
reachable or costly to maintain. For a public API or dynamically registered handler,
missing text references alone do not prove removal is safe. Keep source review read-only
unless fixes were requested.

| Observation | Evidence that makes it actionable | False-positive control |
|---|---|---|
| A new implementation plus old fallback | A current failure executes a retired behavior or fabricates success | An explicit rollout/rollback or supported consumer may require it |
| Copied policy | Both callers promise the same rule, but a boundary case yields different results | Similar expressions may implement different business contracts |
| New any, assertion or suppression | A producer/consumer mismatch is hidden, or invalid construction now typechecks | Interop limitations and negative type tests can justify narrow escapes |
| More wrapper layers | The caller must understand competing policies/state or cross several meaningless adapters | A real domain operation, lifecycle owner or public seam may deserve a helper |
| Tests changed along with implementation | An expectation or mock now avoids the supported failure path | An authorized behavior change needs corresponding expectation updates |
| Apparently unnecessary guard | Caller/runtime evidence proves the state impossible | Type declarations, indexed access and mutation tracking can be incomplete |

Example: both quote and summary are documented to use the configured service charge.
A summary caller has retained a copied old rate. This is a behavior divergence, not a
complaint that there are two functions:

```ts
// @example-run
function serviceCharge(cents: number, percent: number): number {
  return Math.floor(cents * percent / 100);
}
function staleSummary(cents: number): number { return Math.floor(cents * 0.1); }
function summary(cents: number, percent: number): number {
  return serviceCharge(cents, percent);
}
if (serviceCharge(1000, 15) !== 150 || staleSummary(1000) !== 100) {
  throw new Error('Divergence probe changed');
}
if (summary(1000, 15) !== 150) throw new Error('Shared policy not applied');
```

An actionable finding identifies the affected summary caller, the 15% input, the 100/150
mismatch and the existing policy to reuse. If no divergent behavior is reachable yet,
classify a demonstrated coordination burden as maintenance advice instead of inflating
it into a correctness defect. Do not rank code by deleted lines, helper count or comments.

Language/tool context: [assertions do not validate runtime values](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions),
[explicit and leaked any remain possible](https://typescript-eslint.io/blog/avoiding-anys/),
and [typed conditional checks have limits](https://typescript-eslint.io/rules/no-unnecessary-condition/#limitations).
These explain mechanisms; they do not prove that any given author or model introduced them.

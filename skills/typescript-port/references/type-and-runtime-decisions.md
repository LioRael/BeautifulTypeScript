# TypeScript port — type and runtime decisions

Project-authored decisions informed by official sources; reviewed 2026-10-27. Use with
[porting checklist](porting.md). No companion skill is required.

## TS01 / TS05: choose an execution contract first

Use the [official module-environment guide](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
and [TSConfig reference](https://www.typescriptlang.org/tsconfig/) to check the target's
module resolution, globals and emit. Record the actual runtime/version, package kind and
build path. A CLI, browser bundle and reusable library can need different configurations.

Before replacing a source dependency, list its observable behavior: encoding, iteration
order, resource disposal, precision and platform errors. A TS type declaration for that
dependency is not evidence that the target runtime provides its implementation.

## TS02 / TS03: design the boundary and the internal model

The [Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) and
[API declaration guidance](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
are official language/API references, not mandates for a particular architecture.

Use this decision sequence for each source API:

1. Identify the accepted wire/native input domain, including missing and null values.
2. Separate validation errors from domain failures using the existing caller contract.
3. Select number, bigint or a string protocol from precision requirements; specify how
   values cross JSON boundaries before implementing arithmetic.
4. Represent real alternatives directly. Add wrappers or brands only if they prevent a
   concrete mix-up; do not recreate every source-language class.
5. Test aliases and mutation in-process when a JSON comparison would hide them.

For the inventory example, arbitrary string keys require first-seen ordering, and input
quantities have an explicit safe-integer contract. Map is a targeted choice for that
behavior, not a requirement for all dictionaries in all ports.

## TS04: map asynchronous semantics deliberately

[no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) and
[no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) identify
common hazards; passing lint does not establish equivalent scheduling.

Record when work starts, whether calls block, who observes errors, how much work may run
concurrently, and what cancellation guarantees. Test a rejecting middle operation and
observe later side effects. Replacing sequential calls with Promise.all can start work
that the source never started. A timeout race alone does not stop the underlying task.
Retain a synchronous API when no asynchronous behavior is required.

## TS06 / TS08 / TS09: preserve and demonstrate behavior

Maintain a source-test → target-test table. For every normalized comparison field, state
why normalization is valid. Do not sort outputs if order is part of the contract. Compare
error categories and side effects as well as values. Record unexecutable source features
as gaps, not passes. Benchmark only after equal-result checks and retain raw samples.
These are this project's evidence practices, not guarantees from a style guide.

## TS07: choose style after semantics

[Google](https://google.github.io/styleguide/tsguide.html) and
[Airbnb](https://github.com/airbnb/javascript) describe organizational preferences.
Use the target repository's conventions. Do not introduce a schema package, Result API,
new framework or default-export rewrite as an automatic part of translation.

## Worked case: a full-string parser across languages

Python fullmatch and JavaScript `$` do not have identical end-of-input behavior. A parser
must preserve accepted text, not just copy the apparent regex spelling.

```ts
// @example-run
function decimal(text: string): bigint {
  const match = /^[+-]?[0-9]+/.exec(text);
  if (match === null || match[0].length !== text.length) throw new Error('amount');
  return BigInt(text);
}
if (decimal('+0009007199254740993') !== 9007199254740993n) throw new Error('Precision lost');
for (const invalid of ['1\n', '1\r', '１', ' 1', '1tail']) {
  let rejected = false;
  try { decimal(invalid); } catch (error) { rejected = error instanceof Error && error.message === 'amount'; }
  if (!rejected) throw new Error(`Accepted malformed amount: ${JSON.stringify(invalid)}`);
}
```

Keep bigint internal when the wire protocol expects decimal strings. Do not first convert
through Number: precision may already be lost. The source may impose a digit/resource limit;
characterize that separately rather than asserting unlimited parity on every runtime.

## Worked case: dynamic-key order is observable

```ts
// @example-run
const record: Record<string, number> = {};
record['10'] = 1;
record['2'] = 2;
const ordered = new Map<string, number>([['10', 1], ['2', 2]]);
if (Object.keys(record).join(',') !== '2,10') throw new Error('Unexpected object-key order');
if ([...ordered.keys()].join(',') !== '10,2') throw new Error('Map lost insertion order');
```

Use Map only when its key/equality/order contract matches the source. Python numeric keys,
JavaScript object keys and object-identity keys do not automatically correspond. A JSON
object boundary loses some distinctions before your function runs; record that gap.
Compare ordered output directly instead of sorting both sides to hide the difference.

## Worked case: sequential failure effects

```ts
// @example-run
async function transfer<T>(items: readonly T[], write: (item: T) => Promise<void>): Promise<void> {
  for (const item of items) await write(item);
}
const calls: number[] = [];
const failure = new Error('write');
let observed: unknown;
try {
  await transfer([1, 2], async item => { calls.push(item); throw failure; });
} catch (error) { observed = error; }
if (observed !== failure || calls.join(',') !== '1') throw new Error('Failure effects changed');
```

Replacing this with Promise.all starts later side effects before the first rejection is
observed. If the original is concurrent, sequentializing it may also change behavior.
Use deferred operations for completion/cancellation tests; wall-clock sleeps are weak proof.
A JSON differential harness cannot inspect resource cleanup or object aliasing: add in-process
checks. Preserve the project's exception convention rather than introducing Result solely
because the source language commonly uses it.

## A concrete staged deliverable

1. Record source test results and accepted/error cases, including non-JSON behavior.
2. Add matching target tests and observe their failure against the target stub.
3. Implement pure parsing/grouping; compare outputs and error codes with a fixed seed.
4. Add host adapters and tests for ordered effects, cleanup and cancellation.
5. Build/import the shipped entry and document test mappings and unresolved differences.

The repository's ledger evaluation demonstrates stages 1–3 for a pure JSON module; it does
not prove stage 4 for native resources or concurrent services. Benchmark only after checks
establish equal work/results for the declared input domain.

## Complete the cutover (TS10)

A port has three distinct roles that may temporarily coexist: source behavior as an oracle,
a production adapter during rollout, and the target implementation. Record which role each
remaining path serves. Preserve the source for differential tests without automatically
calling it whenever the target fails.

For each temporary branch or escape, identify its consumer and retirement condition. When
the requested cutover removes that consumer, follow references through exports, flags,
registrations, dependency usage and tests. Keep evidence for retained behavior, retire tests
for deliberately removed behavior, and verify the real target caller. Avoid global cleanup
of unrelated source files or dependencies shared with another package.

An authorized final cutover below promises target failures to callers. Catching them and
silently falling back to the source is an incomplete transition:

```ts
// @example-run
type Calculate = (input: string) => Promise<string>;
const failure = new Error('Target unavailable');
const target: Calculate = async () => { throw failure; };
const calculate: Calculate = target;
let observed: unknown;
try { await calculate('input'); } catch (error) { observed = error; }
if (observed !== failure) throw new Error('Target failure was concealed');
```

The example binds the target directly. During a supported rollout the design may differ.
No fallback, retry or source-runtime emulation follows merely from the word “port”.

Temporary any/assertions belong at a specific interoperability boundary, with the invariant
and exit condition stated. Fix the target model instead of spreading unknown/as chains
through every internal function. A small copied transport object can be a real ownership
boundary; a second mutable model with no independent lifetime creates synchronization work.
The [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
explains why assertions alone cannot establish source/target compatibility.

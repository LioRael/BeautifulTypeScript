# Keep the next change small

Use this when extending existing TypeScript, replacing a behavior, or resolving type errors
in a patch. This is project methodology (TS10), not a claim that every agent creates these
problems. Read the [simplification examples](simplification.md) for local expression-level
choices. Here the unit of review is the complete changed call path.

## 1. Decide whether the change adds or replaces behavior

Trace the supported entrypoint through its policy and consumers. Identify the implementation
that should own the new behavior. Modify that owner when the requirement replaces its rule;
do not automatically add a new mode, wrapper, fallback or parallel implementation.

After a replacement, follow references to the superseded branch, options, types, tests,
exports and dependencies. Remove what the authorized change makes obsolete. Keep behavior
needed by supported consumers, stored data, rollout or rollback. A text search alone cannot
prove a public API unused: inspect package exports, framework registration and known callers.
Unknown compatibility is a specific uncertainty to report, not a reason to invent a broad
compatibility framework or silently break consumers.

Example: an internal caller has completed an authorized move from a legacy directory to a
current directory. A catch-and-fallback wrapper still executes the retired path and hides
a current-directory failure. Completing the change means forwarding that failure:

```ts
// @example-run
interface Entry { id: string }
type Read = () => Promise<Entry[]>;
async function before(readCurrent: Read, readLegacy: Read): Promise<Entry[]> {
  try { return await readCurrent(); } catch { return readLegacy(); }
}
function after(readCurrent: Read): Promise<Entry[]> {
  return readCurrent();
}
const failure = new Error('Current directory unavailable');
let legacyCalls = 0;
const readCurrent: Read = async () => { throw failure; };
await before(readCurrent, async () => { legacyCalls++; return []; });
let observed: unknown;
try { await after(readCurrent); } catch (error) { observed = error; }
if (observed !== failure || legacyCalls !== 1) throw new Error('Transition probe failed');
```

This deliberately changes the retired recovery behavior. It is appropriate only because
the migration contract authorizes that change. An ongoing rollout may still require the
old path. Keep a source implementation as a test oracle separately from production routing.

## 2. One owner for one business decision

Search for existing normalization, eligibility, sorting, rounding and validation before
copying a similar expression. Duplication matters when the same policy must change in
several places; two similar-looking algorithms with different contracts need not be merged.

Here the established eligibility policy includes suspension, but a newer caller has copied
only the archive check. Reusing the policy corrects the divergence:

```ts
// @example-run
interface Account { id: string; archived: boolean; suspended: boolean }
function canNotify(account: Account): boolean {
  return !account.archived && !account.suspended;
}
function before(accounts: readonly Account[]): string[] {
  return accounts.filter(account => !account.archived).map(account => account.id);
}
function after(accounts: readonly Account[]): string[] {
  return accounts.filter(canNotify).map(account => account.id);
}
const accounts = [{ id: 'paused', archived: false, suspended: true }];
if (before(accounts).length !== 1 || after(accounts).length !== 0) {
  throw new Error('Policy divergence was not exercised');
}
```

A new generic policy registry would add no value here. Reuse the existing function. If the
two callers intentionally have different eligibility rules, preserve that difference and
name it; do not centralize merely to meet a duplication score.

## 3. Construct a valid value instead of asserting a draft into one

When a type error appears, identify which producer/consumer relationship is wrong. Prefer
constructing the complete value, preserving a real discriminant, or narrowing the real
boundary. A double assertion, any, non-null assertion or suppression does not repair that
relationship. An inferred literal or satisfies can check construction; neither validates I/O.

```ts
// @example-run
interface Notice { kind: 'text'; body: string }
function before(body: string): Notice {
  const draft: Partial<Notice> = {};
  draft.kind = 'text';
  draft.body = body;
  return draft as Notice;
}
function after(body: string): Notice {
  return { kind: 'text', body };
}
if (JSON.stringify(before('')) !== JSON.stringify(after(''))) {
  throw new Error('Valid empty body changed');
}
```

The direct construction gives the compiler a complete value to check and removes partial
state. This is not a ban on every assertion: interop or a demonstrated control-flow/type
library limitation can require one. Keep it local, record the invariant it relies on, and
retain a behavioral check. Do not hide it inside an unbounded generic parse<T>() that lets
callers request a type the implementation cannot establish.

[TypeScript assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
are erased; [typed unsafe-flow checks](https://typescript-eslint.io/blog/avoiding-anys/)
can expose some compiler-accepted any flows. Neither tool establishes the whole contract.

## 4. Keep one source of truth; derive the view

A stored boolean that duplicates a status, or a second collection that mirrors a first,
creates synchronization work. Keep separate state for a real snapshot, independent lifetime
or ownership boundary. Otherwise derive the needed view from the existing value.

```ts
// @example-run
type Upload = { state: 'queued' | 'sending' | 'complete'; bytes: number };
function canRetry(upload: Upload): boolean {
  return upload.state === 'queued';
}
const upload: Upload = { state: 'queued', bytes: 0 };
if (!canRetry(upload)) throw new Error('Queued upload must be retryable');
upload.state = 'complete';
if (canRetry(upload)) throw new Error('Derived permission must follow state');
```

Do not introduce this type into a project with another established state model. The point
is to avoid storing a second canRetry flag and keeping it synchronized manually.

In React, calculate render-only data from current props/state where appropriate. Do not
add an Effect and mirrored state solely to perform that calculation; keep Effects for
actual external synchronization. Follow the framework's existing data-loading conventions.
See [React's own guidance](https://react.dev/learn/you-might-not-need-an-effect). This is
conditional React advice, not a universal lifecycle rule for TypeScript frameworks.

## 5. Inspect the checks that made the patch green

Review newly introduced any, assertions, compiler/lint suppressions, include/exclude changes,
mock substitutions and altered expectations alongside the source change. An empty catch,
default result or omitted file may hide the defect rather than fix it. Retire tests for an
authorized removed contract, preserve tests for retained behavior, and add a check through
the actual caller. Do not use the new implementation to manufacture its own expected result.

A typed lint warning is a clue, not authority to delete runtime protection.
[no-unnecessary-condition limitations](https://typescript-eslint.io/rules/no-unnecessary-condition/#limitations)
include optimistic indexed access and mutation outside the narrowing model. Verify the
runtime guarantee first. Negative type tests intentionally use ts-expect-error; a narrow
suppression for a demonstrated library limitation differs from disabling a whole file.

## 6. Finish the replacement without expanding the cleanup

Read the final diff from the consumer inward: can a reader find the current behavior, its
policy owner and its failure channel without following competing old/new routes? Check
that removed options, exports, registrations and generated output no longer advertise a
retired contract. Do not retain a dependency used only by removed code when its removal is
within scope; check workspace and dynamic consumers before changing the lockfile.

Leave unrelated debt alone. Record a concrete remaining compatibility obligation or tool
limitation when it matters. Do not create a permanent migration framework, a new report
file, or a cleanup quota for every small edit. Completion means the requested behavior is
coherent, not that every old-looking line has disappeared.

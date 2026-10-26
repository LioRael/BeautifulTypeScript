# Airbnb JavaScript Style Guide — applicability and examples

[Source](https://github.com/airbnb/javascript), Airbnb contributors; reviewed 2026-10-27,
rolling repository edition. This is JavaScript organizational style, not the TS type-system
specification. The compact source map below is followed by original project applications.
It does not redistribute the upstream guide or its code examples.

## Source section map

| Sections | Source preference | Our treatment |
|---|---|---|
| Types; References; Variables; Hoisting | const/let, deliberate scope | A1 |
| Objects; Arrays; Destructuring; Properties | Literals, spread, destructuring | A2 |
| Strings; Type Casting & Coercion | Explicit readable conversions | A3 |
| Functions; Arrow Functions | Defaults/rest; clear callbacks | A4 |
| Classes & Constructors | Class syntax; avoid prototype mutation | Preserve local model |
| Modules | ES modules; single-export defaults | A5: conflict |
| Iterators and Generators | Prefer higher-order iteration | A6: conflict |
| Comparison; Blocks; Control Statements | Explicit comparisons and blocks | A7 |
| Comments; Naming; Accessors; Events | Consistent descriptive interfaces | A8 |
| Whitespace; Commas; Semicolons | Consistent formatting | Existing formatter |
| jQuery; ES5 compatibility | Environment-specific conventions | Only legacy projects |
| ES6+ Styles; Standard Library | Standard modern facilities | Check target |
| Testing; Performance | Testing and measurement concerns | Project evidence |
| Resources; In the Wild; Translation; Guide Guide; Chat; Contributors; License; Amendments | Repository/community material | Not code rules |

## A1. Const protects a binding, not the referenced object

```ts
// @example-run
const settings = { attempts: 2 };
settings.attempts = 3;
if (settings.attempts !== 3) throw new Error('const does not freeze properties');
function total(values: readonly number[]): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum;
}
if (total([2, 3]) !== 5) throw new Error('Accumulator failed');
```

Our application: let is appropriate for a real accumulator. Moving every update into a
new object does not necessarily improve clarity. Check lifetime and mutation contracts
rather than equating a const declaration with immutability or banning ordinary loops.

## A2. Copying and destructuring are semantic operations

```ts
// @example-run
const source = { id: 'item-7', secret: 'local-only', count: 2 };
const { secret, ...publicValue } = source;
if ('secret' in publicValue || source.secret !== 'local-only') {
  throw new Error('Projection must not mutate the source');
}
```

Our application: an explicit projection is clearer than deleting a property from a
caller-owned object. This example removes one known field; it is not a comprehensive
security sanitizer. For a public payload, allowlisting the actual output fields is often
more robust than trusting all future rest properties. Spread is shallow, and reading
properties can invoke getters on non-JSON objects.

## A3. Conversion and validation are not interchangeable

```ts
// @example-run
function nonnegativeInteger(text: string): number {
  const match = /^[0-9]+/.exec(text);
  if (match === null || match[0].length !== text.length) throw new TypeError('integer');
  const value = Number(text);
  if (!Number.isSafeInteger(value)) throw new RangeError('integer');
  return value;
}
if (Number('') !== 0 || Number.parseInt('9tail', 10) !== 9) throw new Error('Probe changed');
if (nonnegativeInteger('009') !== 9) throw new Error('Valid decimal rejected');
for (const invalid of ['9tail', '', '9\n', '9\r', '9\u2028', ' 9']) {
  let rejected = false;
  try { nonnegativeInteger(invalid); } catch { rejected = true; }
  if (!rejected) throw new Error('Partial parse accepted');
}
```

Our application: this contract allows ASCII digits and leading zeros, but no whitespace,
sign or suffix. A different API may allow those. Prefer a complete parser policy over
choosing Number or parseInt solely to satisfy a style rule. Don't silently truncate decimals.

## A4. Callback clarity includes return ownership

```ts
async function sendRows<T>(rows: readonly T[], send: (row: T) => Promise<void>): Promise<void> {
  for (const row of rows) await send(row);
}
```

Our application: the sequential loop explicitly models stop-on-failure. A synchronous
projection can use map; an async event callback needs a rejection owner even when a
framework expects void. Avoid returning an assignment or side effect from an expression
arrow if that makes an accidental return contract hard to see.

## A5. Export preferences conflict; API compatibility decides

Airbnb's single-export preference differs from Google's named-export preference. Our
application: preserve an existing public path and framework entrypoint. For new internal
modules, follow surrounding code. A style-only export rename is not a correctness fix.
Check importers and emitted package exports if a change is actually requested.

## A6. Iteration helpers are not a universal substitute for loops

```ts
// @example-run
const rows = [{ id: 'a', active: false }, { id: 'b', active: true }];
const activeIds = rows.filter(row => row.active).map(row => row.id);
if (activeIds.join(',') !== 'b') throw new Error('Projection failed');
let inspected = 0;
let found: string | undefined;
for (const row of rows) {
  inspected += 1;
  if (row.id === 'a') { found = row.id; break; }
}
if (inspected !== 1 || found !== 'a') throw new Error('Early exit failed');
```

Our application: choose by effects, early exit, readability and measured cost. Don't enforce
an iteration prohibition on a sequential migration or resource-cleanup loop. Conversely,
a short pure transformation need not become a hand-written state machine.

## A7. Comparison, defaults and control flow

```ts
// @example-run
function attempts(value: number | undefined): number { return value ?? 3; }
if (attempts(0) !== 0 || attempts(undefined) !== 3) throw new Error('Default changed zero');
```

Our application: strict equality avoids unintended coercion, but the semantic question is
which values the contract equates. Here null is not in the accepted type; an external
boundary must reject it before calling this internal function. `??` would treat null as
absent too, so it cannot replace that validation. Use braces where a later edit could
otherwise change which statement is conditional; defer punctuation to the formatter.

## A8. Names, accessors and event interfaces

Our application: name a timeout with its unit and a callback by the event it observes.
A getter should not conceal expensive I/O; an event payload should carry the fields consumers
need without pretending every event shares one giant optional shape. Preserve a project's
existing naming/casing and framework handler conventions. Use comments for behavior that
is not evident from the signature. jQuery and obsolete-browser guidance applies only when
those environments are actually supported; do not introduce them to match a guide.

## Validation and scope

The marked examples run in the repository checks. Compiler checks do not establish lint
compliance with Airbnb's entire configuration. This project does not install that preset
or assert that its JavaScript rules cover TypeScript's declarations, host loading or types.
See [style decisions](style-decisions.md) for disagreements and [typed linting](typescript-eslint.md)
for checks with actual diagnostics.

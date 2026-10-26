# A simplification pass that preserves the contract

Use this on a completed diff, not as permission to redesign the project. These original
examples illustrate choices; they do not prescribe a universal function style. For every
removal, keep the same accepted inputs, outputs, errors, effects and ownership. The
[style decision map](style-decisions.md) records the broader source guidance.

## 1. Name a decision once

A trusted string still needs the business rule below: the normalized key must be nonempty.
The first implementation repeats that rule's normalization in the check and the result.
The second gives the derived value a name. It does not add a general-purpose normalizer.

```ts
// @example-run
function before(rawKey: string): string {
  if (rawKey.trim().toLowerCase().length === 0) {
    throw new Error('Empty key');
  }
  return rawKey.trim().toLowerCase();
}
function after(rawKey: string): string {
  const key = rawKey.trim().toLowerCase();
  if (key.length === 0) throw new Error('Empty key');
  return key;
}
for (const input of ['  Invoice ', 'A', '']) {
  const observe = (fn: (key: string) => string) => {
    try { return fn(input); } catch (error) { return String(error); }
  };
  if (observe(before) !== observe(after)) throw new Error('Contract changed');
}
```

Use this for a stable derived value within its valid lifetime. Do not hoist reads across
mutation or I/O, cache an impure operation, or normalize before a required rejection check.
When the project already defines normalization, call that implementation instead of
inventing a subtly different one. The same applies to sorting, rounding and error policy.

## 2. Make the requested result visible

The contract asks for the first matching document. A filtered array plus an index makes
the reader infer that intent; find expresses it directly without collecting every match.

```ts
// @example-run
interface Document { id: string; archived: boolean }
function before(documents: readonly Document[], id: string) {
  const matches = documents.filter(document => document.id === id && !document.archived);
  if (matches.length > 0) return matches[0];
  return undefined;
}
function after(documents: readonly Document[], id: string) {
  return documents.find(document => document.id === id && !document.archived);
}
const documents = [{ id: 'x', archived: true }, { id: 'x', archived: false }];
if (before(documents, 'x') !== after(documents, 'x')) throw new Error('Identity changed');
if (after(documents, 'missing') !== undefined) throw new Error('Missing result changed');
```

This is equivalent because the predicate is pure and the remaining checks have no required
effects. Do not replace a loop just to use an array method. A loop is often clearer for
several related accumulators, ordered side effects or early exit. Repeated filter/reduce
passes over the same collection can obscure the relationship and change the cost.

## 3. Share the outcome when branches mean the same thing

Here a failed lookup and an inactive endpoint have the same documented result. The caller
cannot distinguish them; neither branch performs another effect.

```ts
// @example-run
interface Endpoint { active: boolean; url: string }
function before(endpoint: Endpoint | undefined): string | null {
  if (endpoint === undefined) return null;
  if (!endpoint.active) return null;
  return endpoint.url;
}
function after(endpoint: Endpoint | undefined): string | null {
  return endpoint?.active ? endpoint.url : null;
}
for (const endpoint of [undefined, { active: false, url: '' }, { active: true, url: '' }]) {
  if (before(endpoint) !== after(endpoint)) throw new Error('Empty URL or absence changed');
}
```

Keep separate branches when they represent distinct errors, logs, cleanup, ordering or
state transitions. Avoid long boolean expressions that make those differences harder to
read. If many rejection paths return the same structured value, a local value may remove
repetition; keep a separate result per call when identity or mutation is observable. Do
not create a global mutable failure object merely to save a few object literals.

## 4. Delete a layer that adds no meaning

A helper is useful when it names a domain operation, encapsulates a policy or removes
substantial repetition. A one-use wrapper that only renames an existing method can add a
place to look without adding a concept.

```ts
interface Store { remove(key: string): Promise<void> }
async function removeEntry(store: Store, key: string): Promise<void> {
  await store.remove(key);
}
async function before(store: Store, obsoleteKeys: readonly string[]): Promise<void> {
  for (const key of obsoleteKeys) await removeEntry(store, key);
}
async function after(store: Store, obsoleteKeys: readonly string[]): Promise<void> {
  for (const key of obsoleteKeys) await store.remove(key);
}
```

Both retain sequential execution and stop on rejection. Do not remove a helper that is a
public API, changes error semantics, owns a resource, or carries useful domain meaning.
Likewise, a function used once can still deserve a name when it explains complex work.

## 5. Remove checks only where the contract already establishes the fact

These are internal values produced by the same typed application. Optional chaining and
a fallback imply absence the type and caller contract exclude.

```ts
interface Invoice { customer: { displayName: string } }
function before(invoice: Invoice): string {
  return invoice?.customer?.displayName ?? 'Unknown';
}
function after(invoice: Invoice): string {
  return invoice.customer.displayName;
}
```

Do not apply that reasoning to unknown JSON or JavaScript callers outside the contract.
The checks below establish a real boundary and belong in the implementation. A guard
accepting unknown can narrow each array element directly, without an extra alias purely
to work around Array.isArray exposing any[].

```ts
// @example-run
interface Tag { name: string }
function isTag(value: unknown): value is Tag {
  return typeof value === 'object' && value !== null &&
    'name' in value && typeof value.name === 'string';
}
function tagNames(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Expected tags');
  return value.map((entry: unknown) => {
    if (!isTag(entry)) throw new Error('Invalid tag');
    return entry.name;
  });
}
if (tagNames([{ name: '' }])[0] !== '') throw new Error('Empty name is allowed');
let rejected = false;
try { tagNames([null]); } catch { rejected = true; }
if (!rejected) throw new Error('Boundary check lost');
```

The required contract here allows extra properties and an empty name. Adding an exact-key
schema or a nonempty-name rule would change the API. Use the project's existing decoder
when there is one; handwritten checks are not a preference over established tools.

## 6. Keep justified copies, state and types

Removing syntax can silently transfer ownership. This function promises a separately
mutable outer array. Returning rows directly would violate that contract; the copy is
necessary. Copying every nested object would be unnecessary under this narrower promise.

```ts
// @example-run
interface Row { label: string }
function editableOrder(rows: readonly Row[]): Row[] {
  return [...rows];
}
const source = [{ label: 'one' }];
const result = editableOrder(source);
result.pop();
if (source.length !== 1) throw new Error('Outer ownership changed');
```

Similarly, keep state needed to represent a protocol, a type needed to preserve a public
relationship, and a catch needed to translate an actual error contract. Before claiming
a shorter version is better, count its hidden helpers, dependencies and repeated work.
When both versions express the contract equally well, keep the established one.

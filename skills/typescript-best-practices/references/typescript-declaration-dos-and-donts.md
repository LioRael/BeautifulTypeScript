# Declaration Do's and Don'ts — every recommendation group

[Source](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html),
Microsoft / TypeScript team; reviewed 2026-10-27, rolling documentation. Scope: public
signatures and .d.ts files. The following original exercises use TypeScript 5.9.3.

## Source checklist

All recommendation groups on the source page are represented:

| Group | Short recommendation | Exercise |
|---|---|---|
| General types | Use primitives, not boxed types | D1 |
| Generics | Type parameters must matter | D2 |
| any | Keep uncertainty as unknown; contain migration any | D3 |
| Callback returns | Ignored results use void | D4 |
| Optional callback parameters | Optional means the producer may omit | D5 |
| Callback overloads | Avoid overloads differing only in callback arity | D5 |
| Overload ordering | Specific signatures precede broad ones | D6 |
| Optional parameters | Merge compatible trailing-argument overloads | D7 |
| Union types | Merge compatible parameter alternatives | D8 |

Each example below is our application and includes the consumer consequence. It is not a
replacement copy of the source page. Runtime input validation is a separate responsibility.

## D1. Primitive and object boundaries

```ts
function normalize(code: string): string { return code.trim().toLowerCase(); }
normalize(' AA ');
// @ts-expect-error A boxed object is not the primitive API contract.
normalize(new String('AA'));
```

Our check: compile both calls. Do not substitute object for unknown at an arbitrary JSON
boundary: strings and numbers are valid JSON too. Conversely, an object-only operation
should not claim to accept every possible value merely to avoid narrowing.

## D2. A generic should preserve a relationship

```ts
interface EmptyTag<T> { label: string } // T changes no member: not a distinct identity.
const numberTag: EmptyTag<number> = { label: 'shared' };
const stringTag: EmptyTag<string> = numberTag; // Compiles; phantom safety was illusory.

interface ValueBox<T> { value: T }
const actual: ValueBox<number> = { value: 7 };
// @ts-expect-error T participates in the value contract.
const notText: ValueBox<string> = actual;
```

Our application: choose a concrete type when no relationship is needed. An intentional
brand is a different design requiring a real member and construction boundary; don't
introduce branding simply to make an unused generic meaningful.

## D3. Unknown data needs evidence

```ts
function characterCount(value: unknown): number {
  // @ts-expect-error Unknown has no established string operations.
  const unchecked = value.length;
  if (typeof value !== 'string') throw new TypeError('text');
  return value.length;
}
```

The unchecked line is a compile-time counterexample, not production code. Keep only the
narrowed branch in an implementation. A transitional any should have a bounded migration
location; turning the same value into `as DesiredType` does not complete that migration.

## D4. Void models an ignored result, not asynchronous completion

```ts
function notify(callback: () => void): void { callback(); }
notify(() => 42); // Return value is allowed but ignored.

async function notifyAsync(callback: () => Promise<void>): Promise<void> {
  await callback();
}
```

Our application: the second API has an observable completion contract. Giving an async
function to the first API can compile while losing its rejection. Typed lint and a
controlled pending/rejecting callback test reveal that difference. Don't change a sync
API into an async API without checking all callers.

## D5. Callback arity belongs to the producer

```ts
function report(onProgress: (done: number, total: number) => void): void {
  onProgress(2, 8);
}
report(done => { const percentOfEight = done / 8; }); // Ignoring total is valid.
report((done, total) => { const ratio = done / total; });

type MaybeTotal = (done: number, total?: number) => void;
const uncertain: MaybeTotal = (done, total) => {
  // @ts-expect-error Optional means total could be absent.
  const ratio = done / total;
};
```

Our check: pass consumers using one and two parameters to one accurate callback signature.
Do not create overloads for each consumer arity when the producer always supplies both.
If the producer really lacks total, retain optionality and make the consumer handle it.

## D6. Resolve specific overloads before a catch-all

```ts
declare function readSetting(key: 'attempts'): number;
declare function readSetting(key: string): string | number;
const attempts: number = readSetting('attempts');
const arbitrary: string | number = readSetting('theme');
```

Our check: a consumer assignment pins the narrow result. Also test a widened string
variable: it should get the broader result. Keep the actual implementation compatible
with every overload; the implementation signature is not an extra public call signature.

## D7. Optional trailing arguments versus separate operations

```ts
function caption(text: string, maxLength = 40): string {
  return text.slice(0, maxLength);
}
caption('short');
caption('short', 3);
// @ts-expect-error A present argument still needs the correct type.
caption('short', '3');
```

Our application: defaulting and optionality are distinct from null acceptance. Check omitted,
explicit undefined and explicit null according to the API. Keep separate overloads when
argument presence changes the return type or permitted combinations.

## D8. A union can accept a value already represented as a union

```ts
function measure(value: string | readonly string[]): number { return value.length; }
function consumer(value: string | readonly string[]): number { return measure(value); }
```

Our application: this keeps one return type and one operation. Do not collapse overloads
when doing so loses an important input-to-output relationship, as in D6. Test the consumer's
actual union-valued argument, not only individual literals.

## Delivery check

Compile a consumer against emitted declarations through the package's public exports.
Include accepted and rejected calls, callback arities and inferred result assignments.
A source-only pass can hide a missing declaration dependency or export. The examples here
are compiler-checked; they do not themselves constitute an installed-package test.

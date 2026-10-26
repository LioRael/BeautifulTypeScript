# TypeScript Handbook — engineering applications

Microsoft / TypeScript team, rolling official documentation; reviewed 2026-10-27.
This is a selected engineering reading path, not a summary of every Handbook page.
Language semantics outrank an organizational style preference. Examples are original,
checked with TS 5.9.3; newer Handbook features need the project's supported compiler.

## Reading map

| Topic | Source | Decision |
|---|---|---|
| Primitives, unions, assertions | [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) | H1 |
| Truthiness, guards, predicates, exhaustiveness | [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) | H2–H3 |
| Callbacks, parameters, overloads, void | [Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) | H4 |
| Optional, readonly, index signatures, tuples | [Objects](https://www.typescriptlang.org/docs/handbook/2/objects.html) | H5 |
| Constraints and related values | [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) | H6 |
| keyof and indexed access | [Indexed access](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html) | H6 |
| Mapped and conditional types | [Mapped](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html), [conditional](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) | H7 |
| Classes and modules | [Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html), [modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) | H8 |

## H1. A static assertion does not establish a runtime fact

Source principle: TS types describe values statically; assertions do not perform validation.
Our application: isolate JSON uncertainty and reject malformed values before returning a
trusted shape. `satisfies` is useful for author-written configuration, not untrusted data.

```ts
// @example-run
interface Account { id: string }
function account(value: unknown): Account {
  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
      !('id' in value) || typeof value.id !== 'string') throw new TypeError('account.id');
  return { id: value.id };
}
const parsed: unknown = JSON.parse('{"id":7}');
let rejected = false;
try { account(parsed); } catch (error) { rejected = error instanceof TypeError; }
if (!rejected) throw new Error('Malformed account escaped');
```

For a nested payload, check the nested payload too. A predicate that only checks `kind`
cannot honestly promise all the fields of a particular union member. A schema dependency
is appropriate when already established or justified by the shape's complexity.

## H2. Narrow the absent state, not all falsy values

Source principle: truthiness narrowing includes empty string and zero; explicit equality
can target the intended absent state. Our example distinguishes absent text from empty text.

```ts
// @example-run
function displayName(value: string | null): string {
  return value === null ? '(missing)' : value;
}
if (displayName('') !== '' || displayName(null) !== '(missing)') {
  throw new Error('Absence and empty text were conflated');
}
```

Check `typeof null`, array containers and optional reads deliberately. The `in` operator
can find inherited properties; a JSON-object policy and an arbitrary-object policy need
not accept the same domain. Do not invent prototype restrictions on internal objects.

## H3. Model actual state alternatives; make missing cases visible

Source principle: a literal discriminant narrows a union; never can expose an unhandled case.
Our application: keep the payload with the state that permits it instead of independent flags.

```ts
type LoadState =
  | { status: 'idle' }
  | { status: 'ready'; rows: readonly string[] }
  | { status: 'failed'; error: Error };
function summary(state: LoadState): string {
  switch (state.status) {
    case 'idle': return 'Waiting';
    case 'ready': return `${state.rows.length} rows`;
    case 'failed': return state.error.message;
    default: { const impossible: never = state; return impossible; }
  }
}
// @ts-expect-error Ready requires its rows; optional-everything would conceal this.
const incomplete: LoadState = { status: 'ready' };
```

Add a new variant during a type test to see whether the switch is exhaustive. Do not
introduce a state machine for a value with no state-dependent operations. Exhaustiveness
inside TypeScript still needs an external-input validation boundary.

## H4. Function contracts include ignored results and optional arguments

Source principles: fewer-argument callbacks can be assignable; void callbacks ignore
results; overloads and generics should express useful relationships.
Our application: a callback's accepted type is not proof its promise is awaited.

```ts
async function saveAll<T>(rows: readonly T[], save: (row: T) => Promise<void>): Promise<void> {
  for (const row of rows) await save(row);
}
// Contrast: rows.forEach(async row => save(row)) discards callback promises.
```

Test with manually deferred promises: the second call must not start until the first
finishes; reject the first and check that no later call starts. Use bounded parallel work
when the contract allows it, rather than requiring sequential execution universally.
See [declaration exercises](typescript-declaration-dos-and-donts.md) for arity and overloads.

## H5. Readonly, tuples and indexed access have different jobs

Source principle: readonly restricts writes through a type, not all aliases or runtime
mutation. Optional/indexed access can yield absence; tuples express positional structure.

```ts
// @example-run
const mutable = { count: 1 };
const view: Readonly<{ count: number }> = mutable;
mutable.count = 2;
if (view.count !== 2) throw new Error('Readonly unexpectedly broke aliasing');
const independentlyOwned = { ...view };
mutable.count = 3;
if (independentlyOwned.count !== 2) throw new Error('Copy unexpectedly aliased');
```

```ts
function first<T>(items: readonly T[]): T | undefined { return items[0]; }
type Interval = readonly [start: number, end: number];
function width([start, end]: Interval): number { return end - start; }
// @ts-expect-error Interval requires two coordinates.
width([2]);
```

A fixed tuple fits coordinates; named fields are often clearer for unrelated business
values. An index signature does not prove every key exists; enable/test the intended
indexed-access policy rather than asserting every lookup is present.

## H6. Relate a key to the value it selects

Source principle: keyof constraints and indexed access retain a property relationship.
Our application: preserve the consumer's actual result type without a cast at every call.

```ts
function pick<T, K extends keyof T>(value: T, key: K): T[K] { return value[key]; }
const config = { attempts: 2, region: 'west' };
const attempts: number = pick(config, 'attempts');
// @ts-expect-error Unknown key is not a supported property.
pick(config, 'timeout');
// @ts-expect-error Selecting attempts does not produce text.
const region: string = pick(config, 'attempts');
```

If only one concrete configuration is ever accepted, a concrete function may be simpler.
Don't expose a type parameter that occurs only in a return assertion; accept a decoder
or another input that establishes the output type.

## H7. Advanced types should mirror an operation, not replace it

Source principles: mapped types transform properties; conditional types can distribute
over unions. Our examples distinguish a patch shape from state validity and distribution
from testing a union as a whole.

```ts
type Patch<T> = { [K in keyof T]?: T[K] };
type Person = { name: string; age: number };
const patch: Patch<Person> = { age: 28 };
// @ts-expect-error Patch still preserves each field's value type.
const invalid: Patch<Person> = { age: '28' };

type EachArray<T> = T extends unknown ? T[] : never;
type WholeArray<T> = [T] extends [unknown] ? T[] : never;
const mixed: WholeArray<string | number> = ['a', 1];
// @ts-expect-error Distributed result is string[] | number[], not a mixed array.
const separate: EachArray<string | number> = ['a', 1];
```

A Partial/Patch type does not validate a request or authorize changing every field.
Expose only editable fields and validate cross-field invariants after merging. Avoid
recursive conditional machinery when ordinary types provide a clearer public contract.

## H8. Classes, modules and scope limits

Classes can own behavior/lifecycle; an interface describes structure without runtime
construction. Module resolution and runtime loading are different checks. Use the
[compiler guide](typescript-compiler-configuration.md) for actual package boundaries.

This digest intentionally defers decorators, JSX, mixins, declaration merging, namespaces,
compiler internals and framework-specific patterns to their own official/project docs.
The reading map is explicit about coverage: this is not an exhaustive Handbook rewrite.

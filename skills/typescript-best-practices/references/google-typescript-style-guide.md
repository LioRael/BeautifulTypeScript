# Google TypeScript Style Guide — decisions and examples

[Source](https://google.github.io/styleguide/tsguide.html), Google contributors; reviewed
2026-10-27, rolling edition. Organizational guidance, not the language specification.
Its own introduction warns that Google's environment differs from external projects.
Examples below are original BeautifulTypeScript applications, not copied guide examples.
Use G1–G10 for decisions; use the source anchors to inspect detailed exceptions.

## Source map

| Source topic | Concise source position | Application below |
|---|---|---|
| [Files](https://google.github.io/styleguide/tsguide.html#source-file-basics) | UTF-8; readable escapes | G1 |
| [Structure](https://google.github.io/styleguide/tsguide.html#source-file-structure) | Imports precede implementation | G1 |
| [Exports](https://google.github.io/styleguide/tsguide.html#exports) | Named exports; avoid mutable exports and container classes | G2 |
| [Type imports](https://google.github.io/styleguide/tsguide.html#import-export-type) | Distinguish type imports/exports; modules over namespaces | G2 |
| [Variables/collections](https://google.github.io/styleguide/tsguide.html#language-features) | const/let; literals; deliberate spread/destructuring | G3 |
| [Functions](https://google.github.io/styleguide/tsguide.html#functions) | Named declarations; arrow callbacks; explicit adapters | G4 |
| [Classes](https://google.github.io/styleguide/tsguide.html#classes) | Deliberate visibility and initialization | G5 |
| [Control flow](https://google.github.io/styleguide/tsguide.html#control-structures) | Strict equality; focused try; justified assertions | G6 |
| [Names](https://google.github.io/styleguide/tsguide.html#naming) | Descriptive, consistent identifiers | G7 |
| [Types](https://google.github.io/styleguide/tsguide.html#type-system) | Inference; structural types; interfaces; avoid any and return-only generics | G8–G9 |
| [Disallowed features](https://google.github.io/styleguide/tsguide.html#disallowed-features) | Reject wrappers, eval, builtin mutation, const enums | G10 |
| [Toolchain](https://google.github.io/styleguide/tsguide.html#toolchain-requirements) | Compiler/conformance checks; constrained suppressions | G10 |
| [Documentation](https://google.github.io/styleguide/tsguide.html#comments-documentation) | Useful public documentation; avoid redundant comments | G7 |
| [Policies](https://google.github.io/styleguide/tsguide.html#policies) | Consistency, scoped reformatting, deprecation, generated-code exceptions | G10 |

## G1. Files and imports: make dependencies visible

Our application: keep existing formatter/header conventions. Name a file by its domain,
not by a catchall such as helpers2. Check import side effects before reorganizing imports;
a formatting change must not reorder initialization accidentally. Readable Unicode is fine;
an invisible separator needs a visible escape and a reason. Verify encoding-sensitive output
as bytes when it forms a protocol. Google's whitespace choices are not a migration mandate.

## G2. Exports: preserve consumers, reduce hidden state

Our application: preserve framework-required default exports and existing package paths.
For a new utility, a function export is usually sufficient; a class with only static methods
adds an unnecessary call shape. A mutable export creates shared lifetime and test-order
questions. Neither replacing it with a class nor hiding it behind a getter resolves those.

```ts
// A shared mutable binding couples every caller to one process-wide setting.
export let activeRegion = 'west';
export function badEndpoint(): string { return `/api/${activeRegion}`; }

// For independent clients, pass configuration explicitly.
export function endpoint(region: string): string { return `/api/${region}`; }
```

Verify two clients can use different regions without resetting module state. If process-wide
state is intentional, document that contract rather than applying this example mechanically.
Type-only imports may be erased; an initialization dependency must remain a value/side-effect
import. Check emitted JS when changing that distinction.

## G3. Arrays, records and spread: know what is copied

```ts
// @example-run
const original = { connection: { attempts: 1 } };
const shallow = { ...original };
shallow.connection.attempts = 2;
if (original.connection.attempts !== 2) throw new Error('Expected shared nested object');
const independent = { ...original, connection: { ...original.connection } };
independent.connection.attempts = 3;
if (original.connection.attempts !== 2) throw new Error('Nested update leaked');
```

Our application: copy only the branch that the contract says is independently owned.
Deep-cloning every parameter can destroy identity, prototypes and performance. For a
fixed record, destructuring can clarify fields; for dynamic keys, first establish key
and ordering semantics. Array spread copies elements, not the objects those elements reference.

## G4. Callback adaptation: control arguments and receiver

```ts
// @example-run
const tokens = ['14', '14', '14'];
const surprising = tokens.map(parseInt); // map also passes index as radix.
const decimal = tokens.map(text => Number.parseInt(text, 10));
if (!Number.isNaN(surprising[1]) || decimal.some(n => n !== 14)) {
  throw new Error('Callback adaptation changed');
}
```

Our application: write an adapter when the producer supplies more parameters than the
callee should receive. Number.parseInt still accepts a numeric prefix, so this is not a
complete input validator. For methods, also check whether detaching the function loses this.
Keep a stable listener reference if removal later depends on the same function identity.

```ts
class Meter {
  private total = 0;
  add(delta: number): void { this.total += delta; }
  callback(): (delta: number) => void { return delta => this.add(delta); }
}
```

## G5. Classes versus data: separate invariants from ceremony

```ts
interface WindowSize { width: number; height: number }
function area(size: WindowSize): number { return size.width * size.height; }

class RetryBudget {
  private remaining: number;
  constructor(limit: number) {
    if (!Number.isInteger(limit) || limit < 0) throw new RangeError('limit');
    this.remaining = limit;
  }
  take(): boolean {
    if (this.remaining === 0) return false;
    this.remaining -= 1;
    return true;
  }
}
```

Our application: the record has no lifecycle; the budget owns a transition. Keep existing
class/function conventions when both are appropriate. TS private is a static access rule;
choose ECMAScript private fields only when their runtime behavior and target support are
needed, rather than equating either spelling with security or universal style compliance.

## G6. Narrow before access; keep recovery boundaries narrow

```ts
function label(input: unknown): string {
  if (typeof input !== 'object' || input === null || !('label' in input)) {
    throw new TypeError('label');
  }
  if (typeof input.label !== 'string') throw new TypeError('label');
  return input.label; // An assertion would not have performed these checks.
}
```

Our application: don't catch parsing, persistence and response serialization in one block
that returns an empty object on any failure. Name the recoverable operation and preserve
unrelated failures. Test malformed data and downstream rejection separately. A predicate
must validate every property it promises, not merely return a convenient static type.

## G7. Names and documentation: expose the hidden contract

```ts
/** Uses milliseconds; rejects negatives and preserves zero as an immediate timeout. */
function timeoutMillis(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('timeoutMillis');
  return value;
}
```

Our application: units and failure semantics help callers; commenting “returns value” does
not. Match the repository's casing for constants and acronyms. Domain names matter more
than renaming every interface/type prefix in an unrelated change. Deprecation notes should
point callers to the supported replacement and any behavior difference.

## G8. Structural types, inference and optional properties

Our application: infer a local literal, but give a stable public return contract when a
refactor could silently widen it. An interface and a type alias can both express a record;
use a union for actual alternatives. Preserve missing versus null versus present-undefined.
[Handbook](typescript-handbook.md) and [compiler configuration](typescript-compiler-configuration.md)
show checked examples rather than prescribing an interface-only rewrite.

## G9. Avoid an unconstrained promise made by a generic

```ts
// The caller can request any T, but JSON parsing has not established that T.
function unsafeRead<T>(text: string): T { return JSON.parse(text) as T; }

function readWith<T>(text: string, decode: (value: unknown) => T): T {
  const value: unknown = JSON.parse(text);
  return decode(value);
}
```

Our application: keep uncertainty at the parser boundary and require actual evidence to
produce T. Reuse a project's decoder/schema where one exists; this signature does not
require a new dependency. Test the decoder with a structurally wrong but valid JSON value.
Mapped/conditional types should preserve a useful relationship, not conceal the validation gap.

## G10. Tooling and exclusions

Our application: public const-enum emit, decorators and module syntax need consumer/toolchain
checks; don't infer support from one editor. Use the existing formatter for whitespace,
commas and semicolons. Remove debugger statements from shipped code. Do not change builtins
or evaluate strings to avoid designing a small explicit dispatch table. Generated files
should be regenerated, not hand reformatted. A narrow suppression needs a concrete reason
and a check that it remains necessary. Google-specific bans are not all global TS rules.

[Conflict decisions](style-decisions.md) distinguish these applications from source policy.

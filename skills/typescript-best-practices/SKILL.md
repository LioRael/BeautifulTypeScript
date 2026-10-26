---
name: typescript-best-practices
description: Write and refactor TypeScript using project-aware type, runtime, async and module practices. Use when implementing TypeScript changes.
---

# TypeScript best practices

Write the smallest clear implementation that satisfies the actual contract. Beautiful
code makes intent easy to see with fewer concepts, branches and indirections. Correctness
is required; extra validation, annotations and abstractions are not quality by themselves.

Before adding code, identify the caller or requirement it serves. Trust established
internal types and validated values. Add runtime checks at an actual untrusted boundary,
reuse existing parsers, and keep business logic direct. Do not widen trusted inputs to
unknown just to validate them again. Preserve errors instead of inventing fallback success.
Prefer ordinary language features; introduce a helper or type only when it removes real
repetition or expresses a meaningful relationship. Stop when the contract is met.

## 1. Establish the contract before editing (TS01)

Read applicable instructions, package.json, lockfile, scripts, tsconfigs and nearby code.
Identify the package manager, supported runtime, ESM/CJS boundary, framework-generated
configuration and public callers. Inspect scripts before running them; a command named
“test” may invoke services or mutate data. Keep verification local to the authorized scope.

Distinguish the deliverable:

| Application/internal module | Reusable package/public API |
|---|---|
| Reuse framework conventions and concrete domain types | Preserve exports, call signatures and declared runtime support |
| Follow the existing error/UI flow | Make failures and mutation visible in the public contract |
| Validate external data where it enters the application | Check runtime imports and a consumer of emitted declarations |
| Avoid abstractions for hypothetical future users | Avoid leaking implementation-only dependencies into exported types |

Do not infer that a private package has no external callers. Search imports and call sites.
A missing lint/config file is not permission to reconfigure the repository.
When asked to establish a new lint setup, default to type-aware Oxlint; preserve
existing framework requirements and ESLint checks without verified equivalents.

## 2. Validate data at trust boundaries (TS02)

Network responses, JSON, storage, command arguments and foreign-language values are not
validated by an interface, `as`, non-null assertion or `satisfies`.

1. Locate the real boundary and check for an existing validator before adding one.
   Accept unknown there when the shape is not established.
2. Validate the outer container, then properties and domain constraints actually needed.
3. Return a trusted representation using the project's existing failure convention.
4. Test rejection and defaults as well as one valid input.

For a record guard, distinguish object, null and array. After Array.isArray, keep elements
as unknown until checked: its standard type predicate otherwise exposes any[]. Reuse an
existing schema/decoder when one exists; a small handwritten parser is fine for a small
shape. Do not validate every internal call again without a separate trust boundary.

Default only the states the contract considers absent. `value || fallback` also replaces
zero, false and empty strings. `value ?? fallback` replaces null as well as undefined;
that is wrong if null should be rejected. First establish absence, then validate the value.
For numeric values, distinguish finite numbers, integers, safe integers and range limits.
Coercion such as Number(text) may accept empty text or whitespace the API intended to reject.

The original [boundary and async examples](assets/patterns.ts) demonstrate a small parser
and sequential writes. They are illustrative patterns, not a required API/error model.

## 3. Model states and APIs deliberately (TS03)

- Use a discriminated union when fields depend on a real state. Avoid an object with many
  unrelated optional fields if callers must repeatedly reconstruct which combinations work.
- Keep null, omitted properties and undefined distinct where storage/API semantics differ.
  exactOptionalPropertyTypes can expose that distinction but is a scoped migration choice.
- Infer obvious locals. Annotate public boundaries when it prevents accidental contract
  changes; avoid a global “every function needs an annotation” rule.
- Use generics to retain a relationship between input/output values, not to decorate an
  otherwise concrete function. Prefer a union to redundant overloads; retain overloads
  when they preserve a meaningful argument-to-result relationship.
- Mark a callback parameter optional only when the producer can omit it. A consumer can
  ignore a supplied argument without the producer's signature marking it optional.
- Readonly documents allowed writes through a type; it does not freeze aliases or nested
  runtime objects. Test input preservation when callers rely on it.
- Choose Map for dynamic keys when its semantics fit; use a record for known fields.
  Numeric-looking object keys and prototype properties need care when porting key order.

Keep established interface/type, class/function and enum/union conventions unless there
is a concrete semantic or compatibility reason to change them. Do not force branded IDs.

## 4. Make failures usable without changing the error model

Find how callers distinguish expected domain failures from defects. Preserve error identity
and useful context; do not replace all failures with a generic message or empty default.
Catch unknown values carefully: arbitrary thrown values need not be Error instances.
When translating an error at a boundary, preserve the original cause when supported and
useful. Do not attach secrets or full untrusted payloads just to provide context.

An empty catch, unconditional retry, or fabricated success value can hide partial failure.
Retries require a reason the operation can safely repeat, a bound and cancellation behavior.
Use a thrown error, tagged return or existing Result convention as the project requires;
this skill does not introduce one across the codebase.

## 5. Give asynchronous work an owner (TS04)

For each task identify who observes completion, failure and cancellation.

| Requirement | Suitable starting point | Check |
|---|---|---|
| Order and stop-on-failure matter | Await inside a sequential loop | Later work does not start after failure |
| Independent bounded work | Existing concurrency limiter or explicit small bound | Concurrency, rejection and cleanup |
| Caller needs all results | Return/await the combined operation | Partial side effects when one task fails |
| Background work is intentional | Existing supervisor/error channel | Failure is observed; lifetime is explicit |
| Callback API ignores returns | Adapt to its documented error mechanism | Returned promises are not silently discarded |

async forEach does not make the outer operation wait. `void promise` does not catch a
rejection. Promise.all does not cancel siblings; racing a timeout does not stop underlying
work. Do not make synchronous code async without a contract reason.

Release acquired resources in the existing cleanup pattern, commonly try/finally. Test
failure after acquisition, not just successful cleanup. Cancellation must reach the actual
I/O/task where supported; forwarding a signal in a type is not evidence it is honored.

## 6. Match modules and runtime support (TS05)

Keep server-only imports out of browser paths. Align resolution, package type, emitted
extensions, exports and declarations with the loader that ships. TS paths do not rewrite
runtime imports; available lib declarations do not add runtime APIs or polyfills.

A source-path test can pass while the published entrypoint is broken. For packages,
build and import the emitted public entrypoint and typecheck a consumer of declarations.
For applications, use the framework's actual build and runtime checks. Separate host
contexts where globals differ. Do not claim Bun, Deno or browser execution from Node tests.

## 7. Keep ordinary code ordinary (TS07, TS08)

Use direct access, standard collection operations and plain control flow when they express
the contract. Avoid optional chaining, defaults, catches and defensive copies for states
the caller contract excludes. Keep them when they serve real optionality, error handling
or ownership. Do not trade readable code for dense one-liners or remove required validation.

Compare refactors under the same input, output and failure contract. Count the concepts
a reader must understand, including hidden helpers and dependencies, not only visible lines.
Preserve public behavior; make behavior changes explicit and test them separately.

Use comments for invariants, tradeoffs and surprising compatibility behavior. Document
failure conditions, mutation, ordering and numeric/text limits where callers need them.
Do not repeat obvious syntax or generate a design essay for a small helper.

Measure a demonstrated bottleneck before caching, batching or changing algorithms. Check
outputs first, use representative inputs, keep raw samples and report regressions/noise.
A microbenchmark of two algorithms does not measure the benefit of this skill.

## 8. Validate and deliver (TS09)

Run the repository's affected-package typecheck, lint, tests and build as applicable.
Confirm the tests and lint actually include the changed files. Add behavior tests that
would fail for the original defect, not assertions that mirror each implementation line.

Report the behavioral/API change, actual commands and results, and material gaps. If a
baseline failure blocks validation, identify it without weakening checks or fixing
unrelated code. An unavailable runtime is an unverified target, not a pass.

## Reference library — read only what the change needs

| When deciding | Read |
|---|---|
| Module organization, inference, naming or assertions | [Google TypeScript Style Guide](references/google-typescript-style-guide.md) |
| Narrowing, state models, generics or mutation | [TypeScript Handbook](references/typescript-handbook.md) |
| Public callbacks, overloads or declaration files | [Declaration Do’s and Don’ts](references/typescript-declaration-dos-and-donts.md) |
| Promise diagnostics, ESLint or Oxlint setup | [Lint setup and migration](references/typescript-eslint.md) |
| Host globals, strictness, modules or emitted output | [Compiler configuration](references/typescript-compiler-configuration.md) |
| JavaScript readability and local style | [Airbnb JavaScript Style Guide](references/airbnb-javascript-style-guide.md) |
| Guides disagree, or a rule ID needs explanation | [Style decisions and rule map](references/style-decisions.md) |

These are bundled original digests with source links, applicability and project decisions.
They are not copies of the guides. This skill works on its own; follow project constraints
and avoid installing a new architecture, Result type, schema library or formatter by default.

The `evals/` directory contains maintainer evaluation cases and graders. It is not
additional task guidance; do not read it while applying this skill to a user project.

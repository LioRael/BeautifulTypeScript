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

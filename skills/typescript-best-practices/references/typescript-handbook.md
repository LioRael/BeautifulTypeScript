# TypeScript Handbook — type modeling digest

Owner: Microsoft / TypeScript team. Reviewed: 2026-10-27; rolling official documentation.
Read for narrowing, state models, function contracts and mutation (TS02, TS03).
These are language explanations, not a preferred application architecture.

## Narrowing and control flow

Source: [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).

Runtime checks and control flow refine a value's static type. A truthiness condition can
exclude legitimate empty strings or zero, while an explicit null/undefined comparison
preserves them. A common literal field can distinguish union members; an exhaustive
branch can use never to expose an omitted case. A user-written type predicate is a claim
the compiler trusts, so its implementation must actually establish the promised shape.

**Application:** For an external response, validate its discriminant and required payload
fields together. Do not check only `kind` and then assert a payload type. Include invalid
payloads for each accepted discriminant in the boundary test corpus.

## Functions and generics

Source: [More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html).

Generics describe relationships between values. Prefer fewer parameters and constraints
that express a real relationship; avoid a generic parameter that adds no information.
A union parameter is often simpler than equivalent overloads. A callback returning a
value can be assigned where a void-returning callback is expected: void means that the
caller ignores that return, not that the function cannot produce it.

**Application:** A generic identity-preserving collection helper can be useful; a single
concrete domain transformation may need no generics. For async callbacks, verify who owns
the returned promise: a void-accepting API may discard it. See the
[typed linting reference](typescript-eslint.md) for detection and its limitations.

## Object types and mutation

Source: [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html).

Optional properties can be absent; reads must account for undefined. Readonly restricts
writes through a particular type, but does not guarantee deep or runtime immutability.
Aliases can still refer to the same object. Index signatures describe a family of keys,
not proof that a requested key exists.

**Application:** If caller-owned input must remain unchanged, test that behavior directly.
Use readonly inputs to document intent, but do not claim they freeze nested values. Prefer
Map for a dynamic keyed collection when its semantics match the contract; a fixed record
is still appropriate for known fields. Avoid a blanket “Map everywhere” rule.

## Choosing a model

1. List valid states and operations from callers and tests.
2. Encode distinctions that prevent an actual mistake; keep trivial values simple.
3. Preserve null/missing/empty semantics at boundaries.
4. Validate external values before assigning trusted types.
5. Check consumer ergonomics, not just the implementation's successful compilation.

This process is our synthesis. Neither the Handbook nor this skill requires Result,
branded IDs, a schema package, dependency injection or a functional-only architecture.

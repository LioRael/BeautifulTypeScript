# Airbnb JavaScript Style Guide — applicable parts

Source: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).
Owner: Airbnb contributors. Reviewed: 2026-10-27; rolling repository edition.
Read for JavaScript readability and consistency choices (TS07). It is a company/community
style guide, not a TypeScript type-system reference or universal runtime specification.

## Applicable recommendations

- Prefer const for bindings that are not reassigned; use let when reassignment is needed.
- Avoid mutating parameters and use clear, descriptive names.
- Prefer explicit equality and readable control flow.
- Its iteration policy favors higher-order collection methods over loops.
- Its module policy prefers a default export for a module with a single export.

Read the original “References”, “Functions”, “Modules”, “Iterators and Generators”, and
“Naming Conventions” sections for their rationale and exceptions.

## How this project selects from it

| Situation | Our decision |
|---|---|
| Existing project formatter | Follow it; do not recode punctuation or whitespace during a behavior fix. |
| New internal transformation | Choose a loop or collection helper based on clarity and semantics. |
| Caller-owned mutable data | Establish whether mutation is allowed; test it rather than imposing deep cloning. |
| Existing single default export | Preserve API compatibility unless a scoped API change is intended. |
| TypeScript-specific API question | Consult the Handbook/declaration guidance rather than infer a TS rule from JavaScript style. |

These are project decisions, not Airbnb requirements. A pipeline of map/filter operations
can communicate a pure transformation clearly. A straightforward loop can be clearer for
early exit, sequential asynchronous work, or accumulating a result with explicit errors.
Neither form alone proves better performance; compare actual inputs if speed matters.

## Conflicts and exclusions

Google's named-export preference conflicts with Airbnb's single-default-export preference.
We defer to the consuming framework and established API. Airbnb's loop restrictions are
not adopted as a universal rule. We do not install eslint-config-airbnb automatically or
claim its configuration matches the tested typescript-eslint stack. Consult
[style decisions](style-decisions.md) before turning style feedback into a review finding.

## Evidence to request

A mutation finding should identify a caller whose input changes unexpectedly. A naming
finding should explain real ambiguity at a call site. An iteration rewrite should retain
ordering, failure behavior and resource usage. Do not report personal taste as a defect.

---
name: typescript-best-practices
description: Write and refactor TypeScript with project-aware contracts, types, async ownership and a concrete simplification pass. Use when implementing TypeScript changes.
---

# TypeScript best practices

Beautiful code makes the required behavior easy to see. Optimize for the reader's
mental work: fewer independent policies, branches, state variables and indirections,
while preserving correctness. More validation, types or abstractions are not improvement
by themselves. Neither are fewer lines at the expense of meaning.

## 1. Find the existing contract and the smallest place to change it (TS01)

Read project instructions, package scripts, relevant tsconfigs, the implementation and
its callers. Establish the runtime, public API, trust boundary, failure convention,
ownership and ordering that matter to this change. Inspect commands before running them.

Before inventing a helper, search for the project's existing policy or operation:
normalization, sorting, rounding, parsing, retries and error translation are behavior,
not incidental syntax. Reuse that behavior where it applies. Do not consolidate two
operations just because their code looks alike if their contracts differ.

For an existing feature, decide whether this adds behavior or replaces it. Trace the
entrypoint, policy owner and consumers before adding another path. A replacement should
update its owner and callers; preserve old behavior only for a supported compatibility need.

Choose the narrowest implementation that satisfies the request and fits nearby code.
Preserve exported signatures and existing framework/tool conventions unless the task
requires changing them. A missing config is not a request to reconfigure the project.
When a new lint setup is requested, default to typed Oxlint; retain framework/ESLint rules
without verified equivalents. See [lint setup](references/typescript-eslint.md).

## 2. Implement the behavior directly (TS02–TS05)

Use the relevant constraints below, not a requirement to apply every technique.

| Decision | Starting point | Preserve |
|---|---|---|
| Trusted internal data | Use its established type directly | Real optionality and ownership; no new unknown/parser round trip |
| Untrusted JSON, storage or I/O | Reuse the boundary parser; otherwise check only the required shape and domain | No assertion masquerading as validation; reject malformed data using the existing error model |
| Absent value | Default only the states the contract calls absent | Zero, false, empty string, null and omission can mean different things |
| Related states | A discriminated union when fields depend on the state | Existing API compatibility; do not introduce a state machine for independent fields |
| Types and helpers | Infer obvious locals; express meaningful relationships | Public contracts, callback arity, null/undefined and mutation semantics |
| Errors | Preserve the existing failure channel and useful error identity | No empty catches, invented success, unconditional retries or required Result wrapper |
| Async work | Give completion, rejection and cancellation an owner | Ordering, stop-on-failure, partial effects and cleanup |
| Module/runtime | Match the loader and host that actually ship | Browser/server separation, extensions, exports and emitted declarations |

At an unknown boundary, distinguish object from null/array; narrow array elements before
property use. A guard accepting unknown can do this directly; an extra unknown[] alias is
not inherently necessary. Type assertions, satisfies and interfaces do not validate data.
Keep required range, integer or safe-integer checks; do not add them without a domain need.

For ordered work that stops on failure, await a loop. For independent work, use the
project's concurrency policy. async forEach does not wait; void does not handle rejection;
Promise.all does not cancel siblings. A timeout race does not stop the underlying work.
Use the existing cleanup mechanism, commonly try/finally. Preserve synchronous versus
asynchronous failure behavior where callers observe it.

Resolve type mismatches at their source: construct a complete value, retain a real
discriminant, or narrow the boundary. Do not silence them with any, double assertions or
suppressed checks merely to finish. Keep justified interop assertions local and explained.

Do not force interface/type, class/function, enum/union, schema or error-model migrations.
Use generics for a real relationship, not decoration. Do not widen a concrete API just to
make a helper reusable. Readonly is a type-level permission, not a deep runtime freeze.

## 3. Read the diff once for unnecessary work (TS07, TS08)

After a nontrivial implementation, use the relevant examples in
[the simplification pass](references/simplification.md). For repeated feature changes,
replacements or type-error work, also use [maintenance decisions](references/maintenance.md)
(TS10): one policy owner, no superseded runtime path without a consumer, and no extra
synchronized state without an independent lifetime. Review the code you changed:

- **Repeated decisions:** Is normalization, selection or another policy calculated more
  than once? Give the result a meaningful name and use it consistently when its lifetime
  permits. Reuse an existing policy rather than restating it in a new layer.
- **Repeated state:** Can an intermediate variable, flag, temporary collection or
  pass-through helper disappear without hiding order, ownership or a useful domain name?
- **Repeated branches:** Can paths with the same meaning share one expression or outcome?
  Keep distinctions that affect errors, effects, diagnostics or caller behavior.
- **Unsupported machinery:** Which requirement needs each added guard, fallback, catch,
  copy, type parameter or abstraction? Remove it if there is no such requirement.
- **Cost moved elsewhere:** Did a shorter expression hide new helpers, repeated scans,
  side effects, casts or dependencies? Compare the whole implementation, not one excerpt.

For a replacement, follow references to retired options, branches, exports, tests and
dependencies. Finish the authorized cutover; distinguish public compatibility and dynamic
registration from genuinely obsolete internal code. Keep unrelated cleanup out of the diff.

Keep a change only when it makes the actual behavior easier to follow. Do not golf code,
rewrite unrelated functions or introduce a framework to finish this pass. Keep necessary
boundary checks and ownership copies. Stop when further edits are merely preferences.

Comments should explain an invariant or tradeoff, not narrate syntax. The pass is work to
do, not a checklist to paste into the answer. For a tiny edit, a quick diff read is enough.

## 4. Verify the contract, then report the evidence (TS09)

Use the repository's affected-package typecheck, lint, tests and build as applicable.
Make sure they include the changed files. Inspect newly added suppressions, exclusions
and changed expectations as part of the diff. Test a changed behavior or regression, including
relevant failure/ownership/order cases; do not mirror each implementation line with a test.

For packages, check the emitted entrypoint and a consumer of declarations when affected.
Compiler lib types and TS paths do not provide runtime APIs or rewrite emitted imports.
Node execution does not establish Bun, Deno or browser support.

Measure before making performance claims. Compare equivalent outputs and representative
inputs, retain samples and report noise/regressions. A microbenchmark is not evidence that
the skill improves code. Report actual results and material gaps concisely; baseline
failures and unavailable runtimes are not passes. Do not weaken checks to obtain a pass.

## Reference library — read only what the change needs

| When deciding | Read |
|---|---|
| Replacing behavior, repeated maintenance, type escapes or duplicated state | [Maintenance decisions](references/maintenance.md) |
| Simplifying a diff without changing its contract | [Simplification examples](references/simplification.md) |
| Module organization, inference, naming or assertions | [Google TypeScript Style Guide](references/google-typescript-style-guide.md) |
| Narrowing, state models, generics or mutation | [TypeScript Handbook](references/typescript-handbook.md) |
| Public callbacks, overloads or declaration files | [Declaration Do's and Don'ts](references/typescript-declaration-dos-and-donts.md) |
| Promise diagnostics, ESLint or Oxlint setup | [Lint setup and migration](references/typescript-eslint.md) |
| Host globals, strictness, modules or emitted output | [Compiler configuration](references/typescript-compiler-configuration.md) |
| JavaScript readability and local style | [Airbnb JavaScript Style Guide](references/airbnb-javascript-style-guide.md) |
| Guides disagree, or a rule ID needs explanation | [Style decisions and rule map](references/style-decisions.md) |
| A small parser or sequential writes | [Boundary and async examples](assets/patterns.ts) |

The guides are bundled original digests with source links, applicability and project
decisions, not copies. Simplification examples are this project's guidance, not rules
attributed to those guides. This skill is independently usable.

The evals/ directory contains maintainer cases and graders. It is not additional task
guidance; do not read it while applying this skill to a user project.

---
name: typescript-best-practices
description: Write and refactor TypeScript using project-aware type, runtime, async and module practices. Use when implementing TypeScript changes.
---

# TypeScript best practices

## Establish the project contract (TS01)

Read package.json, lockfile, tsconfigs, lint/test scripts, applicable instructions and
nearby code. Identify application versus library, minimum runtime, ESM/CJS, bundler,
framework-generated config, and package manager. Keep the project's versions. A missing
config is not authorization for a repository-wide cleanup.

## Make the smallest coherent change

- **TS02:** Treat network, storage, CLI and cross-process data as untrusted. Accept
  `unknown`, validate the properties actually needed, then narrow. Reuse existing parsing
  code or schemas; a small guard is fine. Validate once at the trust boundary, not at
  every internal function. `as T`, non-null assertions and `satisfies` do not parse data.
- **TS03:** Distinguish absent, undefined and null when the API does. Use discriminated
  unions for real alternatives, primitives for ordinary values, and inference for local
  variables. Annotate exported contracts where it clarifies the API. Preserve existing
  exception/return conventions. Do not turn every error into a Result or every ID into a
  branded type. Readonly types do not freeze runtime objects.
- **TS04:** Await, return, or explicitly supervise promises. `void promise` suppresses
  a warning but does not catch rejection. Avoid async forEach; use sequential iteration
  when order matters, or bounded concurrency for independent I/O. Preserve cancellation,
  cleanup and error causes; do not swallow failures to make lint pass. Promise.all does
  not cancel sibling work. Do not wrap synchronous work in async without an API reason.
- **TS05:** Keep server APIs out of browser bundles. Match import extensions, exports and
  resolution to the real loader. TS paths do not rewrite runtime imports or add polyfills.
  Check declaration output for libraries and consumer entrypoints, not only app builds.
- **TS07:** Prefer ordinary functions and data over a new abstraction until repeated
  needs justify one. Reuse the existing framework's data fetching and lifecycle patterns.
  Follow its lint/format setup. Isolate unavoidable `any` at compatibility boundaries and
  document why; do not scatter suppression comments to conceal mismatches.
- **TS08:** First establish correctness and realistic input sizes. Measure an identified
  bottleneck before introducing caching, concurrency or a new algorithm.

## Validate and hand back (TS09)

Use the repository's typecheck, lint, test and build commands for affected packages.
Check error/empty cases and public behavior, plus runtime imports when modules changed.
Do not claim browser/Bun/Deno support from a Node test. Report changed behavior, commands,
results and unavailable checks. Avoid unrelated fixes merely to obtain a green baseline.

Example request: “Add a typed API client to this existing React app; preserve its fetch
and error conventions and test malformed responses.”

## Reference library — read only what the change needs

| When deciding | Read |
|---|---|
| Module organization, inference, naming or assertions | [Google TypeScript Style Guide](references/google-typescript-style-guide.md) |
| Narrowing, state models, generics or mutation | [TypeScript Handbook](references/typescript-handbook.md) |
| Public callbacks, overloads or declaration files | [Declaration Do’s and Don’ts](references/typescript-declaration-dos-and-donts.md) |
| Promise diagnostics or lint setup | [typescript-eslint](references/typescript-eslint.md) |
| Host globals, strictness, modules or emitted output | [Compiler configuration](references/typescript-compiler-configuration.md) |
| JavaScript readability and local style | [Airbnb JavaScript Style Guide](references/airbnb-javascript-style-guide.md) |
| Guides disagree, or a rule ID needs explanation | [Style decisions and rule map](references/style-decisions.md) |

These are bundled original digests with source links, applicability and project decisions.
They are not copies of the guides. This skill works on its own; follow project constraints
and avoid installing a new architecture, Result type, schema library or formatter by default.

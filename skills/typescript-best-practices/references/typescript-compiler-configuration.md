# Compiler configuration — choose by host and verify the boundary

Microsoft / TypeScript team, [TSConfig reference](https://www.typescriptlang.org/tsconfig/)
and [host-selection guide](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html).
Reviewed 2026-10-27. Official rolling documentation includes newer compiler features;
this repository deliberately tests TS 5.9.3. Check supported options before adoption.
Examples are original, optional and subordinate to framework/project configuration.

## C1. Identify who emits and who loads

The official host-selection guide distinguishes runtime, bundler and library environments.
Our application: answer these questions before changing a compiler flag:

1. Does tsc emit JavaScript, or does a bundler/runtime transform the source?
2. Does the consumer load native ESM, CommonJS or a bundled asset?
3. Are declarations shipped, and which resolution mode do consumers use?
4. Which host APIs actually exist at the minimum supported runtime version?

A server/browser shared core may need two compiler contexts. Keep framework extends and
project references; don't replace them with a generic strict preset.

## C2. Strictness is a set of decisions

| Option / official reference | What it establishes | Our application |
|---|---|---|
| [strict](https://www.typescriptlang.org/tsconfig/strict.html) | Family of strict checks | Review new diagnostics on compiler upgrades |
| [strictNullChecks](https://www.typescriptlang.org/tsconfig/strictNullChecks.html) | Null/undefined distinctions | Preserve boundary absence semantics |
| [noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) | Potentially missing indexed reads | Handle missing key/array element |
| [exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html) | Omission differs from explicit undefined | Model patch/serialization semantics |
| [useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html) | Catch values require narrowing | Preserve arbitrary thrown values |
| [noImplicitOverride](https://www.typescriptlang.org/tsconfig/noImplicitOverride.html) | Explicit overriding methods | Useful for existing inheritance APIs |

noUncheckedIndexedAccess and exactOptionalPropertyTypes are separate opt-ins, not implied
by strict. Stage adoption; don't add assertions everywhere merely to satisfy new checks.

```ts
interface Update { title?: string }
const absent: Update = {};
// @ts-expect-error With exactOptionalPropertyTypes, present undefined is not omitted.
const ambiguous: Update = { title: undefined };
const rows: string[] = [];
// @ts-expect-error With noUncheckedIndexedAccess, element zero may be absent.
const first: string = rows[0];
const safe: string | undefined = rows[0];
```

```ts
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function caller(operation: () => void): void {
  try { operation(); } catch (error) {
    // @ts-expect-error A thrown value need not have a message property.
    const assumed: string = error.message;
    const actual = message(error);
  }
}
```

## C3. Native Node ESM: verify the JavaScript you ship

An illustrative dedicated Node package config (adapt target to minimum Node support):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Pair this with the intended package type/exports. For example, a relative import in a .ts
source may need the future .js suffix because native Node loads emitted JS. A development
loader resolving extensionless source paths does not prove the published entry works.
NodeNext tracks supported Node semantics as TypeScript evolves; a compiler upgrade is
not just a formatting change. A package that ships CJS or direct TS needs a different plan.

```sh
npm run build
node --input-type=module -e "await import('./dist/index.js')"
```

Adapt the path and export conditions. Also compile a separate consumer of emitted declarations.
Inspect package exports/types/packed contents; a working file import alone does not prove
that a package-name import reaches that file.

## C4. Bundler-owned emission: preserve the framework's pipeline

Example for a deliberately separate browser/bundler context:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "strict": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": []
  },
  "include": ["src/**/*.ts"]
}
```

Our application: this config describes one context; it is not a universal web-app recipe.
Some frameworks require generated types, JSX settings, plugins or different module options.
Run their production build. Bundler resolution can accept paths that native Node rejects.
Don't publish those paths unchanged to native Node consumers just because the app builds.

## C5. Target, lib and types answer different questions

[lib](https://www.typescriptlang.org/tsconfig/lib.html) selects API declarations;
[types](https://www.typescriptlang.org/tsconfig/types.html) controls automatically included
ambient type packages. Neither installs an implementation of those APIs. Our application:
keep accidental DOM globals out of a server core, but explicitly include the host typings
that the project requires. Imported packages can still bring their own types.

A downleveled syntax target does not polyfill a new collection or Web API. Test the minimum
runtime, not only the developer's newest Node version. Browser typechecking is not browser
execution; Bun and Deno have additional host/configuration and permission boundaries.

## C6. Resolution aliases, type-only imports and emit

[paths](https://www.typescriptlang.org/tsconfig/paths.html) informs TS resolution without
rewriting emitted specifiers. Our application: verify an alias survives correctly through
the bundler/package loader; don't treat editor navigation as deployment proof.

[verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)
makes type/value import intent significant to emit.
[isolatedModules](https://www.typescriptlang.org/tsconfig/isolatedModules.html) detects
constructs unsuitable for single-file transforms; it does not typecheck each API consumer.
Retain side-effect initialization imports explicitly. Check decorators and legacy emit
before introducing type-import autofixes across an existing codebase.

## C7. Declaration checks, skipLibCheck and workspace projects

[skipLibCheck](https://www.typescriptlang.org/tsconfig/skipLibCheck.html) skips declaration
checking; it cannot repair wrong runtime imports or incompatible library implementations.
Our application: determine whether a failure is a duplicate/incompatible dependency,
upstream declaration issue or local misuse before suppressing it. Report the tradeoff.

[Project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
provide a build graph. Use the repository's actual build mode and generated declarations;
checking one leaf with a generic tsc command may miss the broken consumer. Inspect include,
exclude, files and inherited configs to establish which code was actually checked.
A referenced/imported file can enter a program even when it is not an initial include match.

## C8. Diagnostic workflow and limits

Inspect effective options with the project's compiler and `--showConfig`; inspect file
membership when coverage is doubtful. Keep the failing invocation and diagnostic identity.
A noEmit pass establishes static checks for that config, not emitted-file availability.
For a library, test runtime exports and declaration consumers; for an app, use the real
build and host smoke test. Preserve failure/empty/unrun distinctions in the final report.

These are selected production decisions, not a catalog of every compiler switch. JSX,
legacy decorators, import-attribute policies and direct-TS host loaders require their own
framework/runtime/version documentation. The optional configs in this repository remain
examples, not an instruction to replace consumer configuration.

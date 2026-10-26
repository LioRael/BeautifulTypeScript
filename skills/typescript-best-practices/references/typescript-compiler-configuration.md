# TypeScript compiler configuration — digest

Owner: Microsoft / TypeScript team. Reviewed: 2026-10-27; rolling official documentation.
Read for project boundaries, strictness, module loading and output (TS01, TS05, TS09).
Repository examples use TS 5.9.3; inspect your compiler's supported options before adopting.

## Strictness is several decisions

Source: [TSConfig reference](https://www.typescriptlang.org/tsconfig/).

strict enables a family of checks. noUncheckedIndexedAccess and exactOptionalPropertyTypes
are additional opt-ins, not implied by strict. The former exposes potentially absent
indexed values; the latter distinguishes an omitted optional property from explicitly
assigning undefined unless the declared type permits it. types limits automatically
included ambient type packages; lib selects built-in declarations. noEmit suppresses
compiler output. paths guides resolution and does not rewrite emitted imports.

**Application:** A migration can first fix the boundary that caused the bug without
changing every optional property in the repository. When enabling extra checks, inspect
callers and serialization behavior rather than adding undefined or assertions everywhere.
DOM declarations in a server package can hide accidental browser-global usage. Their
availability in the editor does not establish that the deployment runtime provides them.

## Match the actual loader

Source: [Choosing compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html).

Different runtime environments need separate compiler contexts. Compiled Node projects
need Node-compatible module semantics, including package module kind and runtime import
paths. Bundler projects should describe the bundler's resolution/emit behavior. A
library's consumers can have different constraints from the tool that builds the library.

## Project decision table

| Situation | Start by checking | Evidence before declaring success |
|---|---|---|
| Node ESM output | package type, NodeNext settings, emitted relative imports | Execute built entrypoint on the supported Node version |
| Browser app with bundler | Framework-generated config, DOM libs, actual bundler | Production bundle and browser behavior, including missing host APIs |
| Shared server/browser core | Accidental ambient globals and host imports | Separate compiler contexts plus both runtime adapters |
| Published library | Exports, declaration paths, supported consumers | Compile/import a package consumer outside source-path aliases |
| Bun or Deno target | Host config, permissions, loaders and dependencies | Execute the target's check/test workflow; a Node pass is insufficient |

The table is our verification methodology, not a universal official preset. Preserve
framework config inheritance and package boundaries. The provided recipes are optional;
no script should rewrite a project's tsconfig simply because this skill is installed.

## Common false conclusions

- “The type exists, so the runtime API exists.” A declaration is not a polyfill.
- “Bundler resolution passed, so Node can import it.” Verify emitted paths with Node.
- “The source compiled, so the shipped package works.” Exercise exports/declarations.
- “skipLibCheck fixed it.” It can suppress declaration checking without fixing a runtime
  incompatibility; establish what was actually wrong before choosing that tradeoff.

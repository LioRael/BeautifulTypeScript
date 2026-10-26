# Node ESM release verification

**Conclusion: not ready to ship.** The compiled public entry point fails to load in native Node ESM. Successful build/typecheck scripts do not establish runtime compatibility, and the test/lint scripts provide no coverage.

## Scope and environment

Read `PROJECT.md`, `package.json`, `tsconfig.json`, both source files, and both tooling scripts. Workspace file discovery found no additional task files. Verified on Node **v26.12.1**, npm **11.20.0**, macOS (`darwin`) **arm64**, with preinstalled TypeScript **5.9.3**. No network, package installation, delegation, publishing, global changes, or source/configuration repairs were performed.

Build artifacts were emitted to a temporary workspace directory, `.verify-artifacts`, rather than changing the configured `dist` tree. A copy of the unchanged manifest in that directory allowed package self-reference testing with the original `exports` target. Temporary artifacts were removed after verification; `VERIFY.md` is the only retained addition.

Scope deviation: `git status --short`, invoked from the workspace, unexpectedly resolved an enclosing repository and listed paths outside the workspace. No listed files were opened or used; no further Git commands were run. This command should have been omitted under the workspace-only restriction.

## Commands and observed results

| Command | Exit | Evidence |
| --- | --- | --- |
| `node --version` | 0 | `v26.12.1` |
| `npm --version` | 0 | `11.20.0` |
| `node -p 'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch})'` | 0 | Node v26.12.1, darwin, arm64 |
| `node_modules/.bin/tsc --version` | 0 | `Version 5.9.3` |
| `npm run typecheck` | 0 | `tsc --noEmit`; no diagnostics under the configured Bundler resolution |
| `npm run lint` | 0 | `Lint complete: 0 files inspected (pending configuration)` |
| `npm test` | 0 | `Test scaffold: 0 tests executed` |
| `npm run build -- --outDir .verify-artifacts/dist` | 0 | Compiler emitted JavaScript and declarations |
| `cat .verify-artifacts/dist/index.js .verify-artifacts/dist/index.d.ts` | 0 | Both retain `export { greeting } from './core';` |
| `node --input-type=module -e 'await import("./.verify-artifacts/dist/index.js")'` | 1 | `ERR_MODULE_NOT_FOUND`: cannot find `.verify-artifacts/dist/core` imported from `index.js` |
| `node_modules/.bin/tsc --noEmit --module NodeNext --moduleResolution NodeNext` | 2 | `src/index.ts(1,26): error TS2835`: relative ESM imports need explicit extensions; suggests `./core.js` |
| `cp package.json .verify-artifacts/package.json` | 0 | Created unchanged manifest fixture |
| `(cd .verify-artifacts && node --input-type=module -e 'await import("eval-verify")')` | 1 | Package export resolves to emitted `index.js`, then fails with the same `ERR_MODULE_NOT_FOUND` for `dist/core` |

The following independent implementation smoke check exited 0 and printed `PASS: 2 direct-core greeting assertions (public entry bypassed)`:

```sh
node --input-type=module -e 'import assert from "node:assert/strict"; import { greeting } from "./.verify-artifacts/dist/core.js"; assert.equal(greeting("Ada"), "Hello Ada"); assert.equal(greeting(""), "Hello "); console.log("PASS: 2 direct-core greeting assertions (public entry bypassed)")'
```

This verifies only two direct implementation cases, not successful public API consumption. npm script invocations also emitted an ambient `Unknown user config "home"` warning; configuration was not inspected or changed.

An initial Node-based cleanup attempt failed with `mise ERROR Operation not permitted (os error 1)` and left the temporary artifacts in place. `/bin/rm -r .verify-artifacts` with shell login disabled then exited 0; a final workspace-only file listing confirmed their removal.

## Release blockers and coverage gaps

1. **Public ESM entry cannot load.** `src/index.ts:1` re-exports from `./core`. With `module: ESNext` and `moduleResolution: Bundler`, TypeScript accepts and preserves that specifier. Native Node ESM does not infer `.js`, so the existing `exports: "./dist/index.js"` leads to a runtime failure. The declaration entry preserves the same specifier; the stricter NodeNext source check also fails. No repair was made.
2. **Tests are a scaffold.** The test script only prints a message; it performs no assertions, including no build/import or package-consumer checks. Two manual core assertions are insufficient regression coverage.
3. **Lint is a scaffold.** The lint script inspects no files; its exit status is not evidence of lint compliance.
4. **Publishing is not configured as a public release.** The manifest has `private: true`, so npm publication is intentionally blocked. It also declares no version or supported Node engine range. These are additional release-policy gaps if public npm distribution is intended; they do not explain the runtime import failure.
5. **Distribution and type-consumer coverage remain incomplete.** No packed tarball, installed consumer, or external TypeScript declaration consumer was tested. The temporary self-reference probe exercises the existing exports map but is not an installed-package test. The exact default `npm run build` destination was not exercised; only the output directory was overridden.

## Untested hosts

Only the local macOS arm64 Node v26.12.1 host was exercised. Other Node versions (including Node 22 and 24), Linux, Windows, x64, browsers, bundlers, Deno, Bun, and CommonJS consumers were not tested. No compatibility claim is made for those hosts. No supported-host matrix is declared in the supplied manifest.

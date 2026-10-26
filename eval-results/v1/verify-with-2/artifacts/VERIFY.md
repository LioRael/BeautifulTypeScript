# Node ESM release verification

**Conclusion: not ready to ship for Node ESM.** The emitted public JavaScript entrypoint cannot load, and the emitted public declarations fail in a NodeNext consumer. Successful project scripts do not establish readiness: lint inspects zero files and tests execute zero tests.

## Scope and environment

Verification performed on 2026-10-27, inside this workspace only. Read PROJECT.md, package.json, tsconfig.json, both source files, both script bodies, supplied-skill/SKILL.md and its verification matrix. Applied the supplied TypeScript verification skill. No network, package installation, delegation, publication, global-setting edits or source/config repairs occurred.

Observed tools: Node v26.12.1, npm 11.20.0, preinstalled TypeScript 5.9.3. No lockfile or supported Node version range is supplied in the workspace. package.json declares `type: module`, `exports: ./dist/index.js`, and `private: true`. If npm publication is intended, `private: true` also prevents it; publication was not attempted.

Build output and temporary fixtures were isolated in `.verify-artifacts` inside this workspace and removed after verification. The build used the real project script with only the output directory overridden, preserving module resolution and emission settings. Existing project files were not changed; VERIFY.md is the deliverable.

## Commands and actual results

All commands ran from the workspace root. Exit statuses below belong to the individual checks, not to a later successful shell command.

| Command | Exit | Evidence and limits |
| --- | --- | --- |
| `node --version`; `npm --version`; `./node_modules/.bin/tsc --version` | 0 each | Versions above. |
| `./node_modules/.bin/tsc --showConfig` | 0 | Both src/core.ts and src/index.ts are inputs. ES2022 target/lib, ESNext modules, Bundler resolution, strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, declarations enabled, types empty. No Node module-resolution enforcement. |
| `npm run typecheck` | 0 | Real `tsc --noEmit` succeeds for the two source files under the project Bundler configuration. Does not validate Node ESM resolution. |
| `npm run lint` | 0 | Exact output: `Lint complete: 0 files inspected (pending configuration)`. Coverage gap, not lint validation. |
| `npm test` | 0 | Exact output: `Test scaffold: 0 tests executed`. Coverage gap, not behavior validation. |
| `mkdir .verify-artifacts` | 0 | Temporary workspace output directory. |
| `npm run build -- --outDir .verify-artifacts/dist` | 0 | Executes `tsc --outDir .verify-artifacts/dist`; freshly emits index.js, core.js and both declarations. |
| `cat .verify-artifacts/dist/index.js .verify-artifacts/dist/index.d.ts .verify-artifacts/dist/core.js .verify-artifacts/dist/core.d.ts` | 0 | Both index artifacts contain `export { greeting } from './core';`. Core JS and declaration are present. |
| `node --input-type=module -e "await import('./.verify-artifacts/dist/index.js')"` | 1 | `ERR_MODULE_NOT_FOUND`: cannot find `.verify-artifacts/dist/core` imported from index.js. Node does not infer the `.js` extension. |
| `cp package.json .verify-artifacts/package.json` | 0 | Identical package metadata staged beside the emitted dist to exercise exports through package self-reference. |
| `node .verify-artifacts/runtime.mjs` | 1 | Fixture imports `greeting` from `eval-verify`; same `ERR_MODULE_NOT_FOUND`. The public exports mapping reaches the failing index.js. Greeting assertion never executes. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext .verify-artifacts/consumer.mts` | 2 | TS2835 in dist/index.d.ts: explicit extension required, suggests `./core.js`. Also TS2578: unused expected-error directive at the numeric-call test; broken export prevents this fixture from establishing the public parameter constraint. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext .verify-artifacts/control.mts` | 0 | Control imports emitted core declaration via `./dist/core.js`; string return assignment and expected rejection of numeric argument both validate. Rules out a universally broken compiler/fixture setup. |
| `node --input-type=module -e "import assert from 'node:assert/strict'; const {greeting} = await import('./.verify-artifacts/dist/core.js'); assert.equal(greeting('Ada'), 'Hello Ada'); assert.equal(greeting(''), 'Hello '); console.log('2 direct-core assertions passed');"` | 0 | `2 direct-core assertions passed`. Internal module happy path and empty string work; bypasses public exports, so does not establish package usability. |

npm commands emitted an additional warning: `Unknown user config "home"`. No configuration was inspected outside the workspace or changed to address it; the warning did not stop these checks.

Two initial verification probes were invalid and are not counted as library failures: importing an uncreated `.verify-artifacts/consumer.mjs` exited 1 with missing-fixture ERR_MODULE_NOT_FOUND, and a compiler invocation with `--types ''` exited 1 with TS6044 (`types` expects an argument). The corrected runtime.mjs and compiler commands above ran subsequently and reproduced the actual library failures.

## Consumer fixtures

`runtime.mjs`:

```js
import { greeting } from 'eval-verify';
if (greeting('Ada') !== 'Hello Ada') throw new Error('Unexpected greeting');
```

`consumer.mts`:

```ts
import { greeting } from 'eval-verify';
const result: string = greeting('Ada');
// @ts-expect-error Public API requires a string.
greeting(42);
```

`control.mts` used the identical type assertions with its first line replaced by:

```ts
import { greeting } from './dist/core.js';
```

## Failures and minimal follow-up

1. **Runtime blocker — src/index.ts:1.** The extensionless `./core` re-export survives emission. Node ESM cannot resolve it, so consumers cannot import the library. Minimal proposed remedy: use `./core.js` in the source re-export, then rebuild and rerun public runtime and declaration checks. No repair was made.
2. **Declaration blocker — emitted index.d.ts:1.** The same extensionless path is invalid for NodeNext consumers (TS2835). Bundler resolution lets the project typecheck pass despite this. Consider Node-compatible compiler settings or a required NodeNext consumer check to prevent recurrence.
3. **Verification coverage gaps — scripts/lint.mjs:1 and scripts/test.mjs:1.** Both are logging-only placeholders. Configure actual lint scope and behavioral tests, including built public-entrypoint imports and a declaration consumer. Current exit-zero scripts provide no such protection.

These are failures observed in the supplied snapshot. There was no supplied change baseline, so introduced versus pre-existing attribution is unknown.

## Unverified boundaries

Only the available Node v26.12.1 host ran. Other Node versions (including any intended LTS minimum), other operating systems/architectures, browsers, Bun and Deno were not tested; no cross-host claim is supported. Browser/Bun/Deno support is not declared by PROJECT.md.

No installed tarball or separate external application was tested. Package self-reference exercises the copied exports map and fresh artifacts, but is not an installation/packaging test. The default dist output location was not populated; only output-directory-redirection was used to preserve project files. No package publish, pack lifecycle, CI or integration checks were run. Public API runtime malformed/null/missing-input behavior and exception conventions are not specified or covered by the scaffold; direct-core assertions cover only two string cases. No security or exhaustive correctness claim is made.

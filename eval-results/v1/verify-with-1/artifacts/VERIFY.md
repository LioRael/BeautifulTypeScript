# Node ESM release verification

**Conclusion: not ready to ship for Node ESM.** The newly built public entrypoint fails to import, and its emitted declarations fail a NodeNext consumer check. Successful source typechecking and build do not establish release readiness.

## Scope and method

Verification performed on 2026-10-27, applying `supplied-skill/SKILL.md` and its bundled verification matrix. Read `PROJECT.md`, `package.json`, `tsconfig.json`, both source files and both script bodies. No other task files or lockfile appeared in the workspace file listing (excluding preinstalled node_modules). No source, configuration, dependencies or existing project files were edited. No network, package installation, delegation, publication or global-setting changes were used.

Host: Node **v26.12.1**, npm **11.20.0**, TypeScript **5.9.3**, macOS (`darwin`) **arm64**. Compiler version matches package.json. Effective config includes exactly `src/core.ts` and `src/index.ts`, strict checking, ES2022 target, ESNext modules, Bundler resolution, declaration emit, and no ambient types.

Build output was redirected into the initially absent `.verify-artifacts/dist` to avoid changing the project's normal output. This used the actual build script and compiler configuration with only an output-directory override. The directory contained fresh output from this verification, not pre-existing artifacts. A copy of the unchanged package.json alongside that output preserved the package's `type` and `exports` settings. A temporary consumer used a local `node_modules/eval-verify` symlink to that staged package. All temporary artifacts were removed after checking; only this report remains as a deliverable.

## Commands and observed results

Commands ran from the workspace root. Exit statuses below are individual tool results (the three npm checks were rerun individually to capture their statuses).

| Command | Exit | Actual evidence / limitation |
| --- | ---: | --- |
| `node --version` | 0 | v26.12.1 |
| `npm --version` | 0 | 11.20.0 |
| `node_modules/.bin/tsc --version` | 0 | Version 5.9.3 |
| `node_modules/.bin/tsc --showConfig` | 0 | Effective configuration and two source inputs confirmed as above. |
| `npm run typecheck` | 0 | Source checks pass under Bundler resolution; this does not check Node ESM resolution. |
| `npm run lint` | 0 | Prints `Lint complete: 0 files inspected (pending configuration)`. No lint coverage. |
| `npm test` | 0 | Prints `Test scaffold: 0 tests executed`. No test coverage. |
| `npm run build -- --outDir .verify-artifacts/dist` | 0 | Fresh `index.js`, `core.js`, `index.d.ts`, `core.d.ts` emitted. |
| `cat .verify-artifacts/dist/index.js .verify-artifacts/dist/index.d.ts .verify-artifacts/dist/core.js .verify-artifacts/dist/core.d.ts` | 0 | Both index files retain `export { greeting } from './core';`. Core JS/declaration exist. |
| `node --input-type=module -e "await import('./.verify-artifacts/dist/index.js')"` | 1 | `ERR_MODULE_NOT_FOUND`: cannot find `.verify-artifacts/dist/core` imported by index.js. |
| `node .verify-artifacts/consumer/smoke.mjs` | 1 | Bare package import through unchanged `exports` also fails with the same `ERR_MODULE_NOT_FOUND`; assertion never executes. |
| `node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext .verify-artifacts/consumer/public.mts` | 2 | `dist/index.d.ts(1,26): error TS2835`: relative ESM imports need explicit extensions; suggests `./core.js`. |
| Same compiler command with `.verify-artifacts/consumer/control.mts` | 0 | Clean consumer directly importing emitted core.js compiles. Confirms compiler setup works independently of the failing public declaration. |
| `node --input-type=module` with the control script below on stdin | 0 | Two runtime assertions pass when bypassing the public entrypoint; printed host information confirms darwin/arm64/v26.12.1. |

Temporary public consumer (`public.mts`):

```ts
import { greeting } from 'eval-verify';
const result: string = greeting('Ada');
```

Clean consumer (`control.mts`):

```ts
import { greeting } from '../dist/core.js';
const result: string = greeting('Ada');
```

Package runtime smoke (`smoke.mjs`):

```js
import { greeting } from 'eval-verify';
import assert from 'node:assert/strict';
assert.equal(greeting('Ada'), 'Hello Ada');
```

Runtime control script:

```js
import assert from 'node:assert/strict';
import { greeting } from './.verify-artifacts/dist/core.js';
assert.equal(greeting('Ada'), 'Hello Ada');
assert.equal(greeting(''), 'Hello ');
console.log('Direct core control: 2 assertions passed; bypasses public exports');
console.log(JSON.stringify({platform:process.platform,arch:process.arch,node:process.version}));
```

## Concrete failures and next actions

1. **Public JavaScript entrypoint is unusable in native Node ESM.** `src/index.ts:1` uses `./core`, which is preserved in emitted index.js. Node requires an explicit extension for this relative file import. The existing `exports: "./dist/index.js"` reaches the failing entrypoint. Minimal proposed remedy: change the source specifier to `./core.js`, rebuild, and rerun public runtime and consumer checks. No fix was applied.
2. **Public declarations fail native Node TypeScript consumers.** The same extensionless export in emitted index.d.ts triggers TS2835 under NodeNext. The direct-core declaration control passes. The specifier remedy above should address both outputs, but remains unverified until implemented and rebuilt.
3. **Build-time resolution does not enforce the intended host boundary.** `tsconfig.json` uses Bundler resolution, allowing the failing path through typecheck/build. Consider NodeNext module/resolution settings for a Node ESM package, or maintain a required native Node runtime and NodeNext declaration consumer check. This is a recommendation, not an applied change.
4. **Lint/test scripts are placeholders.** `scripts/lint.mjs:1` and `scripts/test.mjs:1` only log messages. Configure real source linting and behavior tests; their current zero exit statuses are not quality evidence.

All failures were reproduced against unchanged supplied sources/configuration. There is no prior revision comparison, so introduced-versus-pre-existing attribution is unknown.

## Coverage gaps, untested hosts and operational limits

- Only the installed macOS arm64 Node v26.12.1 host ran. Other Node versions (including LTS releases), Linux, Windows and other architectures were not tested. No Node support range is declared via `engines`.
- Browsers, Bun, Deno and CommonJS consumers were not tested; project instructions identify Node ESM as the target. No cross-host support is established.
- The normal `dist` location was not written. The staged build exercises identical emitted relative paths and unchanged package exports; an installed archive, pack contents, registry metadata and publication workflow were not tested. package.json has `private: true`, so npm publication is disabled as supplied; this is relevant if public npm distribution is intended.
- Public API behavior cannot be exercised because its import fails. Direct-core controls cover only a named string and an empty string. Malformed/missing/null/non-string input and other foreign-input behavior were not tested; no runtime validation contract was supplied. No async API is present.
- npm emitted `Unknown user config "home"` warnings; commands completed. No external configuration was inspected or changed.
- A later set of login-shell consumer/control attempts exited 1 with `mise ERROR Operation not permitted (os error 1)` before useful checks ran. These attempts are not counted as library failures or passes. Rerunning with tool option `login: false` used the available Node executable and produced the individual consumer/control results above. No tool installation or global change was needed.

The runtime and declaration failures are sufficient release blockers. Lint/test coverage must also be established before treating these scripts as release evidence.

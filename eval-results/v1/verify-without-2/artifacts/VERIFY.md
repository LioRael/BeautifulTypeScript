# Node ESM release verification

## Conclusion

**Not ready to ship for Node ESM.** The compiled public entry point cannot load in native Node ESM. Both a direct import of the emitted entry and an import through the package's `exports` fail with `ERR_MODULE_NOT_FOUND`.

Verified locally on 2026-10-27 with Node v26.12.1, npm 11.20.0, TypeScript 5.9.3, macOS (`darwin`) arm64. Read PROJECT.md, package.json, tsconfig.json, both source files, and both tooling scripts. The workspace file inventory contained no additional task files. No network, installs, delegation, publication, or global configuration changes were used.

## Commands and observed results

| Command | Exit | Actual result |
| --- | --- | --- |
| `node --version` | 0 | `v26.12.1` |
| `npm --version` | 0 | `11.20.0` |
| `./node_modules/.bin/tsc --version` | 0 | `Version 5.9.3` |
| `npm run typecheck` | 0 | Configured `tsc --noEmit` passes. |
| `npm run lint` | 0 | `Lint complete: 0 files inspected (pending configuration)` |
| `npm test` | 0 | `Test scaffold: 0 tests executed` |
| `npm run build -- --outDir "$fixture/dist"` | 0 | JavaScript and declarations emitted successfully. |
| `node --input-type=module -e "$smoke" "$fixture/dist/index.js"` | 1 | `ERR_MODULE_NOT_FOUND`: cannot find emitted `dist/core` imported from `dist/index.js`. |
| `node --input-type=module -e "$smoke" "$fixture/dist/core.js"` | 0 | `Import and greeting passed`. |
| `node "$fixture/consumer.mjs"` | 1 | Package-name import follows `exports` and fails with the same missing `dist/core` error. |
| `./node_modules/.bin/tsc --noEmit --module NodeNext --moduleResolution NodeNext` | 2 | TS2835 at `src/index.ts(1,26)`: relative ESM imports need explicit extensions; suggests `./core.js`. |
| `node -p 'JSON.stringify({node:process.version,platform:process.platform,arch:process.arch})'` | 0 | `{"node":"v26.12.1","platform":"darwin","arch":"arm64"}` |

The build used an isolated temporary directory inside this workspace, created with Node's `mkdtempSync(resolve('.verify-node-esm-'))`. Its actual basename was `.verify-node-esm-UAwwsj`; `$fixture` above denotes its absolute path. Build and smoke commands were executed using `spawnSync`, and each child exit code was recorded independently. The smoke expression was:

```js
const m = await import(process.argv[1]);
if (m.greeting("Node") !== "Hello Node") throw new Error("Unexpected greeting");
console.log("Import and greeting passed");
```

For the package-name check, the unchanged package.json was copied into the fixture beside its built `dist` directory. `consumer.mjs` contained:

```js
import { greeting } from 'eval-verify';
console.log(greeting('Node'));
```

This exercises package self-reference through the real export mapping, but is not an installed-tarball test. All temporary files and directories were removed with explicit file unlinking and directory removal. Existing project files were not modified; VERIFY.md is the only retained output. An initial shell attempt was rejected before execution because its cleanup used `rm -rf`; the successful run used explicit Node filesystem cleanup.

## Concrete release blockers and gaps

- `src/index.ts` exports from `./core`. The build preserves that specifier verbatim in both `index.js` and `index.d.ts`. Native Node ESM does not add the `.js` extension, so the public API fails before `greeting` can run. The direct `core.js` smoke check confirms that the basic function works when loaded explicitly; it does not validate the public entry point.
- `moduleResolution: "Bundler"` allows this specifier during the configured typecheck. Its successful exit is insufficient evidence of Node compatibility. The additional NodeNext check detects the problem without changing configuration.
- Tests and lint are placeholders. Their green exits provide no automated behavioral coverage or lint coverage. Only the explicit `greeting("Node") === "Hello Node"` smoke assertion ran; edge inputs and exception conventions were not tested.
- The manifest sets `private: true`, which prevents npm publication as configured. No supported Node range (`engines`) or package version is declared. If npm publication is intended, release metadata needs separate review. No publication was attempted.
- No tarball packing, clean installation, external consumer declaration/type-resolution test, or CommonJS interoperability check was performed. Declaration output was inspected, but downstream TypeScript compatibility is unproven.
- npm emitted `Unknown user config "home"` warnings. They did not prevent the checks from running; no external configuration was inspected or changed.

## Untested hosts

Only the available macOS arm64 host and Node v26.12.1 were exercised. Linux, Windows, other architectures, other Node versions (including supported LTS versions), browsers, bundlers, Deno, and Bun were not tested. No compatibility claim is made for these hosts. The runtime entry-point failure is already sufficient to block Node ESM release on the tested host.

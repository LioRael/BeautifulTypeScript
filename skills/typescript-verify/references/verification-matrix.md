# TypeScript verification — commands, evidence and gaps

Project-authored verification procedure; reviewed 2026-10-27. Use the owning repository's
commands and versions. No other skill or bundled preset is required.

## Choose checks by the change

| Change | Evidence to collect | A passing result does not prove |
|---|---|---|
| Type model or public API (TS03) | Project typecheck; emitted-declaration consumer; accepted/rejected calls | Runtime input validation |
| Trust boundary (TS02) | Malformed, missing, null and numeric/text boundary cases | Correctness for every possible foreign input |
| Async behavior (TS04) | Rejection, order, cancellation and cleanup tests | Scheduler equivalence in every host |
| Module/configuration (TS01, TS05) | Effective config, production build and runtime imports | That an editor resolution alias works after emit |
| Lint rule configuration (TS09) | Matching diagnostic on a bad fixture; no diagnostics on good fixture | Correct application behavior |
| Performance (TS08) | Equal outputs, comparable inputs, repeated raw samples | Production speed or improved agent quality |
| Formatting/style (TS07) | Existing formatter/lint scope | A reason to rewrite unrelated modules |

## Official sources to resolve tool questions

- [TSConfig reference](https://www.typescriptlang.org/tsconfig/): option meanings. Inspect
  the actual effective config; a base config may be overridden by a package/framework.
- [Choosing compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html):
  environment choices. Separate host-specific checks rather than giving every file all globals.
- [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/): project
  information requirements. A parser error is not the intended negative-test diagnostic.
- [Shared presets](https://typescript-eslint.io/users/configs/) and
  [dependency support](https://typescript-eslint.io/users/dependency-versions/): distinguish
  a supported installed combination from “latest” packages selected independently.
- [Declaration Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html):
  API signature questions. Test a real consumer when changing overloads or callbacks.

These sources describe semantics/tool behavior; this matrix chooses evidence for a task.
Do not cite a style guide as proof that a runtime test was unnecessary.

## Diagnose a misleading green check

If lint exits successfully, establish that the changed TS files were included. If a test
command reports no tests, inspect its path/filter before calling it a pass. If tsc succeeds
but runtime imports fail, inspect emitted paths and package exports. If a negative fixture
fails only because the compiler cannot find a dependency, the intended check is unverified.
Keep deliberately invalid fixtures outside ordinary build targets.

## Report format

For each executed command record the scope, exit/result and limitation. Name skipped
hosts and unavailable dependencies. Separate introduced failures from baseline failures;
use unknown when that distinction cannot be established. Fix the task's issue, not the
verification standard. Do not lower strictness or erase tests merely to make a report green.

## Worked case: green scripts with no evidence

A script can print “0 tests” and exit successfully. A useful report records that as an
empty check, then continues independent runtime verification. Do not rewrite the script
in a verification-only task or claim an empty run passed the requested behavior.

```ts
// @example-run
type Observation = { exitCode: number; checked: number };
function classify(check: Observation): 'failed' | 'empty' | 'executed' {
  if (check.exitCode !== 0) return 'failed';
  return check.checked === 0 ? 'empty' : 'executed';
}
if (classify({ exitCode: 0, checked: 0 }) !== 'empty') throw new Error('Empty scope hidden');
if (classify({ exitCode: 1, checked: 5 }) !== 'failed') throw new Error('Failure hidden');
```

This is an illustration, not a universal log parser. Different runners report counts
differently, and a nonempty run can still miss the changed files or relevant assertions.
Inspect script bodies, filters, includes and the meaningful behavior exercised.

## Worked case: source types pass, published loading fails

A library built with Bundler resolution may emit an extensionless relative import.
Native Node then fails even though typecheck/build were green. Use the actual public entry:

```sh
npm run typecheck
npm run lint
npm test
npm run build
node --input-type=module -e "await import('./dist/index.js')"
```

Run commands independently or record each status; a final successful command must not
mask an earlier failure. Adapt the path and inspect scripts for external side effects.
For a package, add a consumer that imports by package name and uses emitted declarations.
If the public import fails but a private implementation import works, the latter is a
control experiment, not a substitute pass for the public API.

| Observation | Report | Next action |
|---|---|---|
| tsc exits 0 under Bundler | Static check passed for that config | Check native consumer if supported |
| lint prints 0 files | Empty coverage | Inspect glob/ignore/config |
| tests print 0 tests | Empty coverage | Establish actual behavior tests |
| built index import fails | Runtime blocker with error/path | Propose smallest path/emit fix |
| Bun/browser unavailable | Unrun host check | No compatibility claim |

## Worked case: expected failure versus broken tooling

A negative compiler fixture should fail for the intended call/type error. A missing
compiler or parser crash is not evidence that the unsafe call was rejected correctly.
Compile a clean counterpart in the same context and inspect diagnostic identity. For a
public declaration, pin both accepted calls and a rejected misuse:

```ts
declare function openSession(region: string): { id: string };
const id: string = openSession('west').id;
// @ts-expect-error The declaration must not silently accept a numeric region.
openSession(7);
```

This example checks a signature in isolation; a real package test must import its emitted
declaration through the supported resolution path. Report which of those checks actually
ran, including the exact environment and what remains unverified.

## Oxlint verification

For an Oxlint setup, record whether the run is basic or type-aware.
[Type-aware mode](https://oxc.rs/docs/guide/usage/linter/type-aware.html) needs
oxlint-tsgolint and explicit enablement. Assert an intended diagnostic on a broken
fixture and zero diagnostics on its correction; also confirm nonzero file coverage.
A basic Oxlint pass does not prove promise checks ran. During migration, compare
existing rule options and framework coverage before removing ESLint checks.
Keep the project's compiler and production build checks while validating the
separate type engine against the actual project.

## Verify the replacement as well as the addition (TS10)

A green test of a new helper does not establish that consumers use it or that the old
behavior was retired. Choose checks from the actual transition contract:

| Change | Evidence to collect | What not to infer |
|---|---|---|
| Internal policy replacement | Exercise each affected caller at a case that distinguishes old/new behavior | One helper test covers all copied policy |
| Completed runtime cutover | Target caller runs; target failure follows its promised channel; no retired fallback executes | Keeping a source test oracle requires a live production fallback |
| Export/registration removal | Inspect supported entrypoints and built output; test the new consumer and required absence | A search with no matches proves no external/dynamic consumer |
| Type-error repair | Check the producer/consumer relationship and new escapes/suppressions | A green tsc after as any proves the shape is valid |
| Changed tests/config | Explain which contract changed and which guarantees remain checked | Fewer tests or diagnostics necessarily means a cleaner implementation |

For a caller that must now surface a target read failure, use its existing test seam to
make the target reject with a recognizable error and observe any call to the retired
adapter. Assert that the real caller rejects with the required error and that the retired
adapter was not invoked. Test a valid empty result separately: empty success and read
failure must not become indistinguishable. Merely assigning a local variable to the new
helper and testing that variable does not verify application wiring.

Inspect output cleanup when files/exports were removed: emitting into an existing directory
can leave obsolete files behind. Use the repository's scoped clean/build procedure if
needed, then test the artifact a consumer loads. Do not delete an arbitrary shared folder
or infer that a source-only import is a production smoke test.

For newly changed compiler/lint coverage, retain the original diagnostics and establish
why the proposed change is legitimate. Negative type tests and documented library/tool
limitations are valid scoped exceptions; removing a check solely to obtain green output
is not a fix. See [typed-rule caveats](https://typescript-eslint.io/rules/no-unnecessary-condition/#limitations)
and [directive scope](https://typescript-eslint.io/rules/ban-ts-comment/).

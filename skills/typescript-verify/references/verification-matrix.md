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

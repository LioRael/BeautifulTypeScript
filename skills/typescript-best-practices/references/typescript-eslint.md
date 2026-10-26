# typescript-eslint — typed linting and rules

Owner: typescript-eslint maintainers. Reviewed: 2026-10-27; rolling tool documentation.
Read when choosing a lint baseline, diagnosing parser setup or reviewing promises
(TS04, TS09). Rule behavior is versioned tool policy, not the TypeScript language standard.

## Typed analysis setup

Source: [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/).

Type-aware rules need TypeScript project information. A TypeChecked preset and
projectService connect linted files to their TS projects. That analysis has a cost beyond
syntax-only linting. A file outside its intended tsconfig is a configuration problem;
fix its scope rather than assuming every parser failure is a code defect.

**Application:** In a monorepo, inspect which tsconfig owns each package's source and test
files. Keep generated files and JavaScript build scripts under an appropriate separate
scope. Do not enable a broad fallback project just to silence inclusion errors.

## Preset selection

Source: [Shared configs](https://typescript-eslint.io/users/configs/).

recommendedTypeChecked includes the recommended baseline plus type-aware checks.
strictTypeChecked adds more opinionated checks and is not semver-stable in the same way:
rules/options can change outside a major release. Stylistic configurations address
consistency rather than program logic. Presets are starting points and can be customized.

**Project choice:** Our optional recipe starts with recommendedTypeChecked and does not
impose a formatter. Adopt stricter checks through a reviewed change, not as a side effect
of an unrelated feature. Check the installed version's effective config after upgrades.

## Rules that need semantic judgment

| Official rule | Detects | What still needs review |
|---|---|---|
| [no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/) | Promise-valued statements without recognized handling | Who observes completion and rejection? `void` does not catch errors. Our ignoreVoid:false override is stricter than the default. |
| [no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) | Promises in positions such as conditions or void callbacks | Is the receiving API async-aware? If not, give the task an explicit error owner. |
| [no-unsafe-assignment](https://typescript-eslint.io/rules/no-unsafe-assignment/) | Assignments that spread any into trusted values | Move uncertainty into unknown and validate it; do not replace any with an unchecked assertion. |

A lint-clean `.catch()` can still discard a business-critical failure. Likewise, awaiting
all work may change ordering or latency. Choose error handling from the API contract,
then use diagnostics as supporting evidence. These judgments are project methodology.

## Versions and verification

See [supported dependencies](https://typescript-eslint.io/users/dependency-versions/).
This repository tested TypeScript 5.9.3, ESLint 10.13.0 and typescript-eslint 8.72.1.
Do not infer compatibility with every newer compiler. Use the project's lockfile.
For a custom rule override, verify a deliberately failing input and a clean counterpart;
assert the diagnostic identity, not just a nonzero exit that could hide a parser crash.

# Sources and decision rules

Reviewed 2026-10-27. These are concise source summaries plus original applications and
examples, not redistributed guides. See [coverage](GUIDE-COVERAGE.md) for the reading map.
Online documents are rolling editions, not a specification tied to our npm versions.

| ID | Source / owner | Authority and scope | How to apply |
|---|---|---|---|
| G | [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), Google | Organizational style; explicitly tailored to Google's environment, updated on demand | Consider readable names, simple constructs and disciplined assertions; do not impose its tooling or every syntax preference. |
| H | [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html), Microsoft / TypeScript team | Official language documentation | Narrow unknown values with evidence; a declared type does not validate runtime input. |
| D | [Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html), Microsoft / TypeScript team | Official declaration-file/API advice, not a universal app style guide | Prefer primitive types; design meaningful generics and accurate callback signatures. |
| L | [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/) and [rules](https://typescript-eslint.io/rules/), typescript-eslint maintainers | Official documentation of this lint tool, not the TS language standard | Type-aware rules require a TS project and cost additional analysis. Choose a supported compiler/parser combination. |
| C | [TSConfig reference](https://www.typescriptlang.org/tsconfig/), TypeScript team | Official option semantics | Strictness, globals, emit and module resolution must describe the actual project. |
| M | [Choosing compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html), TypeScript team | Official module-environment guidance | Separate host environments; choose resolution for the actual loader/bundler. |
| A | [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript), Airbnb contributors | Community/company JavaScript style, not TypeScript guidance | Consider const, clear names and explicit equality; defer formatting and iteration preferences to the project. |

## Bundled reference library

The detailed digests live inside typescript-best-practices, where an agent can read them
without network access. Each separates source advice from our application decisions:

- [Google TypeScript Style Guide](../skills/typescript-best-practices/references/google-typescript-style-guide.md)
- [TypeScript Handbook](../skills/typescript-best-practices/references/typescript-handbook.md)
- [Declaration Do’s and Don’ts](../skills/typescript-best-practices/references/typescript-declaration-dos-and-donts.md)
- [typescript-eslint](../skills/typescript-best-practices/references/typescript-eslint.md)
- [Compiler configuration](../skills/typescript-best-practices/references/typescript-compiler-configuration.md)
- [Airbnb JavaScript Style Guide](../skills/typescript-best-practices/references/airbnb-javascript-style-guide.md)
- [Conflict decisions](../skills/typescript-best-practices/references/style-decisions.md)

The other skills bundle focused working references, rather than copies of this index:
[review evidence](../skills/typescript-review/references/review-evidence.md),
[port decisions](../skills/typescript-port/references/type-and-runtime-decisions.md),
[port semantics](../skills/typescript-port/references/porting.md), and
[verification matrix](../skills/typescript-verify/references/verification-matrix.md).
All four remain independently installable; none links to another skill as a required local file.

## Conflicts and precedence

Language/runtime facts decide correctness; project instructions and public contracts
constrain changes. Organization-specific preferences do not override those constraints.
Google rejects default exports while Airbnb prefers them for single-export modules;
we preserve the project's API/framework conventions. Airbnb's loop restrictions are not
a universal policy here. See the bundled conflict decisions for the remaining choices.

## Rule map (project-authored synthesis)

| Rule | Decision | Basis | Evidence / enforcement |
|---|---|---|---|
| TS01 | Preserve framework, package manager, host and conventions | G, M; project policy | Read manifests/configs/callers; explain deviations |
| TS02 | Narrow external unknown values before use | H, D | Boundary tests; assertions alone are insufficient |
| TS03 | Model actual states and optionality; avoid gratuitous generics | H, D | Typecheck, API tests; no forced Result or schema library |
| TS04 | Give every async operation an owner and failure path | L | no-floating-promises, no-misused-promises; rejection/order tests |
| TS05 | Align modules, libs and emit with deployment | C, M | Build plus real host/import smoke test |
| TS06 | Preserve observable behavior during ports | Project methodology | Characterization, differential tests, explicit deviations |
| TS07 | Keep changes small and style contextual | G, A; project policy | Review diff; do not report taste as correctness |
| TS08 | Measure before making speed claims | Project methodology | Same workload/results, raw samples and limitations |
| TS09 | Verify actual commands and report gaps | C, L; project methodology | Exit codes, diagnostic fixtures, runtime tests |

## Licensing and attribution

Source links remain owned by their respective authors. This project adds independent
summaries and original examples; it does not relicense upstream text, logos or code.
Consult each upstream repository's current license before copying material. No endorsement
by Google, Microsoft, Airbnb or typescript-eslint is implied. Source review date is not a
claim that every recommendation tracks the newest tool release.

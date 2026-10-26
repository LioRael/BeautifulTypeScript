# Sources and decision rules

Reviewed 2026-10-27. These are original, brief summaries, not redistributed guides.
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

## Conflicts and precedence

User intent and existing project constraints set scope. Actual language/runtime semantics
and observed behavior decide correctness; project conventions decide style. These skills
supply defaults only where the project is silent. Never use a convention to excuse a bug.
Google/Airbnb choices about naming, exports, classes, iteration and punctuation are not
universal requirements. In particular, do not ban loops because Airbnb prefers iterator
helpers; use readable code and measured workloads. `interface` versus `type`, semicolons,
quote style, default exports and enum usage follow the codebase unless a concrete bug exists.
The declaration guide's advice is most directly relevant to public API typings.
`strict` is a starting point, not all possible safety checks; enabling additional checks
in legacy code is a scoped migration. Compiler types cannot enforce trust boundaries.

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

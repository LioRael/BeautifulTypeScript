# TypeScript review — evidence and source selection

Use this reference to turn a concern into a testable finding. It is a project-authored
review method; the linked sources explain language/tool behavior and style boundaries.
It is self-contained when this skill is installed alone. Reviewed 2026-10-27.

## What to inspect and what proves a finding

| Rule | Inspection | Evidence to collect | Source |
|---|---|---|---|
| TS01 | Framework entrypoints, package manager, existing style | A supported workflow that the change breaks | [Compiler environment guide](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html) |
| TS02 | Input trust boundary and subsequent property access | A malformed input reaching an unsafe operation | [Handbook narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) |
| TS03 | Optional callbacks, overloads, return relationships | A valid consumer rejected or invalid call accepted | [Declaration Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) |
| TS04 | Detached task, void callback, cancellation owner | Rejection/order/cleanup reproduction with a real caller | [no-floating-promises](https://typescript-eslint.io/rules/no-floating-promises/), [no-misused-promises](https://typescript-eslint.io/rules/no-misused-promises/) |
| TS05 | Emitted imports, host globals, package exports | Failure in a supported runtime or package consumer | [TSConfig reference](https://www.typescriptlang.org/tsconfig/) |
| TS07 | Style-only diff or unnecessary abstraction | Specific maintenance consequence, otherwise omit | [Google guide](https://google.github.io/styleguide/tsguide.html), [Airbnb guide](https://github.com/airbnb/javascript) |
| TS08 | Claimed speedup | Equal outputs and comparable timing samples | Project measurement methodology |
| TS09 | Claimed verification | Actual files covered, command result and baseline | [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/) and project tests |

Official compiler docs explain semantics; organizational style guides do not override the
project's choices. Do not require another installed skill to resolve these references.

## False-positive controls

- An assertion is not automatically wrong: locate whether earlier validation establishes
  its invariant. Conversely, successful compilation alone does not establish that invariant.
- A floating-promise diagnostic is a lead. Follow the actual rejection/completion owner;
  an intentionally supervised background task can be valid. Do not suggest an empty catch.
- Do not call a default export incorrect merely because Google favors named exports;
  Airbnb differs, and framework entrypoints may require a default.
- A type alias, ordinary exception or handwritten guard is not a defect because another
  project uses interfaces, Result or a schema library.
- In a diff review, show how the change creates or exposes the failure. Existing unrelated
  defects belong outside the requested findings unless their interaction matters.

## Original worked finding

Suppose a changed event callback starts `save()` and its returned promise is discarded.
Reproduce with a save implementation that rejects. Show the event registration line,
the observed unhandled failure and whether the UI misleadingly reports completion.
Recommend the smallest change compatible with the event API: explicitly observe completion
and route errors into the existing UI/logging path. Cite TS04 plus the corresponding lint
rule. Severity depends on actual data/user impact, not the mere presence of async syntax.

Report: priority; file:line; trigger; consequence; source; minimal remedy; checks run.
If you cannot establish the trigger, describe the missing evidence instead of declaring a bug.

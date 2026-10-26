---
name: typescript-review
description: Review TypeScript files or diffs for actionable correctness, API, async and runtime issues. Use for reviews; do not rewrite the project unless asked.
---

# TypeScript review

1. Establish scope and baseline: diff/base revision, affected packages, instructions,
   callers and tests. Read the actual files, not only a patch fragment. Record tool and
   runtime constraints (TS01). Review does not imply permission to change source files.
2. Follow inputs across trust boundaries (TS02), check real state/optionality and public
   signatures (TS03), then promise ownership, rejection paths, ordering and cleanup
   (TS04). Inspect module and host assumptions (TS05). Check data loss, mutation,
   serialization, authorization boundaries and resource use when relevant.
3. Use the project's existing checks when available. Distinguish baseline failures from
   changed-code failures. Type/lint success is evidence with limits, not proof of runtime
   safety. A style preference is not a defect (TS07).
4. For each finding give severity, file and line, concrete trigger/input, observable
   consequence, supporting rule/source and a minimal remedy. Prefer a reproducible test
   over speculative wording. Do not invent a bug to fill a quota. If uncertain, label the
   missing evidence as a question rather than asserting a defect.
5. Deliver findings in priority order, then checks run and coverage gaps. Say explicitly
   when no actionable issues were found; that does not certify correctness.

## Severity

- P1: likely data loss, security exposure, crash or broken supported workflow.
- P2: reproducible edge-case behavior or API/compatibility regression.
- P3: concrete maintainability problem with a specific consequence. Optional style
  observations belong separately and should usually be omitted.

## Calibration examples

`JSON.parse(text) as Order` does not establish that `quantity` is numeric. If callers
send arbitrary JSON, show an input causing wrong totals (TS02), rather than demanding
one particular schema package. An `interface` in a type-alias-heavy repo alone is not P2.
A rejected promise from an async event callback needs an owner (TS04); do not “fix” it
by inserting `void` without handling the rejection.

Example request: “Review only this checkout diff. Prioritize observable bugs, keep the
current error model, and include a reproduction for each finding.”

Read [sources and rule map](references/sources.md) when resolving a rule or style conflict.
This reference is bundled so this skill works alone. Respect repository instructions,
framework conventions, supported runtimes and the user's scope. Do not install a new
architecture, Result type, validation library or formatter just to satisfy this skill.

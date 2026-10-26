---
name: typescript-port
description: Port an existing module or service into TypeScript with characterization, staged implementation and behavioral verification. Use for cross-language ports or JavaScript-to-TypeScript migrations.
---

# TypeScript port

Port observable behavior into a defined TypeScript runtime. No language pair is
universally supported; native APIs, concurrency and numeric/text semantics need explicit
choices. Keep both implementations available until cutover is authorized.

## 1. Establish the source baseline (TS01, TS06)

Read source, callers, tests, versions and dependencies. Run original tests before editing
and retain their results. If source execution is unavailable, separate inferred behavior
from measured behavior; do not call the port equivalent on that basis.

Make a short contract inventory before implementation:

| Area | Capture |
|---|---|
| API | Inputs, outputs, defaults, mutation and callers |
| Data | Numeric range, precision, encoding, null/missing and serialization |
| Collections | Key equality, ordering, ties, duplicates and aliasing |
| Failure | Error categories/codes, observable messages, partial effects and exit codes |
| Execution | Sync/async boundary, concurrency, cancellation, timeout and resource lifetime |
| Environment | Native dependencies, filesystem/process/network use and platform assumptions |

Tests are evidence, not the entire specification. Add characterization cases for uncovered
behavior and ambiguities. Preserve source quirks unless a behavior change is authorized;
do not quietly “improve” them while translating.

## 2. Define the target and migration boundary (TS01, TS05)

Name the actual host/version, module format, build path and intended consumers. Reuse the
target project's framework, package manager and error conventions. List dependencies that
can be reused, replaced, adapted or cannot be ported directly. A native/WASM adapter can
be a smaller, more faithful boundary than reimplementing an entire subsystem.

Use [semantic and host checklist](references/porting.md) for source-specific hazards and
[type/runtime decisions](references/type-and-runtime-decisions.md) for modeling tradeoffs.
A pure core is a useful starting point, not evidence of universal host compatibility.

## 3. Port tests before the implementation

Keep a source-test → target-test mapping. Preserve all source cases and their assertions;
rename for clarity only if the mapping remains clear. If the original lacks tests, write
characterization tests against the running source first.

Choose comparison boundaries deliberately. A JSON harness can compare values and error
codes, but hides object identity, aliasing, nonfinite values and concurrency. Add in-process
or integration checks for behavior the wire protocol cannot represent.

Record the red state of target tests against an unimplemented target when feasible. Do
not generate expected output by calling the target implementation itself.

## 4. Make type and semantic decisions before each slice (TS02–TS04)

| Source behavior | TypeScript decision |
|---|---|
| Unbounded or wide integers | Safe number domain only if the source contract allows it; otherwise bigint/string protocol or a suitable existing numeric library |
| Decimal quantities | Preserve required precision; do not use binary floating point merely because number is convenient |
| Missing versus explicit null | Model and validate separately when their meaning differs |
| Ordered maps | Use a representation that preserves actual key/equality/order semantics |
| Exception/error-code API | Preserve caller-visible categories and useful context using the target's existing error convention |
| Sequential work | Preserve when work starts, completes and stops on failure; async syntax alone does not implement a scheduler |
| Resource lifetime | Provide explicit cleanup where source behavior cannot depend on garbage collection timing |

Validate foreign/untrusted data once at the boundary. A TS interface cannot enforce wire
input. Add unions, classes, brands or a schema library only where they solve an actual
contract problem. Do not force Result on exception-based callers.

For parsers, verify full-string acceptance, whitespace, signs, Unicode, trailing line
terminators and numeric overflow against source behavior. Similar-looking regular
expressions or standard-library functions can accept different inputs across languages.

## 5. Implement in runnable stages

1. Establish the target project and test command without replacing existing config.
2. Port a pure operation and compare it with the source on fixed inputs.
3. Add stateful behavior, checking ordering, mutation and failure effects.
4. Add I/O/native adapters and cancellation/cleanup behavior.
5. Integrate public callers and verify built entrypoints/declarations.

At each stage keep a runnable result and record a deliberate difference immediately.
Avoid optimization and architecture rewrites until behavior agrees. For JavaScript
migration, a scoped allowJs/checkJs stage can be useful; contain and retire temporary
unsafe types rather than treating any as the final model.

## 6. Compare independently

Use the same deterministic corpus for source and target: typical, empty, boundary,
malformed and generated inputs. Fix and record a seed. Compare failures as well as values.
Normalize only fields whose differences are not contractually meaningful; sorting every
output can conceal the very order bug the comparison should catch.

For async code, use controlled deferred operations rather than flaky elapsed-time tests:
prove when later work may start, what happens after rejection, and whether cancellation
releases resources. Test selected supported hosts. Do not infer browser/Bun/Deno support
from Node execution or successful compilation.

When comparison fails, minimize the input, classify source quirk versus target defect,
and fix the smallest responsible slice. Do not delete the case or loosen normalization
to make the comparison pass. Unknown differences remain explicit gaps.

## 7. Measure only after equivalence (TS08)

Keep the same workload and check results before timing. Separate startup/IPC/parsing from
steady-state work; record versions, machine, sizes, warmups, repeated raw samples and
median/range. Alternate order where practical. Explain algorithm changes and regressions.
Do not claim one language is faster from a synthetic microbenchmark or silently change
the workload to favor the port. If a fair comparison is unavailable, report that.

## 8. Deliver a usable port (TS09)

Run the target's typecheck, lint, tests, build and appropriate runtime/consumer checks.
Write PORTING.md with source revision/runtime, target host/toolchain, API mapping,
source-test mapping, characterized input domain, error/mutation/order semantics,
preserved quirks, authorized differences, executed commands and unverified cases.

Keep the source and original tests intact. A compile pass is not behavioral equivalence;
a passing finite corpus is not proof for every possible input. Report the boundary of
what the evidence supports, along with any blocker to replacing the source in production.

## Reference selection

- Read [semantic and host checklist](references/porting.md) for source-language hazards
  and the PORTING.md evidence template.
- Read [type and runtime decisions](references/type-and-runtime-decisions.md) before
  choosing boundary types, error ownership, async scheduling or deployment configuration.
  It maps the rule IDs used here to migration decisions and official source links.

Both references are bundled. Do not require a companion skill or impose a new architecture,
Result type or schema library on the target project.

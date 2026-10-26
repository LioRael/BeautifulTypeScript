# Frozen evaluation rubric v1

Eight binary criteria per case. Score only observed artifacts and execution; no credit
for a skill name, source citation or preferred syntax alone. Every failed criterion has
a concrete evidence note. Execution/infrastructure failures are retained and labeled.

## write

1. Valid defaults and fresh output; no input mutation.
2. Explicit zero and false survive.
3. Reject null/arrays/missing or invalid endpoint.
4. Reject invalid retries (null/string/fraction/out of range).
5. Reject nonboolean enabled; field-specific TypeError messages.
6. Await reader once, preserve read/JSON failure, validate loaded data.
7. Preserve public signatures and dependency/config constraints; typecheck succeeds.
8. Add meaningful boundary/error tests, run tests and typecheck with honest evidence.

## review

1. Finds zero-limit bug with trigger and effect.
2. Finds discarded async completion and sequential/failure-order breach.
3. Finds in-place mutation of caller-owned array.
4. All three findings have accurate location and concrete remedy.
5. Reproduces at least one behavioral failure with an executed probe/test.
6. Executes existing typecheck/tests and states coverage limits.
7. No false positive against default exports or unrelated legacy helper.
8. Leaves source/config unchanged; prioritizes defects over optional taste.

## port

1. Empty/grouping and first-record priority semantics.
2. Arbitrary precision decimal totals, canonical output and signed/leading-zero inputs.
3. Numeric-looking/prototype-looking keys preserve order for equal priorities.
4. Zero/negative priorities and null/missing defaults are correct.
5. Invalid shape/amount/priority errors preserve codes, including trailing newline and booleans.
6. Input/source immutability and public API; typecheck succeeds without new dependencies.
7. Executes Python tests, preserves/maps all source cases and adds target characterization tests.
8. Executes source-target comparison and records domain, host, test mapping and gaps in PORTING.md.

## verify

1. Executes the actual typecheck command and records its real result.
2. Executes the actual lint command and identifies its zero-file coverage.
3. Executes tests and identifies zero executed tests.
4. Builds and actually imports the emitted public entrypoint under Node.
5. Reports the missing extension/runtime resolution failure with evidence.
6. Concludes not ready despite successful script exits.
7. Does not claim browser/Bun/Deno execution; reports untested hosts.
8. Leaves input files/config unchanged; does not weaken checks.

Write/port criteria 1–6 use hidden runtime assertions; configuration/source hashes verify
scope. The remaining criteria and review/verify reports are scored by the authoring agent
against traces and artifacts, with evidence recorded. This is not a blinded human study.
No retrospective rubric changes, task-specific skill patches during measured runs, or
selection of only successful runs is permitted. A later fix needs a new named evaluation.

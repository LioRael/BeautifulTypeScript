# BeautifulRust comparison and implementation gaps

Compared against BeautifulRust commit
[c6f56d27a01739d404da2a554daaea023d7ddcca](https://github.com/morganlinton/BeautifulRust/tree/c6f56d27a01739d404da2a554daaea023d7ddcca),
fetched again on 2026-10-27. Inspected skill entrypoints, references, example reviews,
lint verification and per-task evaluation prompts/graders. BeautifulRust has three skills
plus its lint workflow, not a separate fourth verification skill. This comparison uses
that workflow as the closest reference for typescript-verify.

The useful distinction is operational specificity, not matching a line count. Rust rules
about ownership, Result and Cargo are not transferred to TypeScript as universal policies.

| Area | Previous gap | Change in this revision | Evidence |
|---|---|---|---|
| Writing | Broad principles lacked a concrete sequence and common failure patterns | Separate app/library decisions; boundary/defaulting patterns; state/API, error, async/resource and emitted-module checks | Executable bundled examples and a settings-library task |
| Review | Short generic checklist; weak guidance on tracing actual callers and calibrating findings | Consequence-ordered inspection, scoped baseline, reproduction, grouping and minimal remedies | Queue review with three real defects and explicit false-positive controls |
| Port | Sensible outline but weak intermediate deliverables and comparison boundaries | Contract inventory, test-first stages, precision/parser hazards, source-target comparisons, asynchronous side effects and cutover limits | Independent Python ledger task with wide integers and ordering |
| Verify | Listed tools but did not sufficiently confront misleading green checks | Inspect scripts and coverage, import emitted entrypoint, distinguish failed/empty/unrun checks, preserve verification-only scope | Library with passing placeholder scripts and a broken Node import |
| Examples | Only repository fixture code; no executable pattern included with writing skill | Standalone boundary and sequential-async examples shipped in the skill | Strict compilation plus boundary and controlled-rejection tests |
| Evaluation | Deterministic tests and algorithm timing were the only evidence | Frozen tasks/rubric, fresh with/without-skill runs, artifact/runtime checks and trace-based scoring | evals/ and eval-results/v1/ |

## Intentional differences

- Each TypeScript skill is independently installable. Review/port/verify do not require
  loading the entire writing reference library.
- Existing project conventions and caller contracts take precedence over organizational
  style. No mandatory Result, schema dependency, class hierarchy or broad lint migration.
- A review may have zero findings; it does not need a fixed quota or a praise section.
- Verification respects affected scope and command side effects rather than running an
  unrestricted all-target command by default.
- A finite differential corpus supports a stated domain, not universal equivalence.

The paired evaluation is a small controlled local study. It does not reproduce
BeautifulRust's tasks, models or reported scores, and the two projects' percentages must
not be compared as a ranking. See [evaluation](EVALUATION.md) for measured results and limitations.

## Follow-up: source depth was still missing

The workflow-depth revision improved procedures but left the source digests at 305 lines
with no fenced examples. That was not comparable reference depth. The next revision adds
source-section coverage maps, individual decisions, original code and checked counterexamples
across all six digests, plus worked review/port/verify cases. See [coverage](GUIDE-COVERAGE.md)
for exactly what is represented and what is deferred. It does not claim exhaustive coverage
of every Handbook page, lint rule or organizational formatting subrule. The old model runs
are historical evidence and do not evaluate this expanded reference text.

## Follow-up: ownership and usable entrypoints

BeautifulRust stores cases under the owning skill and includes language mapping tables
in rust-port and concrete findings/report structure in rust-review. It has no independent
rust-verify skill. Our root-only case layout and more abstract entrypoints did not match
those choices. Cases now live in skills/<name>/evals/<case>/; only shared runner/grader
machinery and historical rubrics remain at root. Agent workspace preparation excludes the
skill's evals tree to avoid exposing grading material.

Port now includes source-language and host mappings, a checked parser and concrete delivery
notes in its entrypoint. Review includes trigger/remedy pairs, a reproduced zero-default
case and an awaited-loop finding/fix. Verify includes commands, a checked rejection probe
and a concrete readiness table. References provide deeper cases and attribution; following
a link is not required to obtain the core procedure. This is a content/layout correction,
not evidence of measured agent superiority or exact parity with BeautifulRust.

# Sequential maintenance study

**2026-10-27: no observed advantage for the revised writing skill.** All three conditions
passed the frozen behavior checks. Both anonymous review orders tied every comparison.
The new guidance remains a research-informed design hypothesis, not a demonstrated quality gain.

The [research note](AGENT-TS-RESEARCH.md) distinguishes empirical agent studies from
TypeScript mechanisms and maintainer experience. It motivated testing successive changes
to an agent's own code, rather than another isolated implementation. Earlier
[v4](EFFECT-STUDY.md) and [v5](REVISION-STUDY.md) null results remain available.

## What changed

The four skills now address incomplete replacements, duplicated policy, synchronized state,
type escapes and misleading green checks. The writing skill adds a conditional
[maintenance reference](../skills/typescript-best-practices/references/maintenance.md)
with executable examples. Review requires a concrete consequence before reporting debt;
port distinguishes a source oracle from a production fallback; verify checks real consumers
and retired behavior. Supported compatibility, necessary validation and project conventions
remain constraints. No wrapper-count, deletion quota or shortest-code objective was added.

The writing entrypoint grew from 118 to 135 lines. Its references are loaded according to
the task. Adding useful guidance still has a context cost; this experiment tests whether
that cost produces a visible benefit. Only the writing skill received new model evaluation.
The other three received example, packaging and format checks.

## Method and chronology

A fresh author process received the maintenance research question, but no skills,
proposed edits, earlier study outputs or condition labels. It created a private training
application with four TypeScript modules and 134 nonempty source lines. The coordinator
froze skill edits before reading the completed task. The case was then copied unchanged;
no reference solution was supplied. The scenario was deliberately selected to investigate
maintenance, so this is not a representative task sample.

The [case](../skills/typescript-best-practices/evals/maintenance-sequence/case.json) has
three chronological requests:

1. Add opt-in waitlisting, FIFO automatic promotion on cancellation, and a JSON consumer.
2. Pause admissions and promotions; reopening fills available seats without bypassing waiters.
3. Replace automatic confirmation with reserved seat offers that require acceptance.
   Decline/cancellation release reservations; attendance includes only confirmed enrollment.

Conditions: no skill, old writing skill at
[4be4709](https://github.com/LioRael/BeautifulTypeScript/tree/4be4709d4ea8fe6cc9eedb9e46ed99c9e2ae7372/skills),
and the frozen revision. Two repetitions each produce **six trajectories and 18 solver calls**.
Each checkpoint gets a fresh process but keeps its own previous code, tests and configuration.
Earlier requests remain visible; future requests and hidden graders do not. Later agents
receive no hidden-check feedback. SHA-256 snapshots verify continuity at all 12 transitions.
Initial files and completed checkpoints are locally committed so Git diff is meaningful.

All calls selected gpt-6.1-sol, low reasoning, Codex CLI 0.164.0, with two workers and a
600-second transport timeout. Repetition two reverses condition submission order. This is
a mutable model alias, not an immutable model snapshot. Personal skill/plugin/project-doc
loading was disabled by the recorded invocation. Skill conditions explicitly read their
supplied skill; all six revised checkpoints also read maintenance.md. Automatic routing
was not evaluated. Workspace isolation is instruction-assisted, not a hermetic read boundary.

After generation, each checkpoint's retained snapshot was independently restored and checked
on Node 22.13.0 with TypeScript 5.9.3. This matters: checking all stages against the final
workspace would erase evidence about earlier behavior. Two blind reviews then compared each
final revised output with its matched old and no-skill outputs, with earlier code and check
results available. The second review swaps A/B. The rubric considers correctness, consumers,
shared policy, concrete maintenance burden, check integrity and independent evidence.

## Results

| Condition | Solver exits | Compilation / visible tests | Hidden behavior groups | Summed solver seconds | Output tokens |
|---|---:|---:|---:|---:|---:|
| No skill | 6/6 successful | 6/6 / 6/6 | 28/28 | 411.227 | 20,339 |
| Old skill | 6/6 successful | 6/6 / 6/6 | 28/28 | 423.388 | 20,461 |
| Revised skill | 6/6 successful | 6/6 / 6/6 | 28/28 | 441.172 | 21,250 |

There are 5, 4 and 5 hidden check groups at the three stages, counted twice per condition.
These are grouped assertions, not 84 independent task designs. Package scripts and compiler
configuration remained unchanged in all 18 outputs. Every stage snapshot matches its recorded
source hashes. The untouched starting application passed its four baseline tests and failed
all 14 future-feature groups, as expected; those failures are retained in provenance.

Both review orders return **four ties**: two revised-versus-old and two revised-versus-no-skill.
The repeated judgments are not independent human ratings. Their concrete observations:

- All six trajectories replaced automatic promotion with offers in their existing shared
  fill operation and updated affected tests and consumers. No obsolete production fallback
  was found by the checks or reviews.
- Old repetition 1 shares a reserved-seat helper; revised repetition 2 shares an available-seat
  helper. The other old/revised outputs keep the short capacity expression local in two places.
  This did not establish a material maintenance disadvantage or a revision-specific benefit.
- Both no-skill outputs retain an explicit backlog condition. The reviewers found it
  equivalent under the reachable-state invariant: reopening and seat release fill vacancies
  before a new arrival. An extra predicate alone was not scored as a defect.
- Errors, external validation, detached snapshots and confirmed-only attendance remained
  covered. A small documentation enumeration inconsistency in one old output was noted,
  without changing the overall verdict.

Final nonempty source lines were 169/167 (no skill), 167/166 (old), and 166/170 (revised).
They are descriptive only. Time and tokens above are also descriptive: concurrent execution,
caching, tool activity and two repetitions do not support a speed, cost or significance claim.
The revised condition did not show a token or time saving in this sample.

## Incidents and limits

Intermediate shell-quoting, typecheck and assertion failures remain in the traces. Agents
repaired them within their original calls; no solver run was rerolled or omitted. No task or
skill was tuned after inspecting results. Public copies remove reasoning and incidental host
metadata, retaining commands, failures, outputs and code. Raw logs remain local.

Separately, the repository suite twice failed while removing temporary Git fixture
directories: a host Git AI daemon recreated refs/notes/ai through the global Trace2 target.
The final suite passed with GIT_TRACE2_EVENT=0 for that invocation only. No user configuration,
project requirement, test assertion or model output was changed for this workaround.
These host cleanup failures are not model quality failures or silently discarded checks.

The starting application was small and coherent, requirements explicit, horizon three
changes, and all solvers competent on this case. There was little pre-existing debt to repair.
A fresh process at each stage carries code but not conversation history. The same model
family authored, solved and judged. No human maintenance time, production adoption,
cross-model generalization, runtime performance improvement or parity with BeautifulRust was
measured. Review, port and verify efficacy cannot be inferred from writing results.

This result does not justify expanding the prompt until a judge prefers it. A more informative
future evaluation would use independently selected existing repositories with reproducible
maintenance defects, longer change histories and human judgments. The present case is useful
as a regression fixture, but cannot establish that the new guidance prevents debt accumulation.

## Reproduction and retained evidence

The [protocol](../evals/maintenance-study-protocol.md) was frozen before generation;
[runner instructions](../evals/README.md) explain sequence mode and old-skill setup.
Model runs require authentication and consume quota. Do not overwrite the retained study.

- [Summary and descriptive totals](../eval-results/v6-maintenance-study/summary.json)
- [Manifest and frozen hashes](../eval-results/v6-maintenance-study/manifest.json)
- [All 18 run records](../eval-results/v6-maintenance-study/runs.json)
- [Original-order judgments](../eval-results/v6-maintenance-study/judge-1/verdict.json),
  [reversed judgments](../eval-results/v6-maintenance-study/judge-2/verdict.json),
  [condition mapping](../eval-results/v6-maintenance-study/blinding-map.json)
- [Author prompt](../eval-results/v6-maintenance-study/provenance/author-prompt.txt),
  [baseline validation](../eval-results/v6-maintenance-study/provenance/baseline.json),
  [exact recorded runner](../eval-results/v6-maintenance-study/provenance/recorded-runner.py)

Every run directory contains its prompt, events, final response, result.json, source artifacts
and verification.json. The six final artifacts, with earlier stages retained beside them:

| Condition | Repetition 1 | Repetition 2 |
|---|---|---|
| No skill | [Code](../eval-results/v6-maintenance-study/maintenance-sequence-without-1-stage-3/artifacts/src/desk.ts) | [Code](../eval-results/v6-maintenance-study/maintenance-sequence-without-2-stage-3/artifacts/src/desk.ts) |
| Old skill | [Code](../eval-results/v6-maintenance-study/maintenance-sequence-old-1-stage-3/artifacts/src/desk.ts) | [Code](../eval-results/v6-maintenance-study/maintenance-sequence-old-2-stage-3/artifacts/src/desk.ts) |
| Revised skill | [Code](../eval-results/v6-maintenance-study/maintenance-sequence-with-1-stage-3/artifacts/src/desk.ts) | [Code](../eval-results/v6-maintenance-study/maintenance-sequence-with-2-stage-3/artifacts/src/desk.ts) |

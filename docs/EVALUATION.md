# Paired agent evaluation

The initial study reached a ceiling on its eight prespecified criteria per task;
it does not establish improved correctness from these skills. An additional contract
issue in the review task was missed by both with-skill runs and one baseline run.
The original rubric did not score that issue. We retain those results, disclose the
rubric limitation, and run a separate targeted regression after adding an ordering check.

## Method

Four small independent projects: settings validation, queue review, Python ledger port,
and Node ESM release verification. Each has two fresh runs without a skill and two with
only its corresponding skill: 16 initial runs, not 16 independent task designs. The same
task, project files, tools and constraints are supplied within each pair. Inputs, skill
files and rubric are hashed before execution. Expected checks stay outside task workspaces.

Codex CLI 0.164.0, CLI default model reported by preflight as gpt-6.1-sol, reasoning effort
none. This is a mutable alias, not an immutable model snapshot. Local macOS arm64,
TypeScript 5.9.3, Python 3.9.6, observed task Node v26.12.1. User configuration/AGENTS
loading, plugins, skill search and discovered global skills were disabled per invocation;
a preflight catalog probe returned NONE. With-skill agents explicitly read a supplied
folder. Automatic discovery/routing and Claude Code execution were not evaluated.

Each task requests completion within eight minutes; the harness imposes a 600-second
hard timeout. Two workers run concurrently; second-repetition submission order is reversed.
Latency and usage are descriptive, not a controlled speed/cost experiment. Usage includes
repeated context and cache hits; no dollar cost is inferred.

Hidden runtime assertions score writing/port behavior. The authoring agent scores reports,
tests and command evidence against the fixed rubric. This is not a blinded human study.
Tasks were authored alongside the skill improvements, so selection bias remains. No claim
of superiority over BeautifulRust is possible from different tasks and model settings.

## Initial results (v1)

Each cell totals two runs, eight prespecified criteria per run. All 16 processes completed
without a timeout; every run and score is retained. These are **rubric scores**, not claims
that every contractual behavior was reviewed or every possible input was correct.

| Skill / task | Without skill | With skill | Mean seconds without / with | Mean output tokens without / with |
|---|---:|---:|---:|---:|
| best-practices / settings | 16/16 | 16/16 | 78.9 / 95.5 | 3,370 / 3,847 |
| review / queue | 16/16 | 16/16 | 85.3 / 73.6 | 2,361 / 2,354 |
| port / ledger | 16/16 | 16/16 | 121.8 / 156.6 | 4,698 / 5,658 |
| verify / Node ESM | 16/16 | 16/16 | 103.1 / 115.6 | 2,982 / 3,692 |

[Criterion-level scores/evidence](../eval-results/v1/scores.json) and
[all run metadata/usage](../eval-results/v1/runs.json) make these aggregates inspectable.
There is no measured scored correctness gain. More output or longer execution is not a
quality improvement. Concurrent scheduling, cache reuse and local tool startup failures
make these timings unsuitable for a speedup claim.

### What the artifacts show beyond the score

The with-skill writing runs checked emitted declarations with a consumer; both baselines
passed the functional contract. With-skill ports retained executable differential tests
(788 and 307 cases) and recorded tests failing before implementation. Baselines executed
one-off comparisons (505 and 405 cases). Every port identified the Python integer-token
versus JavaScript number representation gap. This is useful workflow evidence, not a
statistical claim that the skill caused better code.

Both with-skill verifiers exercised emitted declaration consumers, while baseline reports
explicitly left external declaration consumption unverified. All four correctly refused
release readiness because Node imports failed and lint/tests were placeholders.

The queue has a fourth contract issue beyond the original three-defect rubric: selection
uses priority, but saves must follow original input order. Only
[baseline repetition 2](../eval-results/v1/review-without-2/artifacts/REVIEW.md) found it.
Both with-skill reports and baseline repetition 1 missed it. The original scores are not
retroactively changed, and their ceiling must not be interpreted as complete review
accuracy. This concrete miss prompted the targeted regression below.

## Targeted review regression (v2)

Added one general review instruction: distinguish selection/filtering order from side-effect
and presentation order, then trace each promised order through the pipeline. The original
review skill is retained in the [v1 snapshot](../eval-results/v1/skill-snapshots/typescript-review/SKILL.md).
No task/API files changed. Before the follow-up, we added [criterion R9](../evals/REVIEW-REGRESSION.md)
for the previously omitted ordering contract and fixed local Git initialization in the harness.

| Condition | Original eight criteria, two runs | Ordering criterion R9 | Total |
|---|---:|---:|---:|
| Without skill | 16/16 | 2/2 | 18/18 |
| Updated review skill | 16/16 | 2/2 | 18/18 |

[Scores and evidence](../eval-results/v2-review/scores.json),
[manifest](../eval-results/v2-review/manifest.json), and
[usage/timings](../eval-results/v2-review/runs.json) retain all four runs.
Both updated-skill runs found and reproduced the missed ordering defect; both new baselines
did too. This supports coverage in these observed runs, **not superiority over baseline**.
The task was reused after inspecting its failures, and the harness also changed. Do not pool
these runs with v1 as independent samples or attribute the before/after change solely to the
skill. There is no measured general correctness gain from this 20-run study.

Useful next evidence would be independently authored larger tasks, more repetitions,
other models/frameworks and a hermetic environment. Automatic activation, native adapters,
asynchronous cross-language migration and actual browser/Bun/Deno behavior remain unevaluated.

## Evidence and reproduction

- [Initial manifest and content hashes](../eval-results/v1/manifest.json)
- [Environment/catalog preflight](../eval-results/v1/environment.json)
- [Frozen original rubric](../evals/RUBRIC.md)
- [Harness instructions](../evals/README.md)
- [Gap analysis against BeautifulRust](GAP-ANALYSIS.md)

Full per-run prompts, generated files, reports, command outputs, failures, usage and timings
are retained under eval-results. Model reasoning is omitted from public transcripts.
Unrelated ancestor-Git filenames and host PATH inventories are redacted, with counts.
Raw transport logs remain local and are not published.

## Environment limits

The initial temporary workspaces had no local Git repository. Several agents ran Git status
and received names from an ancestor repository despite the workspace-only instruction.
No trace shows those files being opened, external skill content being read, or hidden
rubrics being accessed. This is still an isolation defect, not a fully compliant run.
The targeted regression initializes a fresh local Git repository before each task.
Workspace-write is not a hermetic read boundary; a container would provide stronger isolation.

Login-shell mise startup intermittently failed; agents retried available tooling with
non-login shells or direct executables. Invalid probe commands and these environmental
failures remain in traces and reports. No run is dropped for producing an inconvenient
result. Shared dependency files are read-only by convention, not a separately mounted
read-only filesystem.

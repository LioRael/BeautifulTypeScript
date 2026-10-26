# Paired skill evaluation

This suite evaluates task execution, not whether Markdown contains preferred words.
Each case is an independent small project with two fresh runs per condition.
The writing skill also has a trusted-refactor regression with five criteria.
Writing/port/verify have eight binary criteria; review has nine, including the ordering
criterion discovered in v1. Every process has a fixed 600-second timeout. Model runs consume the
signed-in account's quota; ordinary npm test does not launch agents.

## Task ownership and layout

Task definitions live with the skill they evaluate:

| Case ID | Skill-local task |
|---|---|
| revision-a | [delivery failure isolation](../skills/typescript-best-practices/evals/revision-a/case.json) |
| revision-b | [promotion eligibility](../skills/typescript-best-practices/evals/revision-b/case.json) |
| effect-internal | [room workload feature](../skills/typescript-best-practices/evals/effect-internal/case.json) |
| effect-async | [preview cache race](../skills/typescript-best-practices/evals/effect-async/case.json) |
| effect-boundary | [sensor ingestion](../skills/typescript-best-practices/evals/effect-boundary/case.json) |
| simplify | [trusted-refactor](../skills/typescript-best-practices/evals/trusted-refactor/case.json) |
| write | [settings-boundary](../skills/typescript-best-practices/evals/settings-boundary/case.json) |
| review | [queue-contract](../skills/typescript-review/evals/queue-contract/case.json) |
| port | [python-ledger](../skills/typescript-port/evals/python-ledger/case.json) |
| verify | [node-esm-release](../skills/typescript-verify/evals/node-esm-release/case.json) |

Each case contains case.json, prompt.md, files/ and graders/rubric.md. The root evals/
directory contains the shared runner, runtime grader, index and historical rubrics only;
eval-results/ holds measured outputs. This keeps the task bundled with an independently
installed skill without duplicating the execution machinery four times. Cases use JSON
metadata rather than BeautifulRust's YAML; the ownership/layout is the relevant convention.

Normal skill use does not require opening evals/. During measured runs the harness copies
only the case's files/ into the target project. With-skill runs additionally receive the
skill content **excluding its entire evals/ tree**. This prevents prompts, sibling inputs
and hidden graders from being supplied as skill instructions. npm test verifies every pair's
workspace content, byte-for-byte, without running a model. An ordinary full installation
includes evals/ for maintainers; that is different from the evaluation context.

## Reproduce

Install this repository's locked dependencies with npm ci and authenticate Codex normally.
Use a fresh directory for each experiment:

```sh
python3 evals/run.py --work work/agent-eval-new --output eval-results/new --workers 2
```

The runner refuses existing output directories. Inputs are copied; node_modules is shared
read-only by convention for tooling. It does not install target skills into user directories
or edit personal configuration. Use --cases write review port verify to select tasks.

Each run is a new codex exec process with no conversation history, ignored user config,
AGENTS.md auto-loading disabled, plugins/skill search disabled and discovered local skills
disabled through invocation-only overrides. In CLI 0.164.0, SKILL.md paths were necessary
for the overrides; folder-only overrides did not suppress the catalog in a preflight probe.
Recheck isolation when using a different CLI or installation layout. The measured preflight
reported an empty skill catalog. Model/settings come from the CLI default; record its
banner before a new study and update the model-selection note if different.

The same task/project appears in both conditions. The with-skill condition additionally
receives one supplied-skill directory and the instruction to read/apply it. It is a test
of explicitly supplied content, not automatic skill discovery or routing. The second
repetition reverses submission order. Two processes can run concurrently, so latency is
not a controlled performance comparison.

## Freeze and grade

Before execution, manifest.json records hashes of case inputs, prompts, skill files,
per-case rubric, runner and runtime grader. Do not change them mid-run. The target agent never
receives RUBRIC.md or the runtime grader. They remain outside its allowed workspace.

The runtime grader exercises write/port artifacts after execution. Review/verify and
workflow criteria are scored from reports, generated tests and command traces using
each case's graders/rubric.md. An explicit --rubric overrides that selection for a named
experiment; root RUBRIC.md and REVIEW-REGRESSION.md retain historical v1/v2 definitions. Record a pass/fail and evidence for every criterion; do not infer success from
word matching alone. Record configuration/source changes, incomplete runs and failures.
Scores must not be changed to reward a style preference absent from the frozen rubric.

The authoring agent performs trace-based grading; this is not a blinded human assessment.
The input projects and rubric were authored alongside the skill improvement, so task
selection bias remains. A future holdout suite should use independently authored tasks.

## Retained evidence

Per-run output contains the exact task prompt, source/report artifacts, final response,
command/file-change events, usage and elapsed time. Public traces omit model reasoning
items and session IDs and replace machine-specific absolute paths. Full transport logs
stay in the ignored work directory. No credentials or account configuration are copied.

Workspace-write limits writes but is not a hermetic container: read isolation also relies
on the common task instruction. Inspect traces for out-of-workspace access, forbidden
network/package installation and unintended skill reads before accepting a run. Compiler
execution uses the preinstalled dependency tree. Missing/failed infrastructure is not
silently treated as a skill failure or omitted; document its classification.

No speedup or improved agent quality is implied by the inventory algorithm benchmark.
This evaluation has separate inputs, metrics and results.

## Recorded v1 versus current harness

The exact initial runner is retained as recorded-runner-v1.py (its hash is in the v1
manifest). That study lacked local Git repositories: incidental ancestor Git filenames
appeared in nine run traces. The current run.py initializes each workspace with an empty
local Git repository; it also accepts --rubric for a separately frozen follow-up rubric.
The v1 review skill snapshot is retained in eval-results/v1/skill-snapshots; the other
three skills match their hashes at commit b13a7aa. Check out that commit to reproduce the
recorded content and original root-case paths: current references and entrypoints have
since expanded, and cases have moved into their skills. To run the current review case, including criterion 9, use:

```sh
python3 evals/run.py --work work/review-regression --output eval-results/new-review --workers 2 --cases review
```

Before publishing results, inspect the traces and run the redaction step once:

```sh
python3 evals/redact-results.py eval-results/new
```

This removes incidental host metadata and records counts. It is a
publication step, not a change to task outputs or scores. It does not guarantee that a
trace contains no sensitive material; review the public copy before sharing.

For the new-task writing study, see the [frozen protocol](effect-study-protocol.md).
The runner accepts --model, --effort and --repetitions to record an explicit setup.


For a three-condition comparison, supply --old-skill-root (a directory containing frozen
skill folders) and --old-skill-label (a public commit/version identifier). The runner hashes
both revisions and supplies the same activation instruction to old/with. See the
[revision protocol](revision-study-protocol.md). Use judge-effect-study.py --baselines
without old to compare the current revision against both, with reversed A/B labels in a
second review. verify-effect-study.py --node /absolute/path/to/node rechecks generated
projects using that runtime and records its version; ordinary CI does not run model calls.

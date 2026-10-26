# Validation — 2026-10-27 (Asia/Shanghai)

Local macOS arm64 / Apple M2 Pro. Benchmark npm-script process reports Node v26.10.0;
the outer shell reports v26.12.1. Python 3.9.6, npm 11.20.0. Locked dependencies:
TypeScript 5.9.3, ESLint 10.13.0, typescript-eslint 8.72.1.

| Check actually run | Result | Scope / limit |
|---|---|---|
| npm ci --ignore-scripts | exit 0 | Lockfile reinstall; no lifecycle scripts needed; public npm registry URLs |
| npm run check (after reinstall) | exit 0 | All commands below, 20 Node tests, zero failures/skips |
| npm run check:skills | exit 0 | Four names/frontmatter, local reference isolation and linked references, Markdown file links; remote URLs and anchors not automatically crawled |
| Bundled skill-creator quick_validate.py on each skill | exit 0, four valid | Format/scaffold validation, not agent efficacy |
| npm run typecheck | exit 0 | Node and browser bundler compilation contexts |
| npm run lint | exit 0 | Real TS example; zero warnings |
| npm run build | exit 0 | JS plus declarations emitted |
| npm test via check | 20/20 passed | Source subtests, target cases, differential, immutability, nonfinite input, lint/types/consumer and installer |
| Python characterization | 1 unittest with 12 named subcases passed | Shared expected outputs checked against source independently |
| Differential harness | 312/312 cases agree | 12 fixed + 300 seeded cases; both TS algorithms compared with Python |
| Typed lint fixtures | exact expected diagnostics; good fixture clean | Floating promises, misused async callbacks, void without handling; not every inherited preset rule |
| Compiler fixtures | exact expected diagnostics; good fixture clean | strictNullChecks, noUncheckedIndexedAccess, exactOptionalPropertyTypes |
| Declaration consumer | no diagnostics | Imports generated public API declarations |
| Installer integration | all four copied; repeat install refused | Temporary paths only; user's agent directories unchanged |
| npm run benchmark | exit 0 | Equality first, warmups, alternating batches, raw timings saved |

The first lint run caught Array.isArray narrowing to any[]. A readonly unknown[] local
now preserves the boundary before property checks. Initial ESLint 9 installation reported
end of support, so the final tested tuple uses supported ESLint 10. A check attempted
before dependency installation finished failed to find ESLint; it is not counted as a pass.
The full suite passed after install and again after lockfile reinstall. Existing global npm
configuration emits an unknown `home` option warning; it did not fail checks and was not edited.

## Remaining limits

- Node 22/24 Linux CI passed after publication (see the run below); local runtime was Node 26.
- Browser configuration typechecks; no browser execution, Bun or Deno run was performed.
- The source contract is JSON safe-integer inventory aggregation, not arbitrary Python.
  Async migration is documented but this synchronous fixture does not test async parity.
- A paired model evaluation was added in the workflow-depth revision; see
  [evaluation](EVALUATION.md). It is author-graded, small and not a blinded independent study.
  Deterministic tests alone do not establish agent efficacy or automatic skill routing.
- Distribution is directly from GitHub via npx skills; no marketplace release or npm
  package publication is required or claimed.

## Measurement record

[Benchmark report](BENCHMARK.md) uses benchmark-results/latest.json from a dedicated run
after checks and dependency installation completed. An earlier exploratory run is retained
in benchmark-results/exploratory.json; it overlapped dependency work and showed notably
higher variance. It is not pooled into the final sample. Neither run supports a general
performance guarantee. No agent-quality or Python-vs-TypeScript speed claim is made.

## npx skills installation documentation follow-up

Verified with skills 1.7.4 on 2026-10-27: local source discovery lists all four skills;
`add <local-source> --skill '*' -a codex -a claude-code -y` installs all four into a
scratch project's Codex directory and Claude Code links; `list -a codex -a claude-code`
confirms both agents; named removal of all four succeeds. README file-link checks pass.
Global installation and remote-source updating were documented but not executed; no
user-level skill installation was changed. The English README uses npx skills as
the primary installer and includes both GitHub and local-checkout installation commands.

## GitHub publication verification

Public repository: [LioRael/BeautifulTypeScript](https://github.com/LioRael/BeautifulTypeScript).
The initial published code passed both Node 22 and Node 24 jobs in
[GitHub Actions run 40375047334](https://github.com/LioRael/BeautifulTypeScript/actions/runs/40375047334).
Each job ran npm ci and the complete npm run check suite.

Using skills 1.7.4, `npx skills add LioRael/BeautifulTypeScript --list` discovered all four
skills. Installing with `--skill '*' -a codex -a claude-code -y` succeeded in an isolated
scratch project. No user-level skills were installed. README installation commands use
the actual public repository. GitHub emitted action-runtime deprecation notices for the
current action majors, but both jobs completed successfully.

## Reference library revision

Replaced four identical sources.md appendices with six source-specific digests and a
conflict/rule map in typescript-best-practices, plus focused review, port and verification
references. Each skill links only to files within its own installed folder or official
external sources. The repository-level SOURCES.md remains an index, not an install dependency.

Validation: npm run check passed all 20 tests, including standalone installation and
byte-for-byte copying of each reference. The link checker now follows the reference graph
from SKILL.md and rejects missing, escaping or unreachable reference files. All four
quick_validate.py checks passed using an isolated Python environment with PyYAML; no
project dependency was added. A skills 1.7.4 local-source install for Codex and Claude Code
also preserved all 11 reference files byte-for-byte. These checks establish packaging
integrity, not improved agent performance or parity with another project's evaluations.

## Workflow-depth revision

`npm run check` passed **23/23 tests**, including three new executable skill-example
checks: strict compilation, boundary defaults/rejections, and controlled sequential async
completion/failure. Installer tests now also compare bundled assets byte-for-byte. All
four skill-creator format checks passed. A skills 1.7.4 local-source installation for
Codex and Claude Code copied all 16 skill files, including assets/patterns.ts, unchanged.
No user-level installation was modified.

The [paired agent evaluation](EVALUATION.md) records 16 initial with/without-skill runs
and a separate four-run targeted review regression. Prompts, frozen input/skill hashes,
outputs, runtime assertions, trace-based scores, usage, timing and unsuccessful probes are
retained. Initial rubric scores were tied; a missed review contract and a rubric omission
prevent interpreting the ceiling as complete correctness. The targeted follow-up is
same-task regression evidence, not an independent holdout or general efficacy claim.
Public transcripts omit model reasoning and redact incidental host metadata. The original
Git-isolation flaw and local shell startup failures are explicitly disclosed.

## Guide/example depth revision

The reference-example test compiles 43 TypeScript blocks directly from the Markdown,
including expected-error consumer calls, and executes 15 marked behavioral examples.
It checks the actual snippets, so documentation edits cannot silently diverge from a
separate handwritten fixture. Shell/JSON/JS illustrations are not all standalone executable
projects; the optional project configs retain their existing validation.

The earlier 20 model runs used the content at b13a7aa (and its v1 review snapshot). They
were not rerun for this reference expansion and are not evidence of its agent-effectiveness
or parity with BeautifulRust. See GUIDE-COVERAGE.md for exact scope.

Final local check: **24/24 tests passed**. All four skill format checks passed. A fresh
skills 1.7.4 install for Codex and Claude Code preserved all 16 skill files byte-for-byte,
including the expanded references. No global installation was changed.

## Skill-local evaluations and concrete entrypoints

All four cases moved under their owning skills with prompt, starting files, metadata and
grading criteria. The shared runner reads the new index; historical results/rubrics are
unchanged. Workspace-preparation tests exercise both conditions for all four cases and
verify input integrity, skill content and exclusion of every skill-local evals directory.
Installation tests now recursively verify the complete skill, including its evaluation.

The example check now covers SKILL.md as well as references: **47 TS blocks compile and
18 execute**. The full suite passes **25/25 tests**. These deterministic checks validate
layout/content; no new model-quality evaluation is claimed for this revision.

Fresh skills 1.7.4 installation for Codex/Claude Code preserved all **56 files**, including
each local evaluation case. Four format checks passed. A simulated-transport runner test
also confirmed that a successful process exit retains failed runtime-grader results; it
does not call a model or claim task success.

## Oxlint recipes (2026-10-27)

Added Oxlint 1.89.0 and optional typed-engine recipe using oxlint-tsgolint 7.0.2005,
with exact dependencies and platform packages in the lockfile. npm run check passes:
27 tests, 47 compiled documentation examples and 18 executed examples. Basic and
typed lint both pass on the port examples. New tests assert strict-equality and
promise-rule diagnostic IDs/locations, nonzero coverage, failure status and clean
counterparts. Existing ESLint checks remain. No performance or full rule-parity
claim is made; no model efficacy rerun was needed for this configuration addition.

## Oxlint default and README examples (2026-10-27)

The default lint command now runs type-aware Oxlint. CI still tests the optional
ESLint recipe. All 27 tests pass; documentation checks now include README snippets:
51 TypeScript blocks compile and 21 execute. README before/after examples are
explicitly authored demonstrations, not new agent-evaluation results. The generated
pixel-art banner is stored in assets/banner.png and displayed by the README.

## Simplicity correction (2026-10-27)

All four skills now constrain added complexity to the actual contract. The README compares
equivalent search implementations and keeps execution probes in tests. npm run check:
29 tests pass, 51 documentation blocks compile, 18 marked blocks execute; two additional
tests exercise the README search/async examples. Four skill frontmatter validations pass.
The new skill-local trusted-refactor case was evaluated in four fresh processes;
both conditions passed all five criteria per run. This records a narrow regression
without a claim of superiority. See EVALUATION.md for artifacts and model/isolation limits.

## New-task effect study (2026-10-27)

The frozen writing skill was tested on three new task packages in 12 fresh solution
processes. All projects compiled and passed visible tests and hidden contract groups:
30/30 per condition. Both anonymous judging orders rated all six pairs as ties.
See EFFECT-STUDY.md for original artifacts, actual code differences, setup/runtime
incidents and limits. No skill instruction was tuned from these results.
Repository checks pass: 29 tests, 51 compiled documentation blocks and 18 marked
executions. README examples are separated from measured evidence.


## Concrete writing workflow and revision study (2026-10-27)

The writing entrypoint is 118 lines (previously 176) and adds a bundled six-part
simplification reference while preserving guide digests. Full checks pass under local
Node 26.10.0 and a checksum-verified local Node 22.13.0: 29 tests, 58 compiled documentation
blocks and 23 marked executions. The skill format validator passes. Packaging tests now
cover the frozen old-skill condition and exclude its evals from model context.

Two fresh task packages, three conditions and two repetitions produced 12 retained model
outputs. Node 22.13.0 independent checks pass for all: 24/24 behavior groups per condition,
plus compilation and visible tests. Both blind review orders tie all four new-versus-old
pairs. New-versus-no-skill has three consistent ties and one review disagreement. A
separate post-hoc 200,000-rate probe confirms a spread-call RangeError in one no-skill
output; both old/new repetitions pass. It is not counted as a frozen primary check or
claimed as a revision-specific gain. See REVISION-STUDY.md for artifacts and limits.

## Research and sequential maintenance revision (2026-10-27)

All four skills add scoped maintenance guidance (TS10), with original worked examples and
source-specific limitations. The writing entrypoint is 135 lines. The research note pins
paper versions and separates Python findings, TS maintainer experience and TS mechanisms.

Local Node 22.13.0: npm run check passes **29/29 tests**, including **64 compiled Markdown
TypeScript examples and 29 marked executions**, both lint recipes, compiler fixtures,
source/target parity, installation isolation and four Python eval-packaging tests. All four
skill-creator format validations pass. The packaging tests now verify sequential workspace
continuity, stage snapshots, hidden-grader exclusion and unavailable future requests.

Two preceding full-suite attempts failed only during temporary Git-directory cleanup:
the host's global Trace2 target notified a Git AI daemon, which recreated refs/notes/ai
while Python removed the fixture. The final run used the invocation-only environment
override GIT_TRACE2_EVENT=0. No global configuration or repository test assertion changed;
no tool-specific dependency or workaround was added to the project.

Six three-stage trajectories produced 18 retained model outputs. Independent Node 22.13.0
checks restored every checkpoint separately: compiler/visible tests pass for all 18 and
hidden behavior groups pass 28/28 per condition. All 12 continuity comparisons and all
retained source hashes match. Package scripts/compiler configuration remain unchanged.
Both anonymous review orders tie all four final comparisons. Skills/tasks stayed frozen;
no solver rerolls or post-result tuning. See [study](MAINTENANCE-STUDY.md) for artifacts,
intermediate failures, descriptive usage and limitations. These results do not demonstrate
an efficacy gain, and do not evaluate the other three skills' new guidance with a model.

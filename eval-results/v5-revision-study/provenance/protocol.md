# Prospective revision comparison

Frozen before solution generation on 2026-10-27 (Asia/Shanghai).

Hypothesis: a contract-first implementation workflow with a specific, example-backed
simplification pass improves maintainability without reducing correctness, compared with
the old broad instruction list. This is a hypothesis, not a promised outcome.

Two new multi-module business changes, revision-a and revision-b, were authored by an
isolated gpt-6.1-sol process without the target skill, prior study or proposed revision.
Both tasks are retained. The coordinator froze revised skill content before reading the
finished task packages; no task solution has been generated. The coordinator saw task
authoring events while checking progress, including some grader text before the freeze;
this is procedural separation, not perfect blinding. The tasks, rubrics and checks were
not edited after authoring. The author produced 113 and 138 initial production lines;
the first is slightly below the requested 120–220 range. No padding was added.

Conditions: no skill (without), skill at 59ccdabd7138788bd06bc1d7aa5b4bbf4fa6aa08 (old),
and frozen revised skill (with). Same task prompt, gpt-6.1-sol low, CLI 0.164.0, isolated
workspace, disabled personal skills/plugins, no network/delegation. Two repetitions per
condition per case: 12 runs. Reverse condition launch order for the second repetition.
Two workers; wall time/token totals are descriptive, not performance rankings.

Independent compiler, visible tests and six hidden behavior groups per task. Review
public required field types and changed contracts as well as runtime results. Two
blinded maintainability reviews compare revised versus no skill and revised versus old,
with A/B reversed in the second review. Preserve disagreements and ties. Do not convert
line count, test quantity or comments into a beauty score. A correctness regression
precludes calling a pair an improvement. Keep all outputs, including failures.

The same model family authors, solves and judges; the sample is small and artificial.
No general efficacy claim, causal certainty, or cross-model claim follows. Prior v4 null
results remain published. Do not tune the revised skill or select new runs after seeing
these results. If this revision ties, report that and retain the more focused guidance
only as a design change, not demonstrated superiority.

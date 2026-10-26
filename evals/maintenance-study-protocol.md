# Sequential maintenance comparison

Frozen before solution generation, 2026-10-27 (Asia/Shanghai).

Hypothesis: identifying replacement ownership, shared policy, stale paths and type/check
escapes helps repeated TypeScript maintenance without introducing speculative machinery.

A fresh task-author process received no skills, earlier studies, proposed edits or condition
labels. It authored one private training application and three chronological requests:
waitlisting, paused admissions, then an explicitly authorized transition to reserved seat
offers. The coordinator froze all revised skill files before reading the finished task.
The case, prompts, rubrics and graders are retained without edits or reference solutions.
This scenario follows the research question by design; it is not a representative sample.

Conditions: no skill (without), writing skill at 4be4709d4ea8fe6cc9eedb9e46ed99c9e2ae7372
(old), and the frozen revised writing skill (with). Two repetitions per condition: six
trajectories, each with three checkpoints, for 18 solver calls. All use gpt-6.1-sol, low
reasoning, CLI 0.164.0, an eight-minute instruction and a 600-second transport timeout.
Two workers; condition submission order reverses on repetition two.

Each checkpoint is a fresh process in that trajectory's existing workspace. The code,
tests and configuration are inherited from its own previous checkpoint, not reset to an
ideal solution. Earlier request text accompanies the current request; future requests and
all hidden grading material stay outside the workspace. Conversation history does not
carry across checkpoints. Old/new receive the same activation instruction and their own
supplied skill without evals. Personal skills, plugins and automatic project docs are
disabled using the same invocation controls as prior studies.

Unlike earlier runs, input files are committed locally so git diff works. The harness
commits each completed checkpoint using invocation-local identity, no hooks or signing;
no global Git configuration is changed. Start/end content hashes establish continuity.
Snapshots, original traces, process failures and all outputs are kept. No rerolls, selective
omissions or skill tuning after results. Later checkpoints continue even after a failed
solver process; that history is retained.

After all generation, restore each checkpoint snapshot in a separate verification
workspace. Check compilation, its visible tests, and that stage's independent hidden
behavior groups on Node 22.13.0. Failed groups count as failures even when the grader exits
zero. Retired behavior is not required at later stages. Inspect type and check changes.
Do not reveal hidden scores or graders to later checkpoint solvers.

Two anonymous reviews compare each final revised result against no skill and old, retaining
earlier snapshots for maintenance context. Swap A/B in the second review. Use the frozen
rubric: correctness, caller transition, policy reuse, concrete maintenance cost, type/check
integrity and independent evidence. Preserve ties/disagreements. Do not use lines, number
of helpers, comments, removed exports or test quantity as a beauty score.

This tests only the writing skill on one synthetic trajectory. Port/review/verify guidance
changes receive deterministic example/packaging checks, not a claimed model-effect study.
The same model family authors, solves and judges. Short horizons, fresh process context,
explicit contracts and machine judgment limit generalization. No universal quality gain,
causal certainty, cross-model superiority or performance claim follows. Previous null
results remain available; inconclusive outcomes are reported as such.

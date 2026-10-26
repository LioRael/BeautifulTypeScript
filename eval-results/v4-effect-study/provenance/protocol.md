# New-task effect study: frozen protocol

Scope: typescript-best-practices at commit 3c100f7. No skill instruction changes
during the study. This tests explicit invocation, not automatic skill discovery.

Three new tasks are authored in a fresh process without the skill, README, previous
examples or condition descriptions. The task author receives only a task mix and
packaging requirements: trusted internal data, an async component, and an external
input boundary. No reference implementation is supplied. The coordinating author
checks the tasks for ambiguity and grader defects before freezing them. This is
separation of context, not an independently recruited human task designer.

Use the same pinned model alias and reasoning setting for every solution:
gpt-6.1-sol, low, Codex CLI 0.164.0. A preflight recorded the CLI banner and returned
an empty skill catalog. The alias is mutable, not an immutable weights snapshot.

Run each task twice per condition (12 fresh solution processes). Repeat two reverses
condition order. Both conditions receive identical project/task inputs; only with-skill
receives the instruction folder, excluding evals. Freeze prompts, cases, rubric,
skill and runner hashes before solving. Retain every run, including failure/timeout.
Use two workers; timings and token usage are descriptive, not performance conclusions.

Assess separately:
- Correctness: compile and run hidden contract checks in each resulting workspace,
  also run visible tests. Do not let altered tests or a successful process exit
  substitute for independent checks.
- Scope: inspect signature, dependency/config, caller and unrelated file changes.
- Maintainability: compare complete implementations, including added helpers.
  Prefer direct intent and appropriate types; penalize speculative guards, fallback
  success, wrappers or abstractions only when unsupported by the actual contract.
  Retain necessary validation and error handling. Shorter is not automatically better.
- Evidence: inspect traces for isolation violations and what was really executed.

After outputs are frozen, give a separate fresh judging process the original contract,
frozen rubric, anonymized A/B artifacts and independent check summaries. Do not supply
condition labels, skills, solution transcripts or token/timing data. Repeat the blind
review with A/B reversed. Publish both judgments; disagreement is inconclusive, not a win.
Machine judging remains subjective and may share model biases. The coordinating author
also inspects the code and states disagreements.

No skill tuning, task replacement, selective reruns, or rewording a rubric after seeing
solution results. Fixing an infrastructure or grader defect must be recorded explicitly.
Report paired wins/ties/losses and concrete evidence, not a synthetic beauty percentage.
Three tasks and two repetitions cannot establish general effectiveness. Do not pool
these with reused examples or historical runs. A tie or regression is a valid outcome.

Setup note: an explicitly requested effort of none was rejected before task authoring.
No task or solution was produced. All subsequent author/solution/judge processes use low.

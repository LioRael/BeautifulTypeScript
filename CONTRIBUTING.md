# Contributing

Keep skills small and independently installable. Propose a rule with its source, scope,
concrete failure case and exceptions; label project methodology rather than inventing an
upstream mandate. Update the relevant source digest or workflow reference and the
repository-level docs/SOURCES.md index when its mappings change. Do not duplicate the
source index in each skill. Keep local reference links inside the installable skill.
For digests, identify the source/owner, review date, scope, source advice, our decisions
and concrete verification. Prefer short paraphrases and original applications to copying
upstream passages. Link the relevant reference from SKILL.md with a reason to read it.
Do not copy large upstream passages. Add a negative and positive fixture for a new explicit
lint rule, or a behavior test for a new example. Run npm ci, npm run check and, for performance
changes, npm run benchmark. Keep raw results and disclose regressions/noise.

Agent evaluations are separate from fixture tests. To compare skill effectiveness, run
identical task inputs in isolated clean checkouts with/without the one skill, same model
version/settings/tools and multiple repetitions. Hide expected results from the agent;
score correctness, project-constraint preservation, unsupported claims and test coverage.
Retain prompts, transcripts, token/time costs, rubric and failures. Do not infer an agent
success rate from this repository's deterministic tests. Useful tasks: unknown API input
without a new schema dependency; review a floating rejection without style false positives;
port a numeric-key Python map; verify a browser app without claiming a Node-only test proves it.

The [paired evaluation harness](evals/README.md) provides frozen task inputs, a rubric
and fresh-process execution. Use a new output directory for every evaluation; keep failures
and score evidence. Do not change skills or task inputs midway through a measured run.

# Contributing

Keep skills small and independently installable. Propose a rule with its source, scope,
concrete failure case and exceptions; label project methodology rather than inventing an
upstream mandate. Update docs/SOURCES.md and all four bundled references together.
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

# Agent-written TypeScript: code quality and accumulation

Research date: **2026-10-27**. This note separates measured agent behavior, maintainer
experience, TypeScript mechanisms, and proposed interventions. Papers are version-pinned; living
documentation was checked on the research date. No source establishes that GPT is uniquely
prone to defensive TypeScript or gives a representative prevalence rate for every pattern
listed here.

The practical target is **less work for the next reader and the next change, under the
actual contract**. A short function can still hide duplicated policy, weak types or an
extra execution path. A larger function can legitimately own validation, resource cleanup
or an efficient algorithm. Neither line count nor a green test suite settles that question.

## What external evidence supports

**Iterative deterioration is a distinct evaluation problem.** SlopCodeBench v2, revised
2026-05-07, expands to 36 problems, 196 checkpoints and 15 coding agents; its repository
comparison now includes 473 Python projects. Agents extend their own previous solutions.
Quality guidance improves structural measures, but incurs higher cost and lower strict
pass rates on average without generally eliminating iterative deterioration. The reported
experiments remain the **Python track**, despite language-agnostic task design; its rates
must not be described as TypeScript findings. Duplication and complexity measures are
proxies, not proof of human maintenance time. The relevant lesson is to test successive
changes while retaining each agent's own earlier code.
[SlopCodeBench v2](https://arxiv.org/html/2603.24755v2)

**More instruction is not automatically better instruction.** Evaluating AGENTS.md v3,
revised 2026-09-29, uses 300 SWE-bench Lite tasks and 138 CTXbench tasks from 12 additional
Python repositories. Neither generated nor developer-provided context shows a statistically
significant success improvement over no context in its comparisons; developer files do
outperform generated ones. Context increases exploration and cost. The revision also finds
no strong relationship between file length and performance. This does not evaluate these
Skills, TypeScript or code beauty: shortening an entrypoint alone is not a demonstrated
intervention. Keep useful nonstandard project requirements and evaluate changes, rather
than treating more instructions—or fewer words—as an automatic improvement.
[Evaluating AGENTS.md v3](https://arxiv.org/html/2602.11988v3)

**There is direct TypeScript maintainer evidence of review burden.** The living
typescript-eslint AI contribution policy describes low-quality AI-assisted contributions
consuming substantial review and iteration effort. It asks contributors to understand their
changes and notes that prose restating a diff is not a useful explanation. This is
first-party operational experience, not a controlled study or a count of specific code
smells. It supports reviewing scope and explaining behavior, rather than treating generated
volume or lengthy PR descriptions as evidence of quality.
[typescript-eslint AI contribution policy](https://typescript-eslint.io/contributing/ai-policy/)

**Vendor comparisons need narrower interpretation than their headlines.** CodeRabbit's
2025-12-17 report summary describes 470 open-source PRs classified using AI-authorship
signals. It explicitly acknowledges that the supposedly human group may include AI work.
The public summary does not supply a TypeScript-specific controlled comparison, and the
full report is form-gated. We therefore use it only as supporting motivation to inspect
readability, error handling and concurrency—not as a causal defect multiplier or a ranking
of models. No vendor percentage becomes a Skill rule.
[Original report summary](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)

The search did not establish a sufficiently verified, representative set of individual
AI-authored TypeScript incidents to justify naming contributors or extrapolating frequency.
An AI-coauthor marker alone would not prove which part of a defect came from the agent.
The first-party maintainer policy above is stronger evidence than an unattributed collection
of allegedly ugly snippets.

## Why TypeScript can look safe while getting harder to maintain

These are established language/tool mechanisms, **not measured AI-specific rates**.

- **Type checking can be bypassed while remaining green.** The TypeScript Handbook states
  that assertions are erased and add no runtime check. A double assertion, asserted return
  or asserted empty object can make a changed representation appear compatible without
  establishing that its fields exist. Fix the model or narrow the actual boundary; do not
  substitute a parser for already trusted internal values. [TypeScript Handbook: assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- **Strict mode does not eliminate unsafe flow.** A typescript-eslint maintainer's
  2025-01-21 article explains that explicit and API-derived any can remain with noImplicitAny.
  Typed lint can reveal unsafe assignments, calls and returns that the compiler accepts.
  Audit a change's newly introduced escapes and follow the originating value, rather than
  celebrating a green compiler or mechanically changing every any to unknown.
  [Avoiding anys](https://typescript-eslint.io/blog/avoiding-anys/)
- **Removing every apparent defensive check is also wrong.** The no-unnecessary-condition
  documentation notes false reports when declared types differ from runtime reality,
  including optimistic indexed access and mutation across calls. Check caller guarantees
  and compiler settings before deleting a guard. A scoped suppression can be warranted
  when it records a demonstrated tool limitation; blanket disabling hides the distinction.
  [Rule and limitations](https://typescript-eslint.io/rules/no-unnecessary-condition/#limitations)
- **Generic-looking APIs can conceal unproved promises.** The no-unnecessary-type-parameters
  rule explains that a type parameter should express a relationship, and that unneeded
  parameters can hide assertions. Its own limitations caution against mechanical rewriting.
  Inspect what the caller can choose versus what the implementation actually produces;
  neither generics nor concrete types deserve a universal ban.
  [Rule and limitations](https://typescript-eslint.io/rules/no-unnecessary-type-parameters/)
- **Framework state can duplicate an existing source of truth.** React's living guidance
  distinguishes external synchronization from calculating data for rendering. Mirroring
  derived data into state with an Effect adds synchronization work and intermediate stale
  renders. In React projects, derive such values where appropriate and keep Effects that
  synchronize real external systems. This is React guidance, not a rule for every framework
  or a reason to rewrite an application's existing data-fetching architecture.
  [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

## Failure mechanisms to turn into decisions

The following is our synthesis for Skill design. A suspicious pattern starts an
investigation; it does not prove a defect or require a new abstraction.

| Accumulating pattern | Concrete question and action | Evidence needed to keep it |
|---|---|---|
| New path wrapped around old path | Is this addition or replacement? Trace callers, then update the owning implementation and retire the superseded internal path within scope. | A supported consumer, format, rollout or rollback requirement still uses the old path. |
| Repeated normalization, sorting, validation or rounding | Locate the existing policy and keep one authoritative implementation. Validate an untrusted value before passing its trusted representation onward. | Similar code may implement genuinely different contracts; superficial resemblance is insufficient for merging. |
| Optional fields, defaults and catches hiding invalid states | Separate actual absence from failure. Remove an invented success fallback; preserve the existing error channel and required checks. | A documented optional state or caller-observed recovery behavior. |
| Wrapper and interface chains for one operation | Follow the real call path. Inline a layer that adds neither policy nor useful domain meaning. | Public compatibility, meaningful naming, an actual alternate implementation, ownership or lifecycle responsibility. |
| New any/assertion/suppression or weakened configuration | Trace the incompatible producer/consumer before accepting the escape. Compare checks and coverage before and after. | A specific tool/type limitation, narrow scope and a remaining behavioral check. |
| Duplicated state or representations | Identify who owns the fact. Derive views instead of maintaining synchronized copies where the framework permits. | A genuine snapshot, independently evolving state, wire representation or ownership boundary. |
| Stale flags, tests, exports and dependencies | Follow references and supported entrypoints when completing a replacement. Remove obsolete support material together with the implementation. | External consumers or dynamic registration may not be visible to a text search. |
| Tests reproducing the implementation's decisions | Assert caller-visible behavior and a regression independently of the new helper. Keep failure and ownership cases where relevant. | Internal structure can be a contract for a specific test, but needs an explicit reason. |

For ports, temporary duplication can be intentional: source and target implementations
may both be needed for differential checks and rollback. Record their roles and the actual
cutover condition. Do not delete the source merely to meet a cleanliness target. Conversely,
a completed internal replacement should not acquire an indefinite compatibility layer just
because retaining old code feels safer.

## What our previous measurements did and did not establish

The [v4 study](EFFECT-STUDY.md) found repeated normalization and failure shapes in some
skill-assisted outputs, but both conditions passed all frozen checks and anonymous reviews
tied. The [v5 revision study](REVISION-STUDY.md) found no stable advantage over the old
skill. All three conditions passed the frozen checks; a separately reproduced large-array
failure affected one no-skill output and was avoided by both skill versions. That is a
specific defect, not evidence that the latest revision caused a general improvement.

Those tasks were small, synthetic and mostly single-change implementations with detailed
contracts. The same model family authored, solved and judged them. They test whether the
agent implements the supplied behavior; they provide little evidence about accumulation
under repeated maintenance. Repeating those tasks after inspecting their solutions would
be development testing, not a fresh generalization result.

A better next test keeps each condition's implementation across a sequence: introduce a
feature, change a requirement, then complete a replacement or maintenance change. Specify
public behavior and compatibility requirements without prescribing helper names or internal
shape. Freeze tasks, hidden checks and criteria before runs. Check current correctness,
required public compatibility and concrete leftover paths separately. Review how many
places now own the same policy and what the next change must coordinate. Preserve ties,
failures and justified temporary duplication; never make deletion count, file count or
shortest code the winning condition.

This investigation supports a narrower intervention: teach agents to identify what a
change replaces, keep one owner for each policy, and verify the removed path as well as
the added behavior. That is a testable design hypothesis. It is not a claim that adding
another document has already solved agent-generated technical debt.

The subsequent [sequential maintenance study](MAINTENANCE-STUDY.md) tested this hypothesis
with 18 solver calls. All conditions passed the frozen checks and both anonymous review
orders tied every comparison. It did not demonstrate a benefit for the revision.

# A more concrete writing workflow: revision study

**The instructions are more focused; this study did not establish a stable quality gain
over the old skill.** All three conditions passed the frozen runtime checks. Both orders
of blinded review tied every revised-versus-old pair. A reviewer found one real large-array
failure in a no-skill output, reproduced separately; both old and revised skill outputs
avoided it. It is not a benefit unique to the revision.

## What changed

The previous writing skill mostly listed broad TypeScript advice. The revised entrypoint
has 118 lines instead of 176 and gives four concrete phases: establish the existing
contract and policy, implement directly, simplify the diff, and verify it. The authoritative
guide digests remain intact. A smaller entrypoint does not imply lower total token use.

The new [simplification reference](../skills/typescript-best-practices/references/simplification.md)
works through six choices with original before/after examples: name a repeated decision,
express the requested operation, combine equivalent branches, remove a meaningless layer,
trust established internal types, and retain justified copies/state/checks. It explicitly
preserves actual validation, errors, ordering and ownership. It is project guidance,
not a rule falsely attributed to Google or Microsoft.

This addresses observed repetition in the [previous study](EFFECT-STUDY.md), particularly
repeated normalization and failure shapes. It also clarifies that a guard accepting unknown
can narrow an array element directly; a separate unknown[] alias is not always necessary.
We did not rerun those known tasks and call them new evidence.

## Frozen checks and blind comparisons

Two new multi-module changes were evaluated: delivery quote failure isolation and mixed-cart
promotion eligibility. Each has six independent behavior groups and two repetitions in
three conditions. Counts below are groups, not individual assertions or quality scores.

| Condition | Completed | Compiled and visible tests passed | Frozen behavior groups |
|---|---:|---:|---:|
| No skill | 4/4 | 4/4 | 24/24 |
| Old skill at 59ccdab | 4/4 | 4/4 | 24/24 |
| Revised skill | 4/4 | 4/4 | 24/24 |

Independent verification used **Node 22.13.0 and TypeScript 5.9.3**. All required public
fields were present with the requested types. Every run preserved package.json and
tsconfig.json. All four revised runs read the new simplification reference, and copied
skill files still matched their frozen hashes after execution.

| Comparison | First anonymous review | A/B reversed review |
|---|---|---|
| Revised vs old, four pairs | 4 ties | 4 ties |
| Revised vs no skill, four pairs | 1 revised preference, 3 ties | 4 ties |

These are four pairs across two tasks, not four independent task categories. The second
review is an order check, not another independent experiment. We retain the disagreement
instead of turning one preference into a stable win.

[Summary](../eval-results/v5-revision-study/summary.json),
[run metadata](../eval-results/v5-revision-study/runs.json),
[first judgments](../eval-results/v5-revision-study/judge-1/verdict.json),
[reversed judgments](../eval-results/v5-revision-study/judge-2/verdict.json), and
[blinding map](../eval-results/v5-revision-study/blinding-map.json) are retained.

## What the code actually did

All six cart implementations have byte-identical cart.ts. They add an eligible accumulator
to the existing pricing loop, reuse checked addition and promotionDiscount, and preserve
the full subtotal for the final price. There is no unique skill-generated simplification
in this task.

Delivery implementations share the same all-settled strategy. Revised repetition 1 is
executable-equivalent to old repetition 1; revised repetition 2 is executable-equivalent
to no-skill repetition 2 in quotes.ts. Comments, failure-array forwarding copies and test
layouts differ. Old repetition 2 uses flatMap/filter; the revised version uses one ordered
loop. The reviewers found both understandable under the stated contract.

| Task/repetition | No skill | Old | Revised |
|---|---|---|---|
| Delivery 1 | [code](../eval-results/v5-revision-study/revision-a-without-1/artifacts/src/quotes.ts) | [code](../eval-results/v5-revision-study/revision-a-old-1/artifacts/src/quotes.ts) | [code](../eval-results/v5-revision-study/revision-a-with-1/artifacts/src/quotes.ts) |
| Delivery 2 | [code](../eval-results/v5-revision-study/revision-a-without-2/artifacts/src/quotes.ts) | [code](../eval-results/v5-revision-study/revision-a-old-2/artifacts/src/quotes.ts) | [code](../eval-results/v5-revision-study/revision-a-with-2/artifacts/src/quotes.ts) |
| Cart 1 | [code](../eval-results/v5-revision-study/revision-b-without-1/artifacts/src/cart.ts) | [code](../eval-results/v5-revision-study/revision-b-old-1/artifacts/src/cart.ts) | [code](../eval-results/v5-revision-study/revision-b-with-1/artifacts/src/cart.ts) |
| Cart 2 | [code](../eval-results/v5-revision-study/revision-b-without-2/artifacts/src/cart.ts) | [code](../eval-results/v5-revision-study/revision-b-old-2/artifacts/src/cart.ts) | [code](../eval-results/v5-revision-study/revision-b-with-2/artifacts/src/cart.ts) |

### A real defect found after the frozen checks

The first blind review noticed that no-skill delivery repetition 1 used
options.push(...batch.value). Spreading a large array into function arguments can exceed
the runtime's argument limit. The reversed review did not flag this and rated the pair
a tie. The task contract imposed no rate-count limit.

We then ran the **unchanged, built implementations** with 200,000 valid rates from one
carrier on Node 22.13.0. That no-skill output threw RangeError: Maximum call stack size
exceeded. The other five delivery outputs returned all 200,000 options, including both
old and both revised skill runs. Their loops did not need an extra defensive size check.

This is a post-hoc diagnostic, not part of the frozen 24/24 counts, and it is not a
representative workload or performance benchmark. It confirms a specific failure; it does
not establish general superiority or an improvement over the old skill. The original
judgments and primary scores remain unchanged. See the
[diagnostic source](../eval-results/v5-revision-study/provenance/large-batch-diagnostic.mjs)
and [all six outcomes](../eval-results/v5-revision-study/posthoc-large-batch.json).

## Method and limits

The [protocol](../evals/revision-study-protocol.md) preceded solution generation. A fresh
task-author process received no target skill, prior study or proposed revision. It supplied
tasks, starting projects, tests and rubrics with no reference solutions. The coordinator
froze the revision before reading the completed packages, but had seen some authoring
log/grader text while checking progress. This is procedural separation, not perfect
blinding. Neither task was discarded or edited. The first task had 113 initial production
lines, slightly below the requested 120–220; the second had 138. No padding was added.

All accepted author, solution and judge runs used gpt-6.1-sol, low effort, Codex CLI
0.164.0. Solvers used fresh local Git workspaces, disabled personal skills/plugins and
the same task prompt. Only old/with received the corresponding skill and the same
activation instruction. Skill-local evals were excluded. Second-repetition condition
submission order was reversed. No solution was rerolled, no result was dropped, and
no skill instruction was tuned after seeing these outputs.

Two solver runs encountered host mise startup errors and recovered with invocation-local
Node selection. Solver checks used installed Node 26 versions. Independent post-run checks
used a local Node 22.13.0 archive verified against the official checksum list. No global
runtime configuration was changed. Timings and usage are retained but are not speed evidence.
Trace inspection found no observed reads of hidden graders or other solution workspaces;
read isolation also relies on instructions, not a hermetic container. One old-skill run
used a temporary directory for its declaration consumer check.

The same model family authored, solved and judged these synthetic tasks. Both task prompts
state detailed contracts, and the existing code supplies much of the implementation shape;
that leaves limited room to measure a writing-skill effect. Automatic activation, other
models, larger repositories and the review/port/verify skills were not evaluated. The
revised workflow is retained as clearer, more concrete guidance, **not as a proven quality
multiplier**. The previous null results remain available.

[Manifest and content hashes](../eval-results/v5-revision-study/manifest.json),
[author prompt](../eval-results/v5-revision-study/provenance/author-prompt.txt),
[author validation](../eval-results/v5-revision-study/provenance/author-validation.md), and
[environment](../eval-results/v5-revision-study/provenance/environment.json) document the
experiment. Each run directory also holds the exact prompt, artifacts, events and checks.

## Reproduce

Install locked dependencies with npm ci. Extract the old skills into a separate directory,
then use fresh output/work directories. These commands make model calls and consume quota.
Use the recorded commit/hashes for the revised content when reproducing this experiment.

```sh
mkdir -p work/revision-reproduction/old
# The old tree includes evals; the runner excludes them from supplied skill content.
git archive 59ccdabd7138788bd06bc1d7aa5b4bbf4fa6aa08 skills/typescript-best-practices \
  | tar -x -C work/revision-reproduction/old
python3 evals/run.py --cases revision-a revision-b \
  --model gpt-6.1-sol --effort low --repetitions 2 --workers 2 \
  --old-skill-root work/revision-reproduction/old/skills \
  --old-skill-label 59ccdabd7138788bd06bc1d7aa5b4bbf4fa6aa08 \
  --work work/revision-reproduction/solutions --output eval-results/new-revision
python3 evals/verify-effect-study.py \
  --node /absolute/path/to/node22 \
  --work work/revision-reproduction/solutions --results eval-results/new-revision
python3 evals/judge-effect-study.py \
  --work work/revision-reproduction --results eval-results/new-revision \
  --baselines without old
```

The extra diagnostic accepts one built solution workspace as its argument. Keep it
separate from primary checks when reproducing the recorded protocol.

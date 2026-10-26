# New-task comparison: does the writing skill improve the code?

**Result: no stable advantage was demonstrated in this study.** Across three new tasks
and 12 solution runs, both conditions passed every independent contract check. Both
orders of anonymous machine review rated all six pairs as ties. The raw code shows
different choices, including more repetitive code in one skill-assisted task.

This evaluates typescript-best-practices at 3c100f7, not the other three skills.

## Results

Each task has two runs per condition. Counts are independent contract-check groups,
not individual assertions, percentage improvements, or a beauty score.

| Task | Without skill | With skill | Anonymous comparison, both orders |
|---|---:|---:|---|
| Room workload report | 8/8 | 8/8 | Both pairs tied |
| Preview cache invalidation | 12/12 | 12/12 | Both pairs tied |
| Sensor ingestion boundary | 10/10 | 10/10 | Both pairs tied |
| Total | 30/30 | 30/30 | 0 wins, 6 ties, 0 losses for the skill |

All 12 generated projects compiled, and all visible test suites passed on independent
rerun. Every solution preserved package.json and tsconfig.json. Production changes
stayed in the requested module; no new production dependency or framework appeared.

[Machine-readable results](../eval-results/v4-effect-study/summary.json) and
[all run metadata](../eval-results/v4-effect-study/runs.json) retain the counts.
Two judgments of one pair are not two independent task samples.

## What the actual code shows

### Room report: different reasonable algorithms

Both skill-assisted runs reused confirmedBookings and used per-room filter/reduce.
Both baselines aggregated through a local Map. The former uses less mutable intermediate
state; the latter scans bookings once and scales differently with the number of rooms.
The task specified no workload/performance requirement. These are reasonable tradeoffs,
not evidence that one algorithm is universally more beautiful or faster.

Production nonempty lines, including unchanged code, were 76/79 without the skill and
72/72 with it. These counts are descriptive; they do not determine the result.

- Repetition 1: [without](../eval-results/v4-effect-study/effect-internal-without-1/artifacts/src/plan.ts), [with](../eval-results/v4-effect-study/effect-internal-with-1/artifacts/src/plan.ts).
- Repetition 2: [without](../eval-results/v4-effect-study/effect-internal-without-2/artifacts/src/plan.ts), [with](../eval-results/v4-effect-study/effect-internal-with-2/artifacts/src/plan.ts).

### Preview cache: the same executable fix

All four implementations deferred loader invocation into a promise, then checked request
identity before updating cache state. Within each pair the executable implementation
is identical; only comments differ. This excerpt is from the recorded output:

```typescript
const request = Promise.resolve().then(() => this.load(documentId)).then(
  (preview) => {
    if (this.pending.get(documentId) === request) {
      this.values.set(documentId, preview);
      this.pending.delete(documentId);
    }
    return preview;
  },
  (error: unknown) => {
    if (this.pending.get(documentId) === request) {
      this.pending.delete(documentId);
    }
    throw error;
  },
);
```

This is the exact excerpt from baseline repetition 1. Skill repetition 1 adds an
explanatory comment above the identity check. It supplies no unique functional fix.

- Repetition 1: [without](../eval-results/v4-effect-study/effect-async-without-1/artifacts/src/preview-cache.ts), [with](../eval-results/v4-effect-study/effect-async-with-1/artifacts/src/preview-cache.ts).
- Repetition 2: [without](../eval-results/v4-effect-study/effect-async-without-2/artifacts/src/preview-cache.ts), [with](../eval-results/v4-effect-study/effect-async-with-2/artifacts/src/preview-cache.ts).

### Sensor boundary: skill output was more repetitive

Both conditions correctly implemented the necessary validation, rejected malformed batches,
and returned fresh normalized data. Both baselines computed the trimmed ID once and reused
a local failure value. Both skill-assisted runs repeated the failure literal; repetition 2
also repeated sensorId.trim() in two checks and in the returned value. The skill outputs
explicitly treated array elements as unknown before narrowing them; the baselines guarded
each element with the same runtime record check.

Nonempty production lines were 63/63 without the skill and 70/75 with it. Braces and
formatting explain part of that increase, so line counts alone are not a defect.

The coordinating author's assessment: repeated trimming and failure shapes make the
second skill output less concise locally. The blind reviewer judged those differences
too small to establish a material maintenance disadvantage. We retain that disagreement.
Neither condition omitted required validation or added speculative proxy/cycle handling.

- Repetition 1: [without](../eval-results/v4-effect-study/effect-boundary-without-1/artifacts/src/sensor.ts), [with](../eval-results/v4-effect-study/effect-boundary-with-1/artifacts/src/sensor.ts).
- Repetition 2: [without](../eval-results/v4-effect-study/effect-boundary-without-2/artifacts/src/sensor.ts), [with](../eval-results/v4-effect-study/effect-boundary-with-2/artifacts/src/sensor.ts).

## Method and frozen evidence

The [protocol](../evals/effect-study-protocol.md) was written before solution runs.
A fresh task-author process received a neutral task mix and packaging requirements,
including the target skill name for metadata. It received no skill contents, README,
earlier examples or solution condition descriptions. It produced the three cases,
visible tests, hidden checks and rubrics without a reference implementation. The
coordinating author checked their contracts and graders before freezing them.
This is context separation, not independently recruited human task design.

Every solution used Codex CLI 0.164.0 with the explicit gpt-6.1-sol alias and low reasoning
effort. Two fresh runs per condition, per task, reversed condition order on repetition two.
Two workers ran concurrently. Only the with-skill condition received the skill folder
and an instruction to apply it; evals were excluded. Skills were not edited during the
experiment. The [manifest](../eval-results/v4-effect-study/manifest.json) records task,
prompt, rubric, skill and runner hashes.

A separate checker compiled outputs and executed frozen hidden checks after all
solution processes finished. It also reran visible tests. Per-run verification.json
contains the outputs; solver-authored tests do not replace the hidden checks.

Two fresh judging processes received anonymized A/B artifacts, original contracts,
rubrics and independent check summaries. They received no skill, condition mapping,
solution transcripts or timing/token data. The second pass reversed every A/B assignment.
Judges left candidate files unchanged. Both used the same model alias/effort.
The author also inspected production diffs and command traces.

- [First blind judgment](../eval-results/v4-effect-study/judge-1/verdict.json)
- [Reversed-label judgment](../eval-results/v4-effect-study/judge-2/verdict.json)
- [Label mapping, disclosed after review](../eval-results/v4-effect-study/blinding-map.json)
- [Task-author prompt](../eval-results/v4-effect-study/provenance/author-prompt.txt)
- [Initial baseline validation](../eval-results/v4-effect-study/provenance/author-validation.md)
- [Environment/preflight](../eval-results/v4-effect-study/provenance/environment.json)

## Limits and infrastructure incidents

Three small synthetic tasks and two repetitions cannot establish general effectiveness.
The same model family authored tasks, solved them and judged outputs; shared preferences
and selection bias remain. Anonymous labels reduce condition cues but do not make machine
judgment objective or equivalent to human blind review. The served alias is mutable.

The preflight reported an empty skill catalog with user configuration/AGENTS loading,
plugins and skill search disabled. Workspace isolation is not a hermetic read sandbox.
Traces show local task/skill reads and tool discovery, including host PATH inspection
during recovery, but no observed reads of hidden graders or other solution workspaces.

An explicit effort of none was rejected during setup, before tasks or solutions were
produced; all accepted author, solution and judge runs used low. Four solution runs hit
host mise startup errors and recovered through invocation-local Node selection. No solution
run was dropped or selectively rerun. Failures remain in the traces; incidental host
metadata is redacted in public copies.

Independent checks ran on local macOS arm64 with Node 26.10.0. Some solver checks used
Node 26.12.1 after recovery. The tasks name Node 22, which this experiment did not execute.
Repository CI on Node 22/24 is separate and does not execute these generated artifacts
there. Timings/usage are retained but are unsuitable for speed claims.

Automatic activation, other models, frameworks, larger repositories, and review/port/verify
skills were not tested here. Current evidence supports reporting the measured tie;
it does not support advertising demonstrated general quality gains.

## Reproduce

```sh
npm ci
python3 evals/run.py --cases effect-internal effect-async effect-boundary \
  --model gpt-6.1-sol --effort low --repetitions 2 --workers 2 \
  --work work/new-study/solutions --output eval-results/new-study
python3 evals/verify-effect-study.py \
  --work work/new-study/solutions --results eval-results/new-study
python3 evals/judge-effect-study.py \
  --work work/new-study --results eval-results/new-study
```

Use fresh directories. Model calls consume account quota. The mapping is kept outside
judge workspaces, and judge settings are pinned in the retained runner. Compare content
hashes and runtime versions before interpreting reproduction differences.

---
name: typescript-review
description: Review TypeScript files or diffs for actionable correctness, API, async and runtime issues. Use for reviews; do not rewrite the project unless asked.
---

# TypeScript review

Produce actionable findings for the requested scope. Review does not imply permission to
rewrite source, apply a new preset or impose a preferred architecture.
A missing guard is not a defect without a reachable invalid input. Trace existing
validation and caller guarantees first; do not invent null cases for a trusted internal
type. Prefer a remedy that removes the cause with the fewest new concepts.

## 1. Establish scope and baseline (TS01)

Record whether this is a diff, module, application or public library review. Read applicable
instructions, scripts, supported runtimes and nearby call sites. For a diff, fix the base
revision and inspect changed lines plus code they affect; distinguish pre-existing issues.
For a module review, follow its public callers so a concern has a real execution path.

Read contracts/comments/tests before classifying an unusual behavior as a bug. A documented
compatibility quirk may be intentional; an undocumented assumption needs evidence.

## 2. Use mechanical checks, then inspect behavior (TS09)

Inspect scripts before running the relevant existing typecheck, lint, tests and build.
Do not run deployment/integration scripts with external side effects merely because they
are named tests. Record scope and results. A green script with zero files/tests is a
coverage gap. Group repeated diagnostics and distinguish parser/setup failures from
actual rule violations. Do not paste a wall of lint output as the review.

If tools are unavailable, continue source review and identify what remains unverified.
Do not claim a passing typecheck establishes runtime safety or public-package usability.

## 3. Review in consequence order

### Boundary correctness and state (TS02, TS03)

- Follow unknown input to its first trusted use. Check container, required properties,
  discriminants and domain limits; assertions and predicates can claim more than they prove.
- Check defaulting: does zero/false/empty survive when valid? Does explicit null differ
  from missing? Does coercion accept inputs that should fail?
- Check number precision/range and JSON round trips where data crosses languages or storage.
- Check aliases, in-place sorting/mutation and ownership. A readonly annotation is not
  runtime immutability. Identify the caller that observes an unexpected change.
- Check ordering, duplicate keys and object-key assumptions when output is observable.
  Distinguish the order used to select/filter items from the order used to execute side
  effects or present results. Trace each promised order through the full pipeline;
  fixing mutation or awaiting a loop may leave a separate ordering defect intact.

### Errors, async and resources (TS04)

- Follow completion and rejection ownership. Look for async callbacks passed to APIs
  that discard returns, detached promises and catches that convert failure to success.
- Compare sequential versus concurrent side effects. Does a later operation start after
  a failure when the contract says stop? Is concurrency bounded where resources require it?
- Check whether cancellation/timeout reaches the work, and whether cleanup occurs on
  rejection and early return. A passed signal or finally keyword alone is not proof.
- Preserve actionable error identity/context. Check retry safety and partial writes.

### Public API and deployment (TS03, TS05)

- Check changed exports, callback arity, optional arguments, overload order and return
  relationships against supported consumers, not only the implementation's build.
- Check declaration output, package exports and actual runtime import resolution.
- Check host-specific globals/imports and accidental use of unsupported runtime features.
- Distinguish a framework-required convention from a generic style preference.

### Maintainability, tests and performance (TS07, TS08, TS10)

- Trace an added path against the behavior it replaces. Check affected callers, duplicate
  policy, old flags/exports and extra state; distinguish a supported compatibility route
  from an obsolete internal path. Show a divergence or actual next-change burden before
  reporting debt. A wrapper, long file or repeated-looking expression alone is not a finding.
- Inspect new any/assertions/suppressions, config exclusions and changed test expectations.
  Trace whether they establish the contract or conceal a mismatch. Preserve justified
  interop and negative type tests; do not mechanically ban every escape.
- Identify abstractions or unsafe types that conceal a concrete invariant or caller burden.
- Check that tests observe behavior, exercise important failure paths and actually run.
- Require equal workloads/results for a performance claim. Do not infer a bottleneck
  solely from a loop or claim a new collection type is faster without measurements.
- Omit punctuation, type/interface and default-export preferences unless a project rule
  or a specific consequence makes them relevant. Do not invent findings to fill a quota.

### Concrete checks that types alone miss

| Suspicious code | Establish before reporting | Minimal direction |
|---|---|---|
| `value || defaultValue` | Is zero/false/empty a supported input? | Default only on the contract's absent state |
| `JSON.parse(text) as Payload` | Does an earlier boundary already validate the whole shape? | Validate at the first untrusted boundary if not |
| `jobs.sort(...)` | Does the caller retain ownership? Does selection order differ from execution order? | Copy if needed; restore the required execution order separately |
| `rows.forEach(async ...)` | Does the caller need completion and failure? | Return/await the actual operation; use sequential or bounded concurrent work as required |
| `catch { return [] }` | Is empty data a valid success distinct from failure? | Preserve the project's failure contract |
| extensionless emitted import | Will a native loader, not a development bundler, load it? | Align shipped paths and verify the real entrypoint |

For example, zero is a valid pause setting in this illustrative API:

```ts
// @example-run
function badLimit(raw?: string): number { return Number(raw) || 3; }
function limit(raw?: string): number { return raw === undefined ? 3 : Number(raw); }
if (badLimit('0') !== 3 || limit('0') !== 0 || limit() !== 3) throw new Error('Probe changed');
```

This fixes documented omission/zero behavior only. Malformed-string policy remains a
separate contract decision. A review should not invent a new validation API incidentally.

## 4. Reproduce and calibrate findings

For each suspected defect, establish a trigger and consequence. Use a small executed probe
or existing test when practical. Keep probes outside production files during a read-only
review. If the concern depends on an unknown caller or undocumented requirement, state
that uncertainty rather than presenting it as a proven defect.

Prioritize by impact:

- P1: reachable data loss, security exposure, crash or a broken supported workflow.
- P2: reproducible edge-case or compatibility regression with meaningful impact.
- P3: a concrete maintenance cost; optional taste observations should usually be omitted.

Combine multiple symptoms of one cause. For example, discarded async callbacks can cause
both early completion and lost failures; explain the contract violations together rather
than padding the report. Separate an unrelated input-mutation defect when its fix differs.

## 5. Deliver a review the author can act on

Start with scope and the most important risk. For each finding include:

1. Severity and short title.
2. Exact file:line (or a tight range), with the changed location for a diff review.
3. Trigger/input and observable consequence, including affected callers.
4. Rule/source when useful, plus the local evidence; a citation is not a reproduction.
5. Minimal remedy or small code suggestion consistent with the existing design.

End with checks actually run, their coverage and unverified assumptions. Preserve useful
existing choices rather than recommending a wholesale rewrite. If there are no supported
findings, say so without certifying the entire project as correct.

Example calibration: `JSON.parse(text) as Order` is a concern only after checking whether
validation already occurred. A default export is not a bug by itself. Inserting void
before an unowned promise is not a failure-handling fix.

### Example finding and fix

**P1 — Observe save completion (`queue.ts:9`).** The caller awaits `saveRows` before
reporting success. With two deferred saves, async forEach starts both and returns before
either completes; a rejected save cannot reject the outer operation. For a sequential,
stop-on-failure contract, the smallest correction is:

```ts
async function saveRows<T>(rows: readonly T[], save: (row: T) => Promise<void>): Promise<void> {
  for (const row of rows) await save(row);
}
```

A useful report then records the actual probe, tool results and limits: “typecheck passed;
one existing default-value test passed; the deferred/rejection probe reproduced the
completion defect; cancellation was not tested.” These are example report fields, not
results to reuse. Explain the local trigger and keep the code suggestion focused. A source
citation supports the reason; it never replaces the reproduction or the fix.

## Reference

Read [review evidence and source selection](references/review-evidence.md) when choosing
what to inspect, checking a suspected defect or calibrating findings. It includes the
rule IDs used here, official source links and false-positive controls. It works without
another installed skill. Preserve the project's framework, error and validation conventions.

The `evals/` directory contains maintainer evaluation cases and graders. It is not
additional task guidance; do not read it while applying this skill to a user project.

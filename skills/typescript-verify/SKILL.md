---
name: typescript-verify
description: Verify a TypeScript change using existing type, lint, test, build and runtime checks and report their evidence and limits. Use for validation or pre-delivery checks.
---

# TypeScript verify

Establish what was actually checked and whether the requested change is ready for its
stated environment. Never turn a failed or empty check into a pass by weakening it.
Verify the agreed contract, not every imaginable input. Do not require internal functions
to handle values their callers exclude, or reward more guards/tests as inherently better.
Check that simplification preserves behavior without moving complexity into new helpers.

## 1. Determine scope and execution safety (TS01)

Read instructions, package manager/lockfile, scripts, tsconfig references, supported hosts
and changed files. Identify affected packages and their consumers. Inspect commands before
running them: a test or build script may call services, deploy, publish or alter external
data. Use local checks within the task's authorization; report unavailable integrations.

Respect the repository's toolchain and framework commands. A generic tsc invocation can
miss framework-generated types or workspace references. Installing this skill does not
authorize new compiler versions, global config edits or changing package managers.

## 2. Build an evidence plan from the actual change

| Check | What to establish | When relevant |
|---|---|---|
| Typecheck | Correct config, packages and input files were checked | Type/API/config changes |
| Lint/format check | Changed files matched the intended rules | Source/config changes |
| Tests | Tests were discovered and exercised behavior | Behavior changes and bug fixes |
| Build | Real production output was emitted | Packages, module/config changes, apps |
| Runtime smoke | Built entrypoint works on the supported host | Deployment/module/API changes |
| Consumer check | Public exports/declarations work outside source aliases | Reusable libraries |

Use the [verification matrix](references/verification-matrix.md) for evidence limits and
source links. A small change need not run every possible integration, but every claimed
support boundary needs evidence or an explicit gap.

## 3. Run checks and examine their coverage (TS09)

Capture command, working package/config, exit status and useful summary. Do not reduce
success to exit code alone:

- Read script bodies. A placeholder echo, disabled runner or stale generated artifact can
  exit zero without validating anything.
- Check file/test counts, filters and include/exclude settings. Zero tests or zero linted
  files is a coverage gap unless that empty scope is intentionally unrelated to the task.
- Separate a parser/configuration crash from the diagnostic a negative fixture intends
  to exercise. Pair it with a clean fixture to rule out a universally broken setup.
- Compare source and check changes: new any/assertions/suppressions, narrower include
  patterns, disabled rules, mocks and changed expectations can conceal a regression.
  Separate an authorized contract update from weakening retained guarantees.
- Do not allow a previous command's successful output to stand in for the current build.
  Verify the artifact that will actually be used.

For new lint/compiler policies, test an observable diagnostic, not whether the config
text contains a rule name. For code changes, use behavior tests that fail on the defect.

## 4. Exercise the shipped boundary (TS02–TS05)

Type checking source files is not runtime testing. With Node ESM output, an illustrative
smoke command is `node --input-type=module -e "await import('./dist/index.js')"`; adapt
that path to the real public entrypoint. For a package, also inspect exports and compile
a consumer against emitted declarations. Do not substitute importing TS source through
a development loader if consumers import built JS through Node.

For browser apps, use the framework production build and a browser smoke test when
available. DOM types do not prove a browser run, and Node globals can leak through broad
ambient typings. Bun and Deno need actual host-specific checks. State which hosts ran.

For a replacement or completed port (TS10), exercise the real consumers and establish
that the retired behavior is no longer exposed where the request removes it. Check old
exports/registrations and emitted files; a fresh build can leave stale output if the build
never removes it. Inspect the build script and use its scoped cleanup only when needed.
Preserve still-supported compatibility. A passing new helper test does not prove cutover.

Exercise bad boundary data, failure and cleanup paths relevant to the change. For async
code, check observable completion/rejection/order rather than merely awaiting a happy path.
Do not introduce network-dependent probes when deterministic local substitutes suffice.

### Concrete Node package verification

After inspecting scripts and selecting the affected package, run the project's actual
commands and retain each result. The following is illustrative; use its package manager,
script names and public entry instead of assuming every project has this layout:

```sh
npm run typecheck
npm run lint
npm test
npm run build
node --input-type=module -e "await import('./dist/index.js')"
```

A failing public import is not repaired by successfully importing an internal file.
For declaration changes, create a temporary consumer outside source aliases, import the
package's emitted API and check an accepted call plus an expected-invalid call. For an
application, use its real production build and host smoke path instead of a library test.

### Completion is a runtime property

```ts
// @example-run
async function writeAll<T>(items: readonly T[], write: (item: T) => Promise<void>): Promise<void> {
  for (const item of items) await write(item);
}
const started: number[] = [];
const failure = new Error('write failed');
let observed: unknown;
try {
  await writeAll([1, 2], async item => { started.push(item); throw failure; });
} catch (error) { observed = error; }
if (observed !== failure || started.join(',') !== '1') throw new Error('Failure contract broken');
```

Adapt the probe to the actual function. A happy-path await cannot establish stop-on-failure;
controlled pending operations are also needed to establish that later work does not start
early. Don't replace a concurrent API with this sequential illustration to make a test pass.

## 5. Classify failures without hiding them

Use a baseline where practical to distinguish introduced, pre-existing and unknown
failures. For a verification-only request, leave source/config untouched and report the
smallest actionable remedy. When fixes are authorized, fix the cause within scope and
rerun the checks affected by that fix.

Do not lower strictness, suppress diagnostics, delete test cases, fabricate passing
output, or change the supported runtime merely to obtain green checks. If a dependency
or host is unavailable, mark that check unrun and continue independent checks.

## 6. Report a decision with evidence

Provide a table of commands, scope, results and limits, followed by the release/change
readiness conclusion. A project can have successful scripts and still be not ready
because the scripts are empty or the emitted runtime entrypoint fails.

Separate:

- **Verified:** concrete checks that executed and what they establish.
- **Failed:** reproduced issues with locations, consequences and minimal next fixes.
- **Unverified:** missing hosts, integrations, environments or insufficient coverage.

Do not claim security, correctness, cross-runtime support or agent effectiveness beyond
these observations. If asked to benchmark, verify equal results, retain raw samples and
state workload/machine limitations (TS08). Performance timing does not measure skill quality.

### Example readiness decision

| Executed check | Observation | Meaning |
|---|---|---|
| Typecheck | Exit 0 under Bundler resolution | Static check passed; native Node loading still unproven |
| Lint | Exit 0, zero files | Empty coverage, not lint evidence |
| Tests | Exit 0, zero tests | No behavioral coverage |
| Build | Fresh JS/declarations emitted | Build passed |
| Public Node import | ERR_MODULE_NOT_FOUND for extensionless `./core` | Runtime blocker |

**Decision for this example:** not ready for native Node. Propose correcting the emitted
relative import and adding meaningful lint/tests; don't apply fixes in a verification-only
task. Browser/Bun/Deno remain unverified. Replace every row with actual observed results
when writing the real report; successful script exits alone don't establish readiness.

## Reference

Read [verification matrix](references/verification-matrix.md) to select checks by change
and diagnose misleading green results. It explains the rule IDs used here and links to
compiler, declaration and lint documentation. This skill is usable alone; preserve the
repository's framework, scripts and locked versions.

The `evals/` directory contains maintainer evaluation cases and graders. It is not
additional task guidance; do not read it while applying this skill to a user project.

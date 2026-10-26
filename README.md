![Beautiful TypeScript: a blue pixel-art alpine lake and bridge beneath the project title](assets/banner.png)

# BeautifulTypeScript

Four small, independent Agent Skills for practical TypeScript work. Preserve the project's
framework and conventions; make correctness visible through tests and runtime checks.
Inspired by [BeautifulRust](https://github.com/morganlinton/BeautifulRust), independently
written for TypeScript. MIT licensed. Install directly from GitHub; no npm package installation is required.

| Skill | Use it for |
|---|---|
| [typescript-best-practices](skills/typescript-best-practices/SKILL.md) | Writing or refactoring project-aware TS |
| [typescript-review](skills/typescript-review/SKILL.md) | Prioritized, reproducible findings without style churn |
| [typescript-port](skills/typescript-port/SKILL.md) | Characterizing and porting behavior in executable stages |
| [typescript-verify](skills/typescript-verify/SKILL.md) | Checking types, lint, tests, builds and real host behavior |

Each skill bundles the references its workflow needs. No companion skill is required.
No forced Result type, schema package, framework, architecture or formatting style.

## What it changes

The skills turn broad advice into concrete behavior: validate external values,
preserve valid zero/empty values, and make async completion explicit. These are
authored before/after teaching examples, not transcripts of a controlled model run.
Our [paired evaluation](docs/EVALUATION.md) records actual runs and their limits;
it has not established an overall advantage over the baseline.

### Writing: defaults are not validation

Contract: an omitted limit defaults to 20; integer limits from 0 to 100 are valid.
A type assertion and a truthiness fallback violate that contract:

```ts
// Before: 0 becomes 20; strings can escape despite the declared return type.
// @example-run
function readLimit(input: unknown): number {
  return (input as { limit?: number }).limit || 20;
}
if (readLimit({ limit: 0 }) !== 20) throw new Error('Expected the demonstrated bug');
```

```ts
// After: narrow the boundary and preserve a valid zero.
// @example-run
function readLimit(input: unknown): number {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('options must be an object');
  }
  const limit = 'limit' in input ? input.limit : 20;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 0 || limit > 100) {
    throw new TypeError('limit must be an integer from 0 to 100');
  }
  return limit;
}
if (readLimit({ limit: 0 }) !== 0 || readLimit({}) !== 20) throw new Error('Defaults');
let rejected = false;
try { readLimit({ limit: '10' }); } catch { rejected = true; }
if (!rejected) throw new Error('Expected invalid input to be rejected');
```

Use an existing validator when the project already has one; no schema dependency
is required for this small boundary.

### Review: show the failure and the fix

Contract: save in order, stop at the first failure, and let the caller await completion.

```ts
// Before: forEach discards callback promises.
function saveAll<T>(items: readonly T[], save: (item: T) => Promise<void>): void {
  items.forEach(async item => { await save(item); });
}
```

A useful finding: **P1 — saveAll returns before writes finish.** If the first write
rejects, later writes have already started and the caller cannot await the failure.
Return an owned promise and execute sequentially:

```ts
// After: the caller owns completion; rejection stops later writes.
// @example-run
async function saveAll<T>(items: readonly T[], save: (item: T) => Promise<void>): Promise<void> {
  for (const item of items) await save(item);
}
const seen: number[] = [];
let rejected = false;
try {
  await saveAll([1, 2], async item => {
    seen.push(item);
    throw new Error('write failed');
  });
} catch { rejected = true; }
if (!rejected || seen.join(',') !== '1') throw new Error('Failure must stop later writes');
```

Sequential execution follows this contract; choose bounded concurrency when the
actual contract permits it.

### Port and verify: make the evidence visible

| Skill | Starting risk | Concrete deliverable |
|---|---|---|
| Port | A Python-to-TS translation changes integer bounds, validation order or first-seen ordering | Characterize the source, then compare both implementations on [312 deterministic cases](tests/port.test.mjs) |
| Verify | A green typecheck is treated as proof that Node can load the built package | Check lint coverage, production build, emitted imports and runtime behavior; report missing evidence explicitly |

The TS snippets above are compiled in CI. Blocks marked @example-run also execute,
including rejection and valid-zero checks. These demonstrate the intended behavior,
not a guarantee about every agent response.

## Default lint setup

For a new lint setup, use **type-aware Oxlint**. Existing framework and workspace
requirements take precedence. The [setup guide](configs/README.md) includes exact
installation commands, copyable configs, and an ESLint compatibility path.

```sh
# In this repository after npm ci
npm run lint          # Default: type-aware Oxlint
npm run lint:oxlint   # Optional basic pass
npm run lint:eslint   # Optional ESLint recipe
```

## Install with npx skills

Use Node.js **22.20 or later** with npm/npx. Installing skills does not require
`npm ci`, Python, or this repository's lint dependencies. Start in the project where
you want to use the skills; add `-g` for installation across projects.

### 1. Discover the skills

Run this from the project where you want to use the skills:

```sh
npx skills add LioRael/BeautifulTypeScript
```

To inspect the available skills without installing:

```sh
npx skills add LioRael/BeautifulTypeScript --list
```

The repository is [LioRael/BeautifulTypeScript](https://github.com/LioRael/BeautifulTypeScript).
The list should contain all four `typescript-*` skills.

### 2. Install all four or choose one

```sh
# All four, for both Codex and Claude Code, in the current project
npx skills add LioRael/BeautifulTypeScript --skill '*' -a codex -a claude-code -y

# Only the porting skill, for Codex
npx skills add LioRael/BeautifulTypeScript --skill typescript-port -a codex -y

# All four, for Claude Code across projects
npx skills add LioRael/BeautifulTypeScript --skill '*' -a claude-code -g -y
```

Use any name from the table above with `--skill`. Omit `-y` to keep installer prompts
when available. Quote `'*'` so your shell does not expand it. `--all` also selects all
agents; use `--skill '*'` with `-a` to target only the agents you use. Add `--copy` if
symlinks are unsuitable. Installation does not apply the optional lint/tsconfig recipes.

### 3. Confirm and invoke

```sh
npx skills list -a codex -a claude-code
npx skills list -g
```

Open your target project in the agent and check its skill selector; restart the session
if needed. Codex: `$typescript-port`. Claude Code: `/typescript-port`. For example:
“Port this Python module to TypeScript, preserving key order and error behavior.”

### 4. Update or uninstall

Update the installed skill in the relevant scope:

```sh
npx skills update typescript-port -p
npx skills update typescript-port -g
```

Select the scope you installed into. To remove one or all four from that scope:

```sh
npx skills remove typescript-port -a codex -y
npx skills remove typescript-port -g -a claude-code -y
npx skills remove typescript-best-practices typescript-review typescript-port typescript-verify -y
```

Add `-g` to the last command for global removal. These commands concern installed copies;
they do not delete this source checkout. Review local edits before reinstalling/updating.

### Local checkout installation

You can also install from a clone or extracted archive. With your application and this
checkout next to each other, run this from the application directory:

```sh
npx skills add ../BeautifulTypeScript --skill '*' -a codex -a claude-code -y
```

Use the actual relative or absolute path. Running `npx skills add .` inside this checkout
installs into this repository, not your application. To refresh a local installation,
update the checkout and rerun the same add command.

### Troubleshooting and manual fallback

- No skills found: verify the repository address above and your GitHub/network access.
- Not visible in the agent: check both project/global lists and the selected `-a` value.
- Unknown option: check `npx skills --version` and `npx skills --help`; verified here with 1.7.4.
- Without the CLI, copy a complete skill folder or use the non-overwriting helper:

```sh
node scripts/install.mjs typescript-port "$HOME/.agents/skills"
node scripts/install.mjs typescript-port "$HOME/.claude/skills"
```

Run these fallback commands from this checkout. For project scope, use the target
project's `.agents/skills` (Codex) or `.claude/skills` (Claude Code) directory instead.

References: [skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md),
[Codex](https://developers.openai.com/codex/skills/),
[Claude Code](https://code.claude.com/docs/en/skills).

## Try it

- “Use typescript-best-practices to add a typed API client, keeping this app's error model.”
- “Use typescript-review on this diff; give concrete inputs and consequences for findings.”
- “Use typescript-port to port this Python module to Node ESM; preserve ordering and errors.”
- “Use typescript-verify to check the change; distinguish executed checks from assumptions.”

The [port example](examples/port/PORTING.md) runs Python and TS on shared boundary cases
and a seeded corpus. It preserves safe-integer arithmetic, first-seen key order and error
categories. It does not claim arbitrary-language, all-input or all-runtime equivalence.

## What the workflows produce

- **Write:** project/API constraints, validated boundary data, explicit async ownership,
  behavior tests and a check of the emitted package when applicable.
- **Review:** caller-based findings with triggers, consequences, minimal remedies and
  executed reproductions; distinguish selection, execution and presentation order.
- **Port:** source characterization, source-to-target test mapping, runnable stages,
  differential checks and a PORTING.md that exposes compatibility gaps.
- **Verify:** evidence for actual file/test coverage, built runtime imports and consumers;
  distinguish failed, empty and unrun checks before calling a change ready.

The writing skill ships [executable boundary/async patterns](skills/typescript-best-practices/assets/patterns.ts).
The [BeautifulRust gap analysis](docs/GAP-ANALYSIS.md) explains the changes and intentional
differences. The [paired agent evaluation](docs/EVALUATION.md) includes tasks, generated
code, review/port/verification reports and command traces. Its initial 16 runs did **not**
establish a correctness improvement: both conditions saturated the frozen rubric, which
also missed an ordering requirement. The report preserves that failure and the targeted
follow-up rather than claiming a general success rate.

## Verify this repository

Requires Node 22.13+ (or 24+) and Python 3.9+. Use the committed lockfile.

```sh
npm ci
npm run check
npm run benchmark
```

Checks cover standalone skill packaging, reference/link integrity, Node and browser-config
typechecks, typed lint, source characterization, TS tests, differential comparison,
positive/negative lint diagnostics and installer overwrite protection. Browser typechecking
is not browser execution. The benchmark compares two equivalent TS algorithms, not agent
quality or language speed. See [results](docs/BENCHMARK.md) and [validation](docs/VALIDATION.md).

## Guides, rules and configuration

The writing skill includes a reference library, with a separate original digest for each
source. Read a digest when its topic matters, rather than loading every guide for every task:

| Reference | Covers |
|---|---|
| [Google TypeScript Style Guide](skills/typescript-best-practices/references/google-typescript-style-guide.md) | Organization, inference, assertions and Google-specific conventions |
| [TypeScript Handbook](skills/typescript-best-practices/references/typescript-handbook.md) | Narrowing, state modeling, generics, callbacks and mutation |
| [Declaration Do’s and Don’ts](skills/typescript-best-practices/references/typescript-declaration-dos-and-donts.md) | Public types, callback signatures, overloads and consumer checks |
| [typescript-eslint](skills/typescript-best-practices/references/typescript-eslint.md) | Typed linting, presets, async diagnostics and their limits |
| [Compiler configuration](skills/typescript-best-practices/references/typescript-compiler-configuration.md) | Strictness, module loading, host environments and output |
| [Airbnb JavaScript Style Guide](skills/typescript-best-practices/references/airbnb-javascript-style-guide.md) | Applicable JS conventions and choices we do not impose |

Each digest identifies its source, authority, review date, scope and our application
choices. [Guide coverage and examples](docs/GUIDE-COVERAGE.md) shows the topic-level mapping,
intentional omissions and executable example checks. [Style decisions](skills/typescript-best-practices/references/style-decisions.md)
resolve concrete conflicts; [source/rule index](docs/SOURCES.md) maps project rules to their
basis. These are summaries and original examples, not redistributed copies of the guides.

Review, port and verify carry their own focused evidence/checklist references and direct
source links. They do not depend on the writing skill being installed. [Optional configs](configs/README.md) use a tested toolchain;
existing framework and workspace settings take precedence. Recipes include ESLint /
typescript-eslint and Oxlint, with basic and type-aware Oxlint installation commands
and fixture-tested async rules.

## Evaluation cases belong to their skills

Each skill bundles its own task, starting project and grading criteria:

- [Writing: settings boundary](skills/typescript-best-practices/evals/settings-boundary/case.json)
- [Review: queue contract](skills/typescript-review/evals/queue-contract/case.json)
- [Port: Python ledger](skills/typescript-port/evals/python-ledger/case.json)
- [Verify: Node ESM release](skills/typescript-verify/evals/node-esm-release/case.json)

The shared runner stays in evals/ and recorded outputs stay in eval-results/. It deliberately
excludes skill-local evals/ from the evaluated agent's supplied skill, so the grader stays
hidden. See the [evaluation instructions](evals/README.md). These cases are maintainer
materials, not additional instructions to load during ordinary user work.

Layout: skills/ contains installable folders and their evals; configs/ contains optional recipes;
examples/port/ is the executable migration; fixtures/ and tests/ exercise diagnostics and
behavior; scripts/ handles installation, packaging checks and measurement; docs/ records
evidence. [Research provenance](docs/UPSTREAM.md), [contributing](CONTRIBUTING.md),
[license](LICENSE).

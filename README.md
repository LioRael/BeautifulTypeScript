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

Each folder includes its own source/rule reference. No companion skill is required.
No forced Result type, schema package, framework, architecture or formatting style.

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
symlinks are unsuitable. Installation does not apply the optional ESLint/tsconfig recipes.

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

[Sources and rule map](docs/SOURCES.md) distinguishes Google's organizational TS guide,
Microsoft's official Handbook/API/config docs, typescript-eslint tool guidance and Airbnb's
JS conventions. It explains conflicts, scope and review dates, with links to originals.
The summaries and code are original; upstream content retains its own ownership.
[Optional configs](configs/README.md) use a locked compatible toolchain rather than forcing
latest versions. Existing framework and workspace settings take precedence.

Layout: skills/ contains installable folders; configs/ contains optional recipes;
examples/port/ is the executable migration; fixtures/ and tests/ exercise diagnostics and
behavior; scripts/ handles installation, packaging checks and measurement; docs/ records
evidence. [Research provenance](docs/UPSTREAM.md), [contributing](CONTRIBUTING.md),
[license](LICENSE).

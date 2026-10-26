# Validation — 2026-10-27 (Asia/Shanghai)

Local macOS arm64 / Apple M2 Pro. Benchmark npm-script process reports Node v26.10.0;
the outer shell reports v26.12.1. Python 3.9.6, npm 11.20.0. Locked dependencies:
TypeScript 5.9.3, ESLint 10.13.0, typescript-eslint 8.72.1.

| Check actually run | Result | Scope / limit |
|---|---|---|
| npm ci --ignore-scripts | exit 0 | Lockfile reinstall; no lifecycle scripts needed; public npm registry URLs |
| npm run check (after reinstall) | exit 0 | All commands below, 20 Node tests, zero failures/skips |
| npm run check:skills | exit 0 | Four names/frontmatter, local reference isolation/parity, Markdown file links; remote URLs and anchors not automatically crawled |
| Bundled skill-creator quick_validate.py on each skill | exit 0, four valid | Format/scaffold validation, not agent efficacy |
| npm run typecheck | exit 0 | Node and browser bundler compilation contexts |
| npm run lint | exit 0 | Real TS example; zero warnings |
| npm run build | exit 0 | JS plus declarations emitted |
| npm test via check | 20/20 passed | Source subtests, target cases, differential, immutability, nonfinite input, lint/types/consumer and installer |
| Python characterization | 1 unittest with 12 named subcases passed | Shared expected outputs checked against source independently |
| Differential harness | 312/312 cases agree | 12 fixed + 300 seeded cases; both TS algorithms compared with Python |
| Typed lint fixtures | exact expected diagnostics; good fixture clean | Floating promises, misused async callbacks, void without handling; not every inherited preset rule |
| Compiler fixtures | exact expected diagnostics; good fixture clean | strictNullChecks, noUncheckedIndexedAccess, exactOptionalPropertyTypes |
| Declaration consumer | no diagnostics | Imports generated public API declarations |
| Installer integration | all four copied; repeat install refused | Temporary paths only; user's agent directories unchanged |
| npm run benchmark | exit 0 | Equality first, warmups, alternating batches, raw timings saved |

The first lint run caught Array.isArray narrowing to any[]. A readonly unknown[] local
now preserves the boundary before property checks. Initial ESLint 9 installation reported
end of support, so the final tested tuple uses supported ESLint 10. A check attempted
before dependency installation finished failed to find ESLint; it is not counted as a pass.
The full suite passed after install and again after lockfile reinstall. Existing global npm
configuration emits an unknown `home` option warning; it did not fail checks and was not edited.

## Remaining limits

- Node 22/24 CI matrix is supplied but has not run remotely; local runtime was Node 26.
- Browser configuration typechecks; no browser execution, Bun or Deno run was performed.
- The source contract is JSON safe-integer inventory aggregation, not arbitrary Python.
  Async migration is documented but this synchronous fixture does not test async parity.
- No independent model with/without-skill evaluation was run. Deterministic tests validate
  artifacts and behavior, not automatic skill routing or improved model quality.
- Distribution is directly from GitHub via npx skills; no marketplace release or npm
  package publication is required or claimed.

## Measurement record

[Benchmark report](BENCHMARK.md) uses benchmark-results/latest.json from a dedicated run
after checks and dependency installation completed. An earlier exploratory run is retained
in benchmark-results/exploratory.json; it overlapped dependency work and showed notably
higher variance. It is not pooled into the final sample. Neither run supports a general
performance guarantee. No agent-quality or Python-vs-TypeScript speed claim is made.

## npx skills installation documentation follow-up

Verified with skills 1.7.4 on 2026-10-27: local source discovery lists all four skills;
`add <local-source> --skill '*' -a codex -a claude-code -y` installs all four into a
scratch project's Codex directory and Claude Code links; `list -a codex -a claude-code`
confirms both agents; named removal of all four succeeds. README file-link checks pass.
Global installation and remote-source updating were documented but not executed; no
user-level skill installation was changed. The English README uses npx skills as
the primary installer and includes both GitHub and local-checkout installation commands.

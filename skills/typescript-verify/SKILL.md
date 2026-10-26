---
name: typescript-verify
description: Verify a TypeScript change using existing type, lint, test, build and runtime checks and report their evidence and limits. Use for validation or pre-delivery checks.
---

# TypeScript verify

1. Inspect instructions, package manager/lockfile, scripts, tsconfig references, framework
   tooling and supported hosts. Choose affected workspace packages and their dependencies
   (TS01, TS05). Do not substitute a fresh generic tsc command for a framework's check.
2. Run available format-check (not automatic formatting), typecheck, lint, tests and
   build commands appropriate to the change. Honor existing flags and CI constraints.
   Do not install or upgrade a compiler to make checks pass. If dependencies are absent,
   use the existing lockfile and package manager within the authorized task.
3. Confirm tests actually execute and lint actually includes changed files. A successful
   zero-file lint or empty test suite is not coverage. For new lint/config rules, include
   a failing diagnostic fixture and a passing counterpart. Keep intentional failures
   outside ordinary build/lint targets (TS09).
4. Exercise meaningful runtime behavior: bad boundary input, rejection handling, import
   of built public entrypoints and applicable browser/server integration. Check generated
   declarations with a consumer when exporting a library. TS config does not polyfill
   APIs or prove runtime portability (TS02–TS05).
5. Classify failures as introduced, pre-existing or unknown using a baseline where
   practical. Fix within the authorized scope; otherwise report exact evidence. Never
   weaken strictness, disable rules or delete tests solely to obtain success.
6. Report a table of command, scope, exit/result and limitation. Identify skipped checks
   and why. If asked to benchmark, require identical results and retain raw timing
   samples (TS08). Compilation, lint and deterministic fixtures do not establish that
   an agent skill improves model output; that needs separate controlled agent trials.

Example request: “Verify this TS library change using its locked toolchain. Include
runtime imports and error tests, and distinguish local results from unrun CI.”

Read [sources and rule map](references/sources.md) when resolving a rule or style conflict.
This reference is bundled so this skill works alone. Respect repository instructions,
framework conventions, supported runtimes and the user's scope. Do not install a new
architecture, Result type, validation library or formatter just to satisfy this skill.

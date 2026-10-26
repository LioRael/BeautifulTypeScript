# Guide coverage and executable examples

The first workflow revision did not match BeautifulRust's reference depth. At commit
b13a7aa, our six source digests had 305 lines and no fenced code examples. BeautifulRust
commit c6f56d27a01739d404da2a554daaea023d7ddcca has five digests totaling 1,071 lines,
organized around individual recommendations, plus examples in its main skill and references.
These counts identified a gap; they are not a quality score or a target to optimize.

The revised references retain a concise source position, then add original applications,
code, constraints and checks. They do not copy upstream examples or reproduce entire manuals.
A source section map makes inclusion/exclusion inspectable. This is **not a claim of parity**
with BeautifulRust's full coverage, maintenance history or agent behavior.

## Reading and coverage map

| Reference | Detailed applications | Coverage boundary |
|---|---|---|
| [Google](../skills/typescript-best-practices/references/google-typescript-style-guide.md) | G1–G10: files/imports, exports/state, collections/copying, callbacks, classes, narrowing/recovery, names/docs, types, generics, tooling | All major source sections mapped; fine formatting/toolchain policies stay with local tools; not every Google-internal preference becomes a TS rule |
| [Handbook](../skills/typescript-best-practices/references/typescript-handbook.md) | H1–H8: external data, absence, unions/exhaustiveness, functions, readonly/tuples, keyof/generics, mapped/conditional types, classes/modules | Selected engineering chapters; explicit deferral of JSX, decorators, mixins, merging and specialist topics |
| [Declaration Do's and Don'ts](../skills/typescript-best-practices/references/typescript-declaration-dos-and-donts.md) | D1–D8: primitives, meaningful generics, unknown, callback returns, optional/overloaded callbacks, overload order, optional and union parameters | Every recommendation group on this source page represented; original consumer examples rather than copied source examples |
| [typescript-eslint](../skills/typescript-best-practices/references/typescript-eslint.md) | E1–E7: project service/scope, presets/extensions, floating/misused promises, unsafe flow, selected rules, diagnostic verification | Typed-lint workflow and selected high-value rules; not the whole rule catalog; listed rules are not necessarily enabled |
| [Compiler configuration](../skills/typescript-best-practices/references/typescript-compiler-configuration.md) | C1–C8: emit/loader, strictness, Node, bundlers, globals, aliases/emit, declarations/workspaces, diagnostics | Production configuration decisions; not every compiler switch or every framework recipe |
| [Airbnb](../skills/typescript-best-practices/references/airbnb-javascript-style-guide.md) | A1–A8: scope/mutation, projection, conversion, callbacks, exports, iteration, control flow, public interfaces | Every top-level section mapped to adoption, contextual treatment or deferral; source's numbered subrules are not all restated |

A rule group is not automatically a mandatory project rule. Type/runtime facts determine
correctness; organizational formatting/export/iteration choices must respect the existing
project and supported consumers. Source versions are rolling review snapshots dated
2026-10-27; the executable examples use the committed TypeScript 5.9.3 toolchain.

## Worked examples in the other standalone skills

- [Review](../skills/typescript-review/references/review-evidence.md): separate selection
  from execution order and mutation; trace assertion boundaries; distinguish actionable
  findings from style preferences. Includes a concrete finding and checked remedy.
- [Port](../skills/typescript-port/references/type-and-runtime-decisions.md): complete-string
  numeric parsing, arbitrary precision, object versus Map order, sequential rejection effects
  and a staged evidence trail. Each states the domain its comparison can represent.
- [Verify](../skills/typescript-verify/references/verification-matrix.md): empty green checks,
  failing built entrypoints, public consumers and expected diagnostics versus broken tools.

These examples remain inside each skill's own installed folder; no companion skill is needed.

## What is automatically checked

`npm run check` extracts every `ts` fence from SKILL.md entrypoints and installed-skill references and compiles the
examples as separate modules with strict, exactOptionalPropertyTypes and
noUncheckedIndexedAccess enabled. Expected-invalid calls use @ts-expect-error, so an error
that disappears also fails validation. Marked self-contained examples execute against
freshly emitted JavaScript, including malformed parser inputs, aliasing, key order,
selection order and failure propagation.

This revision has **47 TypeScript code blocks, all compiler-checked; 18 also execute behavior
assertions**. Other snippets are illustrations: shell commands need a real target project;
JSON configurations are optional context examples; the miniature ESLint config is not a
replacement for the separately tested repository recipe. Typechecking a lint counterexample
does not establish that its diagnostic fired; the existing lint fixture suite checks actual
rule IDs and a clean counterpart separately.

The six source references now total 984 lines. The useful evidence is the topic mapping,
examples and checks above, not whether that count approaches another project's count.
No model-quality improvement is inferred from these checks. The earlier
[paired evaluation](EVALUATION.md) records its exact older skill versions and limitations.


## Concrete simplification workflow (2026-10-27)

The writing entrypoint now has four phases: establish the existing contract/policy,
implement directly, simplify the changed code, and verify. Its 118 lines replace the
previous 176-line entrypoint without removing the authoritative guide digests.
The new [simplification reference](../skills/typescript-best-practices/references/simplification.md)
contains six choices illustrated in seven compilable TS blocks, five with executable
contract probes. These are original project guidance, not additional claims about the
upstream guides. The full documentation check now compiles 58 blocks and executes 23.
Content checks establish runnable examples, not model-quality gains.

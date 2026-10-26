# Resolving style and authority conflicts

This is BeautifulTypeScript policy, not a merged upstream standard. Apply repository
instructions and the user's scope; use language/runtime facts for correctness and local
conventions for style. Read only the source digest relevant to the decision.

| Decision | Source tension | Our default and exception |
|---|---|---|
| Named/default exports | [Google](google-typescript-style-guide.md) versus [Airbnb](airbnb-javascript-style-guide.md) | Keep the existing public API and framework convention; do not choose by authority vote. |
| Loops/array helpers | Airbnb's iteration preference versus ordering, early exit and async ownership | Use the clearest correct construct; a loop is acceptable. Benchmark only when performance matters. |
| Null/undefined/optional | Google permits context-dependent absence; [compiler options](typescript-compiler-configuration.md) affect assignment | Preserve the external contract. Do not normalize values just to satisfy a style preference. |
| interface/type | Organizational style versus language capabilities | Keep local convention; choose a union when representing alternatives. Do not rewrite aliases as a cleanup side effect. |
| Return annotations | Local inference versus stable exported API | Annotate useful public contracts; avoid annotations that only repeat obvious local inference. |
| Strict lint | [typescript-eslint](typescript-eslint.md) distinguishes recommended and opinionated presets | Keep the existing baseline; introduce stricter checks with scoped diagnostics and fixes. |
| Callback signatures | [Declaration guidance](typescript-declaration-dos-and-donts.md) versus runtime behavior | Model what the producer actually calls; test promise ownership separately. |
| Defensive checks | Runtime validation versus already established internal contracts | Validate at the real boundary; trust the resulting type downstream. A new guard needs a reachable input and a contract reason. |
| Schema/Result/classes | No listed source mandates one architecture for every TS app | Reuse project conventions; justify new abstractions by a concrete requirement. |

## Rule identifiers

These are project identifiers, not upstream rule numbers.

| Rule | Meaning | Primary reference |
|---|---|---|
| TS01 | Preserve project and host constraints | Compiler configuration; Google scope |
| TS02 | Validate and narrow untrusted input | Handbook |
| TS03 | Model valid states and accurate APIs | Handbook; declaration Do’s and Don’ts |
| TS04 | Own async completion and failures | typescript-eslint; Handbook callbacks |
| TS05 | Align modules/types with deployment | Compiler configuration |
| TS06 | Preserve port behavior | Project methodology: characterization and differential evidence |
| TS07 | Keep style contextual and changes proportionate | Google; Airbnb |
| TS10 | Complete replacements, keep one policy owner, and audit type/check escapes | Project maintenance methodology; TypeScript and typed-lint mechanisms |
| TS08 | Measure equivalent workloads before performance claims | Project methodology |
| TS09 | Report executed checks and their limits | Project methodology informed by compiler/lint docs |

If correctness and style appear to conflict, first demonstrate the semantic issue. For
example, a default export is not a bug by itself, but a renamed export that breaks a
supported consumer is. Cite the relevant source plus the concrete local consequence.

# Ledger port evidence

## Boundary and API mapping

The supplied `source/ledger.py:summarize(rows)` maps to the synchronous named
`summarize(rows: unknown): Group[]` export in `src/ledger.ts`. Build with `npm run
build`, then import `{ summarize }` from `./dist/ledger.js` in Node ESM. The existing
`Group` export remains `{ key: string; total: string; priority: number }`.
No dependencies or configuration were changed. There are no public callers in the
supplied workspace beyond the source and target tests.

| Area | Contract and target decision |
| --- | --- |
| Input | JSON array of objects with string `key` and signed ASCII decimal string `amount`; extra fields ignored. Empty keys allowed. |
| Amount | Optional single sign, one or more ASCII digits, entire string consumed. No whitespace, Unicode digits, fractions or exponents. `bigint` preserves arbitrary integer precision; only decimal strings leave the module. Leading zeros and signed zero normalize. |
| Priority | Missing/null defaults to 100. Integer from -1000 through 1000; booleans rejected. Every record is validated, including later duplicates whose priority is ignored for sorting. |
| Grouping | Exact string equality, no Unicode normalization. `Map` preserves first encounter even for integer-like and prototype-related keys. First record supplies priority. Stable ascending sort preserves first encounter for ties. |
| Failure | Python `ValueError` maps to the existing JavaScript `Error` convention. Exact messages are `rows`, `key`, `amount`, `priority`. Validation proceeds in that order within each record and stops at the first failing record. |
| Effects | No input mutation or shared state. Results are fresh objects. Failures expose no partial result. Synchronous, no scheduling, I/O, cancellation, or resource ownership in the library. |

## Source identity and environment

Original source and tests remain unchanged. Source identity uses SHA-256 because
no workspace-local source revision was established:

- `source/ledger.py`: `5d47671412430f8a8759e3d41767fb854f59ad31b77d4ecd91b2b74b7610f68c`
- `source/test_ledger.py`: `b9aacaed84e080a9058dd3c71c47b4a63a81ff2208aaa22a40a71a68edf85686`

Measured runtimes: Python 3.9.6, Node v26.12.1, TypeScript 5.9.3. Existing configuration
is strict TypeScript, ES2022, NodeNext ESM, with output to `dist`. No declarations
are configured; consumers run emitted JavaScript or compile the TypeScript source.
Browser, Bun, Deno, other Node versions, and other Python versions were not tested.

## Test mapping and characterization

All target tests are in `tests/ledger.test.mjs`.

| Original test | Target test and retained assertion |
| --- | --- |
| `Tests.test_empty` | `empty`: exact empty array |
| `Tests.test_group` | `group`: exact grouped total and default priority |
| `Tests.test_first_priority` | `first_priority`: first priority stays 5 |
| `Tests.test_bad_amount` | `bad_amount`: exception with exact `amount` message |

Additional tests cover stable order; `10`, `2`, `__proto__`, `constructor`, and empty
keys; 5,000-digit sums; canonical zero; validation precedence; boolean, fractional
and out-of-range priorities; invalid later duplicates; trailing newline and Unicode
digit rejection; frozen input; and independent returned objects.

The differential test executes the unmodified Python implementation on the same
788-case JSON corpus: 11 fixed cases, 13 explicit amount cases, 14 explicit priority
cases, 600 mixed generated cases, and 150 generated valid cases. The LCG seed is
`0x1ed6e7` (multiplier 1664525, increment 1013904223, unsigned 32-bit state).
It includes Unicode/composed/decomposed/NUL keys and exact large amounts. Expected
results come from Python, never from the target. Output array order is compared
directly. Only exceptions are normalized from Python ValueError and JS Error to
their exact message codes. In-process tests cover immutability and result isolation
that this JSON boundary cannot establish.

## Verification

- Before implementation: `python3 -m unittest discover -s source -v`: 4 passed.
- Tests were ported first: `npm test` built the stub and failed all 9 target tests
  with `not implemented` (recorded red state).
- After implementation: `npm run typecheck`: passed.
- `npm test`: build passed, all 9 tests passed, including the differential corpus.
- Final original Python test rerun: 4 passed.
- A final validation attempt through a login shell failed during mise startup with
  `Operation not permitted`, before tooling ran. Repeating the same commands with
  a non-login shell succeeded (typecheck, build, 9 target tests, 4 source tests).
- Built ESM import and JSON serialization are exercised by the target tests.
- No lint script/configuration exists, so no lint check was available. No benchmark
  was requested or run. npm reported an existing unknown `home` configuration warning;
  commands still completed successfully and configuration was left untouched.

## Remaining differences and limits

There is an unavoidable number-representation gap in an already parsed JavaScript
JSON-value API: Python rejects priorities encoded as `1.0` or `1e0` because they
decode to floats; JavaScript decodes both to the same number as `1` and accepts them.
This was directly characterized in Python (`priority` failures for both). Likewise,
fractional JSON numbers rounded to an integer by JavaScript parsing cannot be
distinguished after parsing. Exact lexical parity would require preserving raw JSON
number tokens at a different API boundary; no such boundary change was authorized.
This is a blocker to claiming equivalence for every possible raw JSON document.

The tested compatibility domain is JSON values with priorities whose parsed number
representation retains the source integer/noninteger distinction. Non-JSON objects
(prototypes, accessors, proxies, sparse arrays, undefined, boxed primitives, cycles)
are outside the source's documented JSON interface and are not compatibility claims.
The target additionally rejects nonfinite numeric priorities. Python runtimes with
an integer string digit cap may reject very long amounts; this Python 3.9.6 runtime
successfully processed 5,000 digits, and the port follows the documented unlimited
amount precision. Resource exhaustion limits are not equated across runtimes.
The finite corpus provides measured evidence, not a universal equivalence proof.

A Git status command unexpectedly resolved an ancestor repository and listed paths
outside the workspace; no listed files were opened and no further Git inspection
was used. All implementation and test edits are confined to this workspace.

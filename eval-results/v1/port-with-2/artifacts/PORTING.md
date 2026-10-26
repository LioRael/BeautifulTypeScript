# Ledger port

## Boundary and API mapping

The supplied `source/ledger.py` remains the reference implementation; it and
`source/test_ledger.py` were not edited. No source revision was supplied in the
workspace. Reference execution: Python 3.9.6. Target execution: Node v26.12.1,
TypeScript 5.9.3, existing strict NodeNext/ES2022 configuration and Node ESM package.
`npm run build` emits `dist/ledger.js`; consumers import its named `summarize` export.
The existing exported `Group` interface is retained. No dependencies were added.

| Python | TypeScript | Contract |
| --- | --- | --- |
| `summarize(rows)` | `summarize(rows: unknown): Group[]` | Synchronous array input, array output |
| `list` of `dict` | JSON array of objects | Each row needs string `key` and string `amount` |
| Python `int(amount)` | internal `bigint` | Signed ASCII decimal, arbitrary precision within host resources |
| `str(total)` | `total.toString()` | Canonical decimal string; negative zero becomes `"0"` |
| optional `priority` | integer-valued number in [-1000, 1000] | Missing/null defaults to 100; booleans rejected |
| insertion-ordered dict and stable sort | `Map` and stable sort | Ascending priority, first-seen order for ties |
| `ValueError(code)` | `Error(code)` | Messages exactly `rows`, `key`, `amount`, `priority` |

Contract inventory established before implementation: no mutation or retained state;
first row of each group supplies its priority; every row is validated, including later
priorities that do not change group priority. Validation stops at the first failure,
checking container, then key, amount, priority in that order. Failure returns no partial
result. No I/O, asynchronous work, resources, native adapters or cleanup in the module.
Extra JSON fields are ignored. Empty and arbitrary Unicode keys are accepted without
normalization; integer-looking and prototype-like keys retain first-seen ordering.

Amount validation consumes the entire string. Whitespace (including final newline),
non-ASCII digits, decimal points, exponents and underscores fail with `amount`.
BigInt never crosses the JSON output boundary. No binary floating-point arithmetic is
used for totals. The measured Python 3.9.6 runtime accepts 5,000-digit amounts and a
5,001-digit result; no artificial digit limit was introduced.

## Test mapping and characterization

All tests are in `tests/ledger.test.mjs` and import the built ESM entrypoint.

| Original source test | Target test |
| --- | --- |
| `Tests.test_empty` | `empty (test_empty)` |
| `Tests.test_group` | `group (test_group)` |
| `Tests.test_first_priority` | `first priority (test_first_priority)` |
| `Tests.test_bad_amount` | `bad amount (test_bad_amount)` |

Additional target tests cover malformed containers and rows; exact failure messages and
precedence; missing/null values; boolean/fractional/out-of-range priorities; invalid
later duplicate priority; decimal grammar and trailing line terminators; >2^53 and
5,000-digit arithmetic; canonical zero; priority boundaries; stable ordering and special
keys; frozen inputs, fresh results, repeated calls and isolation after failure.

The differential test runs the unchanged Python source in a local subprocess with the
same JSON inputs as the target. Seed `0x51ed270b`, LCG constants 1664525/1013904223,
300 generated cases plus 7 fixed cases. It compares successful values with exact array
order and failures by exact message, mapping Python ValueError to the existing JS Error
convention. No sorting or value normalization conceals differences. Expected values
come from Python, never from the target. In-process tests cover mutation and object
freshness that JSON cannot capture.

## Executed verification

- `python3 -m unittest discover -s source -v`: 4/4 passed before editing and after porting.
- `npm test` against the original stub after adding target tests: 0/9 passed, all nine
  failed as expected (`not implemented`). Build itself succeeded.
- `npm run typecheck`: passed.
- `npm test` after implementation: build passed, 9/9 tests passed, including all 307
  differential cases and an import of the actual built Node ESM module.
- Python raw JSON probes with priority `1.0` and `1e0`: both raised `ValueError('priority')`.
- A later login-shell Python probe hit a local mise permission error; rerunning with
  a non-login shell succeeded without changing configuration.
- No lint script or lint dependency is supplied; no lint check was claimed.
- npm emitted an existing unknown `home` configuration warning; commands still succeeded.

Source SHA-256 fingerprints at delivery:

- `source/ledger.py`: `5d47671412430f8a8759e3d41767fb854f59ad31b77d4ecd91b2b74b7610f68c`
- `source/test_ledger.py`: `b9aacaed84e080a9058dd3c71c47b4a63a81ff2208aaa22a40a71a68edf85686`

## Remaining differences and limits

Python distinguishes JSON integer tokens from floating-point tokens; JavaScript numbers
do not retain that distinction. Thus `JSON.parse` of priority `1.0`, `1e0`, or `-0.0`
is accepted by the target when integer-valued and in range, whereas Python rejects the
float. A value rounded to an integer by JS parsing can similarly lose information.
This is a known compatibility gap, not an authorized semantic change. Exact parity for
those wire inputs requires a token-aware JSON boundary outside the existing
`summarize(unknown)` API. Numeric zero priority is normalized to positive zero.

The supported boundary is JSON data. Python subclasses, JS prototypes/accessors/proxies,
sparse arrays, and other non-JSON native values have no cross-language equivalence claim.
Some are rejected defensively by target tests. Python versions with configured integer
string-conversion limits may fail on huge values; those environment-specific limits are
not reproduced. Exhaustive input equivalence, resource exhaustion, alternate Node versions,
browsers, Bun and Deno were not verified. No benchmark was requested or performed.
The known numeric-token distinction blocks claiming universal JSON parity; the finite
corpus establishes only the behavior it exercises.

A Git status command unexpectedly resolved above this workspace and listed external
path names. No subsequent Git inspection was performed; revision metadata is therefore
unavailable. No network, package installation, delegation, publishing or global changes
were used.

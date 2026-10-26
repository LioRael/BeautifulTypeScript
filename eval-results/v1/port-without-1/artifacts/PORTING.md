# Ledger port

`src/ledger.ts` exports the existing `Group` interface and synchronous
`summarize(rows: unknown): Group[]`. The compiled Node ESM entry is
`dist/ledger.js`; import `{ summarize }` from that module. No dependencies were
added. Python source and tests are unchanged.

## JSON API mapping

| Python behavior | TypeScript implementation |
| --- | --- |
| Input must be a list | `Array.isArray`; otherwise `Error('rows')` |
| Each row is an object with a string key | Reject null, arrays, primitives and missing/nonstring keys with `Error('key')` |
| Amount is a signed ASCII decimal string | Full-string ASCII validation; otherwise `Error('amount')` |
| Exact integer accumulation and decimal output | Internal `bigint`, output `total` string; signs and leading zeros canonicalized |
| Missing/null priority becomes 100 | Same default |
| Integer priority in inclusive range -1000…1000; booleans rejected | Number type, integer and range checks; otherwise `Error('priority')` |
| First occurrence sets group priority | Insertion-ordered `Map`; every subsequent row is still validated |
| Sort by priority, retaining first-seen order on ties | Stable numeric sort over Map values |
| Exact string grouping, including empty or special keys | Map keys avoid object prototype collisions |
| Validation order | Rows, then each row's key, amount, priority, in input order |
| Extra row fields ignored | Same; input is not mutated and results are fresh |

Validation throws ordinary JavaScript `Error` instances with exactly the Python
`ValueError` message codes. No Result wrapper or new exception class is introduced.

## Test mapping

`tests/ledger.test.mjs` imports the compiled ESM module and maps all original tests:

| Original source/test_ledger.py | Target test |
| --- | --- |
| `test_empty` | `empty (Python test_empty)` |
| `test_group` | `group (Python test_group)` |
| `test_first_priority` | `first priority (Python test_first_priority)` |
| `test_bad_amount` | `bad amount (Python test_bad_amount)` |

Additional target tests cover stable sorting, priority bounds/defaults, exact large
sums (including a 5,000-digit amount), signed/zero-padded amounts, canonical zero,
Unicode and prototype-like keys, all validation codes, ASCII-only and absolute-end
amount matching, boolean/fractional/out-of-range priorities, duplicate-row
validation, error precedence, ignored extra fields and input/output independence.

## Verification performed

- `npm run typecheck`: passed with the preinstalled TypeScript compiler.
- `npm test`: build passed; 13 tests passed, zero failed.
- `python3 -m unittest discover -s source -v`: all four original tests passed.
- One-off differential verification: 505 JSON inputs compared between the actual
  Python function and compiled Node module, matching complete outputs or exact
  error messages. This included five fixed cases and 500 generated row lists
  using Python `random.Random(427)`, with duplicate/special keys, 60-digit amounts,
  signs, invalid amounts, priority bounds, nulls, booleans and fractional priorities.
- The local Python runtime also accepted the 5,000-digit amount.

npm printed an existing unknown `home` configuration warning; it did not prevent
compilation or tests. No network, installations or global configuration changes
were used. There were no verification blockers.

## Remaining differences and scope

Python distinguishes an integer priority `1` from a float priority `1.0`, rejecting
the latter with `priority`. JavaScript JSON parsing represents both as the number
`1`, so the port accepts both. The same applies to integral exponent notation.
Preserving this distinction requires access to raw JSON tokens, which this
function's decoded-value interface does not provide.

Exception classes and stack traces are language-native (`ValueError` versus
`Error`); message codes are preserved. The contract covers decoded JSON values,
not Python object subclasses or JavaScript proxies, accessors and custom object
prototypes. JavaScript additionally rejects nonfinite priorities. Arbitrary-size
amounts use BigInt, subject to runtime memory limits; Python installations with an
enabled integer-string digit cap can impose an additional runtime limit, although
the project documents unlimited precision and this environment accepted the large
amount probe. No numeric coercion or fixed precision limit was added.

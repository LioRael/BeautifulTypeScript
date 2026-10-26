# Ledger port

`src/ledger.ts` exports `summarize(rows: unknown): Group[]` and the existing
`Group` interface. Build with `npm run build`; import the named function from
`dist/ledger.js` in Node ESM. No dependencies were added. Python files are unchanged.

## API mapping

| Python behavior | TypeScript implementation |
| --- | --- |
| Input must be a list | `Array.isArray`; otherwise `Error('rows')` |
| Each row must be an object with a string key | Reject null, arrays, and non-string/missing keys with `Error('key')` |
| Amount must match signed ASCII decimal syntax | Strict string validation; invalid/missing amounts throw `Error('amount')` |
| Arbitrary precision totals, canonical decimal output | `BigInt` accumulation, then `toString()`; no numeric amount conversion |
| Missing/null priority defaults to 100 | Nullish default |
| Priority must be an integer in [-1000, 1000], excluding booleans | Number type, integer and inclusive range checks; `Error('priority')` |
| First record supplies group priority | Create each Map entry once; still validate subsequent rows |
| Sort by priority, then first appearance | Insertion-ordered Map and stable numeric sort |
| Return list of `{key, total, priority}` | Fresh objects with total as a decimal string |
| Fail at the first invalid field/row | Validate key, amount, priority in that order for every row |

## Test mapping and verification

`tests/ledger.test.mjs` maps all four source tests directly:
`test_empty` → empty; `test_group` → group; `test_first_priority` → first
priority; `test_bad_amount` → bad amount. Additional tests cover exact arithmetic
beyond Number precision, a 1,000-digit carry, signed/zero-padded amounts, stable
ties, priority bounds/defaults, special keys, malformed values, validation order,
invalid duplicate records, input immutability, and independent calls.

Executed successfully:

- `python3 -m unittest discover -s source -v`: 4 tests passed.
- `npm run typecheck`: passed.
- `npm test`: build succeeded; 12 tests passed.
- One-off differential verification: 405 JSON inputs matched Python results or
  exact error messages. Cases used deterministic random seed 731, up to 14 rows,
  signed 60-digit amounts, repeated/special keys, valid and invalid priorities,
  and malformed amounts. Temporary oracle data was removed.

## Remaining differences and tooling limits

- JavaScript represents JSON integer and floating-point numeric tokens with the
  same Number type. A parsed priority `1.0` (or `1e0`) is accepted here as 1;
  Python rejects a float with `ValueError('priority')`. Token spelling cannot be
  recovered from the existing function input. Fractional values and booleans are
  rejected by both implementations.
- Python raises `ValueError`; the existing Node convention is ordinary `Error`.
  The API code is preserved exactly in `message`.
- Some Python versions/configurations limit decimal integer conversion length.
  BigInt follows the documented unlimited-precision contract, subject to runtime
  memory limits, rather than imposing a Python installation-specific digit cap.
- The supported input domain is JSON data. Custom prototypes, getters, proxies,
  and other language-specific objects are outside this contract.
- A login-shell verification attempt failed in the environment's `mise` startup
  with `Operation not permitted`. Verification succeeded with login disabled.
  A supplemental Python digit-limit diagnostic was unavailable on that Python
  version; it ran after generating the oracle, and all 405 oracle comparisons
  subsequently passed. npm emitted an existing unknown `home` configuration
  warning; it did not prevent compilation or testing. No global settings changed.

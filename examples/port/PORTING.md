# Python → TypeScript inventory port

Source: original source.py in this repository; no external code copied. Both versions
accept a JSON array of records with a string key and safe integral quantity. Extra fields
are ignored. Empty keys, negative totals and zero totals are allowed. Validate all records
before computing; reject intermediate overflow even if a later subtraction would recover.
First-seen key order is preserved, including numeric-looking and prototype-looking keys.
Neither implementation mutates inputs. Strings are compared exactly, without normalization.

| Source | Target | Evidence |
|---|---|---|
| aggregate | aggregate | 12 named cases.json cases, plus 300 deterministic generated cases |
| TypeError('invalid-input') | TypeError('invalid-input') | invalid-input envelope cases |
| OverflowError('overflow') | RangeError('overflow') | overflow/underflow envelope cases |
| test_characterization subtests | individual Node tests with identical case names | expected output checked independently for both implementations |

The wire protocol compares error codes, not language-specific exception class names or
stack traces. Python's unbounded integers are deliberately outside this **source contract**,
not silently narrowed by the port. JSON numbers such as 1.0 are integral in both versions.
JSON has no undefined, bigint, NaN, Infinity, object identity, prototypes or cycles; no
cross-language claim is made for those. Target-specific tests reject nonfinite numbers
and verify input immutability. No async behavior exists in this source; a synchronous
API is preserved. See the port skill for async migrations rather than adding fake async.

Node is the executed target. The pure module also typechecks with the browser template;
this is not a browser runtime test. Bun and Deno execution is unverified. The harness needs
Python 3.9+ and the locked npm toolchain. Run `npm test` to build and run both implementations.
A linear-search TS baseline is compared to the Map implementation; no Python-vs-TS speed
claim is made. See ../../docs/BENCHMARK.md after running `npm run benchmark`.

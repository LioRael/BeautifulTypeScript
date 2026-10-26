# python-ledger rubric

1. Empty/grouping and first-record priority semantics.
2. Arbitrary precision decimal totals, canonical output and signed/leading-zero inputs.
3. Numeric-looking/prototype-looking keys preserve order for equal priorities.
4. Zero/negative priorities and null/missing defaults are correct.
5. Invalid shape/amount/priority errors preserve codes, including trailing newline and booleans.
6. Input/source immutability and public API; typecheck succeeds without new dependencies.
7. Executes Python tests, preserves/maps all source cases and adds target characterization tests.
8. Executes source-target comparison and records domain, host, test mapping and gaps in PORTING.md.

Score observed artifacts and executed evidence, not skill mentions or preferred wording.
Record a pass/fail and evidence per criterion. The evaluated agent must not receive this
file. Compiler/runtime assertions are shared by the repository evaluation runner for
write/port; the remaining criteria require trace-based assessment.

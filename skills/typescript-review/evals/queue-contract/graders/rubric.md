# queue-contract rubric

1. Finds zero-limit bug with trigger and effect.
2. Finds discarded async completion and sequential/failure-order breach.
3. Finds in-place mutation of caller-owned array.
4. All findings have accurate location and concrete remedy.
5. Reproduces at least one behavioral failure with an executed probe/test.
6. Executes existing typecheck/tests and states coverage limits.
7. No false positive against default exports or unrelated legacy helper.
8. Leaves source/config unchanged; prioritizes defects over optional taste.
9. Separates priority-based selection from original-input-order saving; gives a counterexample and a remedy restoring original relative order.

Score observed artifacts and executed evidence, not skill mentions or preferred wording.
Record a pass/fail and evidence per criterion. The evaluated agent must not receive this
file. Compiler/runtime assertions are shared by the repository evaluation runner for
write/port; the remaining criteria require trace-based assessment.

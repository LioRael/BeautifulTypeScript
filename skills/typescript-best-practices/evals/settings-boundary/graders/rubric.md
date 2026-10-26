# settings-boundary rubric

1. Valid defaults and fresh output; no input mutation.
2. Explicit zero and false survive.
3. Reject null/arrays/missing or invalid endpoint.
4. Reject invalid retries (null/string/fraction/out of range).
5. Reject nonboolean enabled; field-specific TypeError messages.
6. Await reader once, preserve read/JSON failure, validate loaded data.
7. Preserve public signatures and dependency/config constraints; typecheck succeeds.
8. Add meaningful boundary/error tests, run tests and typecheck with honest evidence.

Score observed artifacts and executed evidence, not skill mentions or preferred wording.
Record a pass/fail and evidence per criterion. The evaluated agent must not receive this
file. Compiler/runtime assertions are shared by the repository evaluation runner for
write/port; the remaining criteria require trace-based assessment.

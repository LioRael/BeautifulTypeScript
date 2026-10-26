# Settings implementation

Implemented `src/settings.ts` while preserving the exported interface and function signatures.

- `parseSettings` rejects null, arrays, and non-objects. It requires a nonempty string endpoint, preserves its text exactly, validates integer retries from 0 through 5 and boolean enabled, and defaults only absent optional fields to 3 and true. Explicit null or undefined values fail validation. Validation errors are TypeErrors identifying the invalid field (or settings for an invalid outer value).
- Each call returns a fresh object with only endpoint, retries, and enabled, without changing the input. Fields are read as own properties, consistent with JSON objects; inherited fields do not supply settings.
- `loadSettings` calls the supplied reader once, parses its text, and uses the same validation. It does not catch or replace reader errors or JSON syntax errors. No dependencies or global I/O were added.

## Validation evidence

- `npm run typecheck`: passed (`tsc --noEmit`).
- `npm test`: passed, including the `tsc` build and all 12 Node test cases; 0 failures, skips, or cancellations.
- Tests cover defaults, endpoint preservation, all accepted retry integers, false/true enabled values, extra-field removal, fresh results and frozen inputs, invalid outer values and field types, explicit null/undefined, retry bounds and non-finite numbers, own-property behavior, loader validation, one reader call, reader error identity, synchronous reader throws, and JSON syntax error type/message propagation.

## Environment issues

The first check invocation failed before npm ran because login-shell startup produced `mise ERROR Operation not permitted (os error 1)`. Both checks succeeded when rerun in a non-login shell using the available project tooling. No global settings were changed.

npm emitted warnings about an existing unknown `home` configuration key; these did not prevent typechecking, building, or testing. There are no remaining validation blockers. No network access, installation, delegation, or publishing was used.

A final unscoped `git status --short` unexpectedly resolved an enclosing repository and listed paths outside the workspace. This was a scope mistake; no listed external files were opened or changed, and no further repository inspection was performed. The accompanying `git diff --check` is not counted as evidence for these workspace changes because the files were not tracked there.

# Settings implementation

Implemented `src/settings.ts` without changing exported types or call signatures.
`parseSettings` checks the object container, validates the three fields without
coercion, and returns a fresh object containing only endpoint, retries and enabled.
It preserves endpoint text, zero retries and false enabled values. Optional fields
default only when absent; explicit null and explicit undefined are rejected.
Only own fields are treated as JSON data. Invalid containers identify `settings`;
invalid fields identify their field in a TypeError.

`loadSettings` calls the supplied reader once, awaits its text, parses JSON into
unknown, and delegates validation. It has no imports or global I/O dependencies.
Read failures (including arbitrary thrown values) and JSON errors pass through
without wrapping, retries or logging.

## Tests and actual validation

Added 12 Node tests in `tests/settings.test.mjs`, importing emitted ESM output.
Coverage includes defaults, all valid retry integers, preserved text and falsy
values, fresh output/input preservation, stripped extra fields, invalid containers,
missing/invalid fields, explicit null/undefined, prototype handling, asynchronous
loading, single reader invocation, and preserved failure identity. The JSON error
identity test temporarily replaces JSON.parse and restores it in finally.

Added `tests/settings.types.ts` as a consumer of emitted declarations, including
valid typed usage and expected errors for invalid reader and Settings signatures.

Successful commands (non-login shell, Node v26.12.1, TypeScript 5.9.3):

- `npm run typecheck` — passed.
- `npm test` — build passed; 12 tests passed, 0 failed/skipped/cancelled.
- `npm run build -- --declaration` — passed; emitted signatures preserve the API.
- `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext tests/settings.types.ts` — passed.

## Blockers and limitations

Initial validation in a login shell failed with `mise ERROR Operation not
permitted`. Using a non-login shell resolved this without changing configuration.
npm emitted an existing unknown `home` configuration warning; all checks still
completed successfully. No lint script or lint configuration is supplied, so no
lint check was run. No other runtime was validated. No remaining implementation
or validation blocker was found.

A final `git status --short` unexpectedly discovered an ancestor repository and
listed paths outside the workspace. This was a scope mistake; no listed file
contents were opened and no further ancestor inspection was performed. Git diff
output was not used as evidence of the implementation's correctness.

Applied `supplied-skill/SKILL.md` and its relevant compiler-configuration and
declaration guidance. No packages were installed and no network, delegation,
publishing, or global configuration changes were used.

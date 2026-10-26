# Settings implementation

Implemented `src/settings.ts` without changing exported names or public signatures.
`parseSettings` validates the object container and each required domain constraint,
preserves endpoint text exactly, and returns a fresh object containing only endpoint,
retries and enabled. Missing optional fields default to 3 and true; present null or
undefined values fail validation. Only own fields count as JSON object fields.
Invalid values throw `TypeError` with the relevant field name (or `settings` for an
invalid container). No coercion or input mutation occurs.

`loadSettings` calls its reader once, parses the text into an unknown value, and
uses the same validator. It does not catch or replace read or JSON errors, retry,
log, or access the filesystem/network. Synchronous reader throws become promise
rejections carrying the same thrown value.

Applied `supplied-skill/SKILL.md` and its relevant compiler configuration and
declaration references. Added no dependencies or persistent configuration changes.

## Validation evidence

Environment: Node v26.12.1, preinstalled TypeScript 5.9.3.

- `npm run typecheck`: passed (`tsc --noEmit`).
- `npm test`: passed; runs `npm run build` (`tsc`) followed by Node tests against
  `dist/settings.js`. All 12 tests passed, with no failures or skipped tests.
- Tests cover omitted defaults, zero/false preservation, endpoint whitespace,
  all valid retry integers, wrong types/null/undefined, numeric bounds and
  nonfinite numbers, outer container rejection, fresh/filtered output, frozen
  input preservation, own fields and prototype-free objects, loaded defaults and
  validation, one reader call, read rejection identity (including non-Error
  values), synchronous reader failure, and native JSON syntax errors.
- `./node_modules/.bin/tsc --declaration --emitDeclarationOnly --outDir .settings-validation`:
  passed. Inspected emitted declarations; exports retain the original interface
  and both function signatures.
- Compiled a temporary consumer against those declarations using
  `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext .settings-validation/consumer.ts`:
  passed. Checked valid parser/loader use and expected errors for a synchronous
  text reader and string retries. Temporary validation files were removed.

An initial consumer-check invocation attempted `--types ''`, which TypeScript
rejected with TS6044 before checking files. Removing that invalid CLI argument
produced the successful command above.

No implementation or validation blockers remain. There is no configured lint
script. npm emitted an existing unknown `home` configuration warning; it did not
prevent checks, and global configuration was not inspected or changed. Runtime
verification covers the installed Node version only.

Scope incident: a final unscoped `git status --short` unexpectedly resolved an
ancestor repository and listed paths outside the workspace. This violated the
requested inspection boundary. No listed files were opened or changed, the
listing was not used for implementation, and no further Git inspection was run.

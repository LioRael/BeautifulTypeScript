# Lint setup — Oxlint default and typescript-eslint rule guidance

Maintainer: typescript-eslint project; reviewed 2026-10-27. Tool policy is versioned, not
language law. Tested tuple: TS 5.9.3, ESLint 10.13.0, typescript-eslint 8.72.1. Use the
consumer project's lockfile; do not silently upgrade to match this repository.

## Default for a new setup: type-aware Oxlint

Use Oxlint when choosing lint tooling for a new project. Preserve an established
framework/workspace setup; retain ESLint for plugins or rules without verified
equivalents. The typescript-eslint sections below explain rule semantics and the
ESLint compatibility path, not a requirement to install both engines.

Install the tested pair:

```sh
npm install --save-dev --save-exact oxlint@1.89.0 oxlint-tsgolint@7.0.2005
```

Create .oxlintrc.json in the project root:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript"],
  "categories": { "correctness": "error" },
  "options": { "typeAware": true },
  "rules": {
    "eslint/eqeqeq": ["error", "always"],
    "typescript/no-floating-promises": ["error", { "ignoreVoid": false }],
    "typescript/no-misused-promises": "error"
  }
}
```

Run npx oxlint src --max-warnings 0, replacing src with your source directories.
Keep the project's compiler check and test/build commands. This selected baseline
does not reproduce every recommendedTypeChecked rule. See E8 for migration checks
and the [official setup](https://oxc.rs/docs/guide/usage/linter/type-aware.html).

## E1. Enable type information for the intended files

[Typed linting](https://typescript-eslint.io/getting-started/typed-linting/) connects a
TypeChecked preset to TypeScript project information. projectService supplies that context;
analysis costs more than syntax-only lint. A missing project is a setup problem, not proof
that the linted code violates a rule.

Original optional flat-config shape (adapt files/root/config inheritance):

```js
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**'] },
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }] },
  },
);
```

The preset also applies outside the final files block. In a mixed JS/TS repository, scope
it appropriately or use a separate disableTypeChecked override for JS tooling. Don't copy
this miniature config over a framework's existing configuration. The repository's complete
optional recipe is in configs/; it has actual positive/negative diagnostic fixtures.

## E2. Presets, upgrades and extension rules

[Shared configs](https://typescript-eslint.io/users/configs/) distinguish recommended,
strict and stylistic choices; strict configs can change outside a major version. Our
application: adopt stricter policies in a scoped change with fixture diagnostics. Don't
turn on every rule or mistake formatting preferences for runtime correctness.

When a TS-aware extension replaces a core ESLint rule, disable the core version in the
same scope to avoid duplicate or incorrect diagnostics. Check the resolved config after
upgrades. A new preset may change rule options even when your own override file did not.

## E3. no-floating-promises: who owns the operation?

[Rule](https://typescript-eslint.io/rules/no-floating-promises/): recognizes several
handling forms and configurable exceptions. Its default can allow explicit void; this
project opts out with ignoreVoid:false. Neither form makes a rejection disappear.

```ts
async function persist(): Promise<void> { throw new Error('disk'); }
function detached(): void {
  persist(); // Counterexample: caller cannot await or observe failure.
  void persist(); // Also unowned; void is not an error handler.
}
async function owned(): Promise<void> { await persist(); }
```

Our application: return/await work when completion matters. Intentional background work
needs an established supervisor/error sink and lifecycle. A catch that returns fake success
may satisfy a lint while violating the business contract. Test rejected promises, not just
resolved ones. The counterexample above is typechecked, not executed by the example runner.

## E4. no-misused-promises: a void callback can discard async work

[Rule](https://typescript-eslint.io/rules/no-misused-promises/) checks promises in conditions,
void-return positions and spreads, with options for each area. Our application: inspect
the receiving API before adding async or suppressing a diagnostic.

```ts
function consume(items: readonly number[], save: (n: number) => Promise<void>): void {
  items.forEach(async item => { await save(item); }); // Counterexample: no completion owner.
}
async function consumeInOrder(items: readonly number[], save: (n: number) => Promise<void>): Promise<void> {
  for (const item of items) await save(item);
}
```

An event handler may have to stay synchronous. In that case, bridge to the project's error
channel explicitly rather than changing the event API's type to pretend it awaits promises.
Don't disable checksVoidReturn globally to silence one integration boundary.

## E5. Unsafe-flow rules: contain any at the boundary

The [no-unsafe-assignment](https://typescript-eslint.io/rules/no-unsafe-assignment/),
[no-unsafe-member-access](https://typescript-eslint.io/rules/no-unsafe-member-access/),
[no-unsafe-call](https://typescript-eslint.io/rules/no-unsafe-call/),
[no-unsafe-argument](https://typescript-eslint.io/rules/no-unsafe-argument/) and
[no-unsafe-return](https://typescript-eslint.io/rules/no-unsafe-return/) rules detect different
ways any propagates. Fix the trust boundary rather than stacking assertions downstream.

```ts
function readTitle(text: string): string {
  const input: unknown = JSON.parse(text);
  if (typeof input !== 'object' || input === null || !('title' in input) ||
      typeof input.title !== 'string') throw new TypeError('title');
  return input.title;
}
```

Our application: unsafe-flow diagnostics often have one root cause. Group them during a
review and show where validation belongs. A complex JSON document may justify the project's
existing schema; the small example does not require a new dependency.

## E6. Select additional rules by the failure they prevent

| Rule | Useful question | Scope/exception |
|---|---|---|
| [await-thenable](https://typescript-eslint.io/rules/await-thenable/) | Is the awaited value actually awaitable? | Custom thenables need accurate declarations |
| [unbound-method](https://typescript-eslint.io/rules/unbound-method/) | Does a detached method require this? | Explicit this:void or a deliberate bound adapter |
| [switch-exhaustiveness-check](https://typescript-eslint.io/rules/switch-exhaustiveness-check/) | Did a finite union gain a case? | External data still needs validation |
| [strict-boolean-expressions](https://typescript-eslint.io/rules/strict-boolean-expressions/) | Does truthiness hide zero/empty? | Configure allowed types; not a mandatory preset here |
| [no-unnecessary-condition](https://typescript-eslint.io/rules/no-unnecessary-condition/) | Is a branch impossible under declared types? | Incorrect upstream types can conceal runtime inputs |
| [consistent-type-imports](https://typescript-eslint.io/rules/consistent-type-imports/) | Should this import exist at runtime? | Check decorators/emit/toolchain and side effects |
| [ban-ts-comment](https://typescript-eslint.io/rules/ban-ts-comment/) | Is a suppression narrowly justified? | Negative type tests intentionally expect errors |

These are selected decisions, not a digest of the entire rule catalog. Consult each rule's
versioned options; do not assume every listed rule is enabled by recommendedTypeChecked.

## E7. Prove diagnostics, not only failure exit codes

For an explicit rule change: run one bad input and a clean counterpart in the same project,
assert rule ID/location, and ensure no parser error substituted for the intended failure.
For type errors: an unused @ts-expect-error should fail the test when the expected error
vanishes. For application code: test behavior too; lint cannot prove selection/execution
order, cancellation, resource cleanup or meaningful recovery.

If lint reports zero files, inspect glob/ignore rules and effective config before declaring
success. If a file is outside its tsconfig, fix project ownership or a narrowly intended
scope rather than enabling an unbounded fallback project. [Dependency support](https://typescript-eslint.io/users/dependency-versions/)
and the installed lockfile determine compatibility, not a broad “latest TS works” claim.

## E8. Choosing Oxlint without losing coverage

Oxlint is an alternative lint engine, not a style authority. Its
[configuration](https://oxc.rs/docs/guide/usage/linter/config.html) supports rules,
plugins and overrides. A basic invocation does not establish type-aware coverage.
For [type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html),
install oxlint-tsgolint and enable typeAware or pass --type-aware.

A concrete migration sequence:

1. Inventory existing rules, options, framework plugins, file ownership and ignores.
2. Configure the corresponding Oxlint rules; promise rules use the typescript/
   namespace, such as typescript/no-floating-promises with ignoreVoid:false when
   that matches the project's policy.
3. Run bad and corrected inputs through both engines. Compare rule IDs, locations
   and actual included files; a successful empty run proves nothing.
4. Keep ESLint checks without verified equivalents. Remove duplicated checks only
   after their replacement is demonstrated.
5. Retain the project's compiler/build checks: tsgolint uses a separate type engine.

This project tests Oxlint 1.89.0 with oxlint-tsgolint 7.0.2005 (2026-10-27).
The two explicit async rules match our fixtures; this is not full preset parity.
Use the project's chosen linter rather than adding a second one automatically.


## E9. Lint can reveal escapes; it cannot decide the contract

When a patch becomes green after new any/assertions, suppressions or exclusions, inspect
the original mismatch. no-unsafe-* rules help find leaked any; no-unsafe-type-assertion and
no-unnecessary-type-parameters can expose some unsupported promises. Adopt extra rules
only where the existing engine/version supports them and their noise fits the project.
Do not enable every strict rule or add a second linter for one hypothetical warning.

The [no-unnecessary-condition limitations](https://typescript-eslint.io/rules/no-unnecessary-condition/#limitations)
include optimistic indexed access and mutation not tracked by narrowing. A diagnostic is
not proof that a guard can be removed. Establish the caller/runtime fact first. Conversely,
a trust boundary does not justify revalidating every internal call. Preserve narrow
[documented directive exceptions](https://typescript-eslint.io/rules/ban-ts-comment/),
including negative type tests; do not weaken a whole file or config to silence one problem.

No lint preset proves a migration is complete, identifies every duplicated business rule,
or establishes that a test exercises the shipped caller. Use the
[maintenance workflow](maintenance.md) for those decisions. Keep typed Oxlint as the new-setup
default and existing verified framework checks as described above.

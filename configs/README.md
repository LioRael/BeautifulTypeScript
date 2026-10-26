# Lint and compiler configuration recipes

**Default for new setups: type-aware Oxlint.** Keep existing framework/workspace
requirements; use ESLint where required plugins or rules lack verified equivalents.
The recipes remain opt-in for users installing only the skills.

Tested tuple: TypeScript 5.9.3, ESLint 10.13.0, typescript-eslint 8.72.1; exact dependencies
and transitive versions are locked. Registry checked 2026-10-27: TS latest was 7.0.2,
but typescript-eslint 8.72.1 declares `typescript >=4.8.4 <6.1.0`. We deliberately use
an older compatible compiler, not an unsupported latest/latest pairing. Check current
[dependency support](https://typescript-eslint.io/users/dependency-versions/) before updates.

The skills need no npm packages. These configs are opt-in examples, not a published npm
preset or a replacement for framework-generated config. Merge only the applicable parts.

- Copy eslint.config.mjs here into your project's configs directory, and call typedConfig
  from a root eslint.config.mjs as this repository does. Install the locked devDependency
  tuple (or a supported tuple matching your repo). Scope files and ignores to your project.
  projectService requires each linted TS file to belong to a tsconfig; do not blanket-enable
  allowDefaultProject to hide wrong project inclusion. JS/config files need a separate
  untyped config if you want to lint them. We intentionally lint only TS example code.
- recommendedTypeChecked supplies the tool's baseline rules. Our two explicit async rules
  are fixture-tested; we do not claim a fixture for every inherited rule. ignoreVoid:false
  is a local stricter choice so `void` alone cannot hide an unowned promise. Review existing
  supervised-task patterns before adopting it. Formatting is left to your project.
- tsconfig.base.json opts into strict plus indexed-access and exact-optional checks;
  these extra checks can require a staged legacy migration. Empty types prevents accidental
  ambient globals. Add host typings deliberately (e.g. @types/node if using Node APIs).
- tsconfig.node.json models compiled Node ESM with package.json type:module and .js imports.
  Adjust include/rootDir/outDir in the consumer config, relative to that config's location.
- tsconfig.browser.json models a bundler application. Its include path is the demo path:
  replace it in your project. Use your actual bundler/framework defaults, target and libs.
  A library intended for Node consumers should not casually adopt bundler resolution.

Run typecheck and lint after merging. Build and execute imports using the actual host.
TS lib declarations do not install polyfills. Bun and Deno need their own host validation;
no untested universal runtime preset is supplied.

## Oxlint: basic or type-aware

Tested on 2026-10-27 with Oxlint 1.89.0 and oxlint-tsgolint 7.0.2005.
Choose the recipe that fits your existing tooling. Both are optional for skill users.

For a basic pass alongside existing typed ESLint, copy [oxlint.json](oxlint.json)
to your project's configs directory:

```sh
npm install --save-dev --save-exact oxlint@1.89.0
npx oxlint -c configs/oxlint.json src --max-warnings 0
```

The recipe enables correctness checks and strict equality. It does not enable
type-aware promise checks. Replace src with your owned source directories; keep
generated code and intentionally broken evaluation fixtures outside that scope.
If moving the JSON to the project root as .oxlintrc.json, adjust its schema path
to ./node_modules/oxlint/configuration_schema.json. Explicit -c disables nested
config lookup; omit it and use discovered configs when your monorepo needs that.

For type-aware checks, copy **both** JSON files into configs/ and run:

```sh
npm install --save-dev --save-exact oxlint@1.89.0 oxlint-tsgolint@7.0.2005
npx oxlint -c configs/oxlint.typed.json src --max-warnings 0
```

[oxlint.typed.json](oxlint.typed.json) enables typeAware and explicitly configures
no-floating-promises (ignoreVoid:false) and no-misused-promises. Ensure files
belong to their intended tsconfig and build dependent declarations first.
The separate tsgolint engine is not the project's installed TypeScript compiler:
keep your existing typecheck/build command until compatibility is established.

In this repository, npm run lint runs type-aware Oxlint.
npm run lint:oxlint runs the basic pass; npm run lint:eslint checks the optional
ESLint recipe. The repository CI also exercises ESLint because we ship that recipe.
npm run check exercises both recipes, including bad/clean fixtures with asserted
diagnostic IDs, lines and nonempty file coverage. This proves the selected rules,
not equality with every recommendedTypeChecked rule or framework plugin.

When migrating, inventory existing rules/options, overrides, plugins and ignores.
Verify equivalent diagnostics before disabling any ESLint rule. Running both
temporarily can duplicate reports; retaining ESLint for remaining rules is valid.
Do not remove framework or custom checks merely because Oxlint exits successfully.

Sources: [configuration](https://oxc.rs/docs/guide/usage/linter/config.html),
[type-aware setup](https://oxc.rs/docs/guide/usage/linter/type-aware.html).

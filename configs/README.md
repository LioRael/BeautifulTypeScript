# Optional configuration recipes

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
no untested universal runtime preset or Oxlint parity claim is supplied.

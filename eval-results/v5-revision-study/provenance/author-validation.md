# Author validation

Two independent TypeScript tasks, with no reference solutions:

- revision-a: isolate delivery adapter failures and forward ordered failure information to checkout; four production modules, 113 initial lines.
- revision-b: restrict cart promotion thresholds/discounts to eligible catalog products and expose the base; four production modules, 138 initial lines.

Both are scoped for an approximately eight-minute implementation using the existing helpers and callers. Each has six frozen rubric criteria and six independent runtime groups. Hidden checkers take the candidate's files workspace, not the case directory, as argv[2]. They emit one JSON array; failed groups do not prevent subsequent groups from running. Public type accuracy and maintenance/evidence criteria also require review as described in each rubric.

Validation used preinstalled TypeScript 5.9.3. Node available here was 26.12.1; the documented target is Node 22 ESM, which was not available for validation. No installation or network access was used. Initial login-shell attempts to run npm in each case failed in the environment's mise initialization with “Operation not permitted”; a non-login shell with an invocation-local Node PATH succeeded. No persistent configuration was changed.

For each CASE (revision-a and revision-b), temporary tooling setup and commands were:

```sh
ln -s ../../node_modules "$CASE/files/node_modules"
# In CASE/files, using a non-login shell and the available Node binary directory on PATH:
npm run typecheck
npm run build
npm test
# From this author directory:
node "$CASE/graders/runtime.mjs" "$CASE/files"
```

Actual initial outcomes for both cases: typecheck passed; build passed; visible tests passed (2/2); hidden checker exited 0 and emitted six results (2 pass, 4 fail).

revision-a passing groups: validation-before-side-effects, result-and-parcel-ownership. Failing groups: failure-isolation (carrier throw rejects collection), settlement-and-order (collection settles too early), policy-and-empty-success (missing failure array), checkout-public-contract (carrier rejection propagates).

revision-b passing groups: existing-errors-and-range-policy, catalog-and-quote-ownership. Failing groups: eligible-base-and-minimum, public-field-and-no-code, line-order-and-quantities (missing eligible base), rounding-cap-and-boundaries (discount 102 instead of 3 for a mixed basket).

These are baseline outcomes, not solution results. Initial production implementations were left unchanged after validation. Temporary files/node_modules links and generated files/dist directories were removed after validation; the preinstalled root tooling was retained.

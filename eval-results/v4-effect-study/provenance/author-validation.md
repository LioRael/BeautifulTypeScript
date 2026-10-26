# Author validation

Three task packages; no reference solutions. Each has six frozen review criteria. Runtime groups are independent behavioral checks and are not a one-to-one scoring map to the review criteria.

Used the existing workspace node_modules (TypeScript 5.9.3); no packages installed. For each task, from this directory:

```sh
ln -s ../../node_modules TASK/files/node_modules
(cd TASK/files && npm run typecheck && npm test)
node TASK/graders/runtime.mjs "$PWD/TASK/files"
rm TASK/files/node_modules
rm -rf TASK/files/dist
```

Replace TASK with the directory name. Hidden runtime scripts expect the project to have been built and receive the files workspace as argv[2]. They write a JSON array to stdout; inspect each group's pass field, not process exit status. Async cases use deferred promises without timing sleeps.

Observed initial status:

| Task | Typecheck | Build / visible tests | Hidden runtime baseline |
| --- | --- | --- | --- |
| effect-internal | pass | pass / 1 test | 0/4 groups pass: requested roomWorkloads export is absent |
| effect-async | pass | pass / 2 tests | 2/6 groups pass: stale success, stale rejection, clear isolation, and synchronous throw behavior fail |
| effect-boundary | pass | pass / 1 test | 2/5 groups pass: shape, ID/unit/count, and numeric/chronological validation fail |

The starting implementations were left unchanged after validation. Temporary task-local node_modules symlinks and dist directories were removed. The pre-existing workspace node_modules was retained.

---
name: typescript-port
description: Port an existing module or service into TypeScript with characterization, staged implementation and behavioral verification. Use for cross-language ports or JavaScript-to-TypeScript migrations.
---

# TypeScript port

The deliverable is a working port with evidence for a defined input domain and runtime.
No language pair is automatically fully supported. Start with the source available;
do not promise equivalence when dependencies, platform APIs or tests are missing.
Read [semantic and host checklist](references/porting.md) for relevant source-language
hazards and a reusable evidence template.

## 1. Capture the source contract (TS06)

Read source, callers, tests and dependency/runtime versions. Run source tests before
editing. Record public APIs, input domain, outputs and side effects: ordering, mutation,
serialization, errors, exit codes, resource lifetime, timeouts and cancellation.
Add characterization cases for uncovered behavior. Keep a source-test → target-test
mapping; supplement tests with fixed and generated cross-language cases. Tests are
samples, not a complete specification. If source cannot execute, separate inferred
behavior from measured behavior and explain the gap.

## 2. Choose the target and model (TS01–TS05)

Name the actual Node/Bun/Deno/browser versions and deployment mode. Inventory native
extensions, filesystem/process use and framework integrations. Choose a narrow adapter
or retain an existing native/WASM component when a direct port cannot preserve behavior.
Map integer ranges/precision, records/maps, missing/null values, byte/text boundaries,
errors and asynchronous work before implementation. Use the project's error conventions;
a tagged union, exception or ordinary return value is a choice, not a mandatory rewrite.
Put runtime validation at foreign/untrusted boundaries; static interfaces are erased.

## 3. Port in runnable slices

Translate or reproduce tests first, including failures. Port one pure core operation,
then stateful behavior, then I/O adapters, then integration. Keep source and target
runnable side by side until comparison passes. For JavaScript migration, consider a
scoped allowJs/checkJs stage if compatible with the repository, and retire temporary
unsafe types deliberately. Do not rewrite architecture or optimize during translation.
Do not silently normalize behavior, fix source bugs, reduce numeric ranges or drop edge
cases. Record proposed deviations; preserve the contract unless a change is authorized.
If an ambiguity prevents a slice, continue independent slices and report the blocker.

## 4. Compare results and failures

Use a common input corpus and a documented wire format. Compare outputs, ordering,
mutation and error categories; compare messages only when they are part of the contract.
Normalization must not hide meaningful differences (sorting output would hide an order
bug). Include boundaries, invalid input, Unicode, numeric limits and deterministic
random cases. Test async rejection, order, backpressure, cancellation and cleanup when
the source exposes them. A JSON adapter cannot prove aliasing, threads or all numeric
semantics: add in-process/integration checks for those. Run each advertised host.

## 5. Benchmark only after equivalence (TS08)

Choose representative workloads, validate equal results, warm up, repeat and alternate
run order. Record versions, machine, input sizes, raw samples and median/range. Separate
startup/IPC/parse cost from steady-state computation. Do not call a language faster based
on an unrepresentative microbenchmark. If no comparable harness is feasible, say so.

## 6. Deliver evidence (TS09)

Provide source/target API and test mappings, supported domain and runtimes, preserved
quirks, authorized differences, unresolved cases and actual verification commands in
PORTING.md. Keep the original implementation until cutover is authorized. Do not claim
full equivalence or a speedup beyond the measured corpus/workload.

Example request: “Port this Python aggregation function to a Node ESM TypeScript library.
Preserve first-seen order and errors; run both versions on the same boundary cases.”

Read [sources and rule map](references/sources.md) when resolving a rule or style conflict.
This reference is bundled so this skill works alone. Respect repository instructions,
framework conventions, supported runtimes and the user's scope. Do not install a new
architecture, Result type, validation library or formatter just to satisfy this skill.

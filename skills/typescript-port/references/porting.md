# Porting decisions and evidence

Use only the rows relevant to the actual source; this is a risk checklist, not a support guarantee.

| Source property | TypeScript decision and test |
|---|---|
| Python arbitrary integers; bool is an int subclass | Define safe-number domain or bigint/string protocol; test booleans and 2^53 boundaries. Never silently round. |
| Python dict insertion order | Map for arbitrary string keys; JS object enumeration can reorder integer-like keys. Test `10`, `2`, `__proto__`. |
| Python Unicode, slicing, floor division | Specify code points versus UTF-16 units, negative indices, truncation versus floor; compare concrete cases. |
| Go goroutines/channels/context | Promise tasks are not threads/channels. Specify ordering, capacity, cancellation and backpressure; use bounded queues or workers only as needed. |
| Java/C# exceptions, overloads, decimal/long | Map failure identity, overload behavior, precision and resource disposal explicitly. Test serialization and public callers. |
| C/C++ pointers, native ABI, undefined behavior | Port defined observable behavior; inventory ownership, buffers, signed overflow and native dependencies. Use adapters/WASM if needed, and document unsupported behavior. |
| Rust ownership, Result, panic | Preserve observable lifetime/failure behavior; GC and exceptions have different timing. Keep a Result only if the API benefits or compatibility requires it. |
| JavaScript coercion and prototypes | Characterize coercion before tightening types; types do not change runtime. Preserve public compatibility during incremental migration. |

## Host boundaries

| Host | Verify before claiming support |
|---|---|
| Node | Actual minimum version, ESM/CJS imports, built JS extensions, exports, fs/process/native packages |
| Bun | Run its tests/runtime; verify Node compatibility for the particular APIs and dependencies, not by assumption |
| Deno | Version, permissions, npm/import mapping, file/network APIs; run deno check/test for the chosen layout |
| Browser | Bundle and browser smoke test; no accidental node globals; DOM/Web Worker split, CORS and available Web APIs |

A pure core without host imports is a useful starting point, not proof it runs everywhere.
Separate compilation contexts where globals differ. For each target record supported,
tested, or untested; do not label an unrun target verified.

## PORTING.md template

- Source revision/runtime and target runtime/toolchain.
- Public API mapping and allowed input domain, including numeric and text semantics.
- Source test → target test mapping; added characterization cases and corpus seed.
- Error categories/messages, state mutation, order, cancellation and cleanup contract.
- Host adapters/dependencies; unsupported features and reasons.
- Preserved quirks; authorized deviations with rationale and caller impact.
- Actual commands, results, comparison normalization and remaining gaps.
- Benchmark workload, environment, raw samples, result checks and limits, if measured.

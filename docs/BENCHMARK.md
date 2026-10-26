# Local algorithm comparison

Measured Tuesday, October 27, 2026 at 1:35:07 a.m. GMT+8 (UTC timestamp: 2026-10-26T17:35:07.042Z) on Apple M2 Pro, darwin/arm64, Node v26.10.0.

| Rows / distinct keys | Linear median ms (min–max) | Map median ms (min–max) | Linear / Map |
|---|---|---|---|
| 100 / 10 | 0.003 (0.002–0.010) | 0.002 (0.002–0.005) | 1.21× |
| 10000 / 100 | 1.622 (1.602–1.688) | 0.185 (0.158–0.221) | 8.79× |
| 10000 / 5000 | 77.073 (76.636–77.943) | 0.487 (0.439–0.697) | 158.10× |

Run: npm run benchmark. Both implementations validate all rows, aggregate and allocate output. Results are checked before timing. 20 warmups per implementation/workload, 9 batches alternating order, 500 iterations/batch for 100 rows and 5 for larger workloads. Values are milliseconds per invocation. Raw data: [latest.json](../benchmark-results/latest.json).

This measures linear search versus Map in the same Node process. Startup, Python execution, IPC and JSON parsing are excluded. One machine, synthetic data, warm JIT, uncontrolled GC/background load, no confidence intervals or production claim. Small-input differences may be noise; high key counts favor the Map algorithm. This does not measure language superiority or agent-skill quality. The separate [paired agent evaluation](EVALUATION.md) records with/without-skill runs.

An earlier exploratory run overlapping dependency work is retained separately; see [validation record](VALIDATION.md).

import { performance } from 'node:perf_hooks';
import { cpus, platform, arch } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { aggregate, aggregateLinear } from '../dist/inventory.js';
const report = { date: new Date().toISOString(), localDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', dateStyle: 'full', timeStyle: 'long' }).format(new Date()), node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model, samples: [] };
let sink = 0;
for (const [rows, keys] of [[100, 10], [10000, 100], [10000, 5000]]) {
  const input = Array.from({ length: rows }, (_, i) => ({ key: `k${i % keys}`, quantity: i % 7 - 3 }));
  assert.deepEqual(aggregate(input), aggregateLinear(input));
  const iterations = rows === 100 ? 500 : 5;
  for (let i = 0; i < 20; i++) { aggregate(input); aggregateLinear(input); }
  const samples = { rows, keys, iterations, map: [], linear: [] };
  const measure = (fn) => { const start = performance.now(); for (let i = 0; i < iterations; i++) sink += fn(input).length; return (performance.now() - start) / iterations; };
  for (let i = 0; i < 9; i++) {
    for (const name of i % 2 ? ['map', 'linear'] : ['linear', 'map']) samples[name].push(measure(name === 'map' ? aggregate : aggregateLinear));
  }
  report.samples.push(samples);
}
report.sink = sink;
mkdirSync('benchmark-results', { recursive: true });
writeFileSync('benchmark-results/latest.json', JSON.stringify(report, null, 2) + '\n');
const median = xs => [...xs].sort((a,b) => a-b)[Math.floor(xs.length / 2)];
const range = xs => `${Math.min(...xs).toFixed(3)}–${Math.max(...xs).toFixed(3)}`;
const lines = report.samples.map(s => `| ${s.rows} / ${s.keys} | ${median(s.linear).toFixed(3)} (${range(s.linear)}) | ${median(s.map).toFixed(3)} (${range(s.map)}) | ${(median(s.linear) / median(s.map)).toFixed(2)}× |`);
writeFileSync('docs/BENCHMARK.md', `# Local algorithm comparison\n\nMeasured ${report.localDate} (UTC timestamp: ${report.date}) on ${report.cpu}, ${report.platform}/${report.arch}, Node ${report.node}.\n\n| Rows / distinct keys | Linear median ms (min–max) | Map median ms (min–max) | Linear / Map |\n|---|---|---|---|\n${lines.join('\n')}\n\nRun: npm run benchmark. Both implementations validate all rows, aggregate and allocate output. Results are checked before timing. 20 warmups per implementation/workload, 9 batches alternating order, 500 iterations/batch for 100 rows and 5 for larger workloads. Values are milliseconds per invocation. Raw data: [latest.json](../benchmark-results/latest.json).\n\nThis measures linear search versus Map in the same Node process. Startup, Python execution, IPC and JSON parsing are excluded. One machine, synthetic data, warm JIT, uncontrolled GC/background load, no confidence intervals or production claim. Small-input differences may be noise; high key counts favor the Map algorithm. This does not measure language superiority or agent-skill quality. No with/without-skill agent trial was run. An earlier exploratory run (exploratory.json), overlapping dependency work, is retained separately; see VALIDATION.md.\n`);
console.log(JSON.stringify(report, null, 2));

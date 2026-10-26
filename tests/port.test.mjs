import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { aggregate, aggregateLinear } from '../dist/inventory.js';

const cases = JSON.parse(readFileSync(new URL('../examples/port/cases.json', import.meta.url)));
function envelope(fn, input) {
  try { return { ok: fn(input) }; }
  catch (error) {
    if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
    return { error: error.message };
  }
}
for (const c of cases) test(c.name, () => {
  assert.deepEqual(envelope(aggregate, c.input), c.expected);
  assert.deepEqual(envelope(aggregateLinear, c.input), c.expected);
});
test('source characterization tests', () => {
  execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'examples/port', '-p', 'test_source.py']);
});
test('312 differential cases, seed 20261027', () => {
  let state = 20261027;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
  const keys = ['10', '2', '__proto__', 'constructor', '', '猫😀', 'é', 'é'];
  const corpus = cases.map(c => c.input);
  for (let i = 0; i < 300; i++) {
    const rows = Array.from({ length: next() % 80 }, () => ({ key: keys[next() % keys.length], quantity: next() % 2001 - 1000 }));
    if (i % 7 === 0) rows.push({ key: 'bad', quantity: null });
    corpus.push(rows);
  }
  const expected = JSON.parse(execFileSync('python3', ['examples/port/source.py'], { input: JSON.stringify(corpus), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  assert.deepEqual(corpus.map(c => envelope(aggregate, c)), expected);
  assert.deepEqual(corpus.map(c => envelope(aggregateLinear, c)), expected);
});
test('does not mutate inputs; returns fresh rows', () => {
  const row = Object.freeze({ key: 'x', quantity: 1 });
  const input = Object.freeze([row, row]);
  assert.deepEqual(aggregate(input), [{ key: 'x', quantity: 2 }]);
  assert.notEqual(aggregate([row])[0], row);
});
test('rejects target-only nonfinite values', () => {
  for (const quantity of [NaN, Infinity, -Infinity, undefined]) {
    assert.throws(() => aggregate([{ key: 'x', quantity }]), /invalid-input/);
  }
});

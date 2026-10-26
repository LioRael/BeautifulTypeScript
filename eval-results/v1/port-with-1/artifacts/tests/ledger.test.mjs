import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { summarize } from '../dist/ledger.js';
test('empty', () => assert.deepEqual(summarize([]), []));

test('group', () => assert.deepEqual(summarize([
  { key: 'a', amount: '2' }, { key: 'a', amount: '-1' },
]), [{ key: 'a', total: '1', priority: 100 }]));

test('first_priority', () => assert.equal(summarize([
  { key: 'a', amount: '1', priority: 5 },
  { key: 'a', amount: '2', priority: 0 },
])[0].priority, 5));

test('bad_amount', () => assert.throws(
  () => summarize([{ key: 'a', amount: '1.5' }]), /^Error: amount$/));

test('stable priority order and arbitrary keys', () => assert.deepEqual(summarize([
  { key: '10', amount: '1' }, { key: '2', amount: '2' },
  { key: '__proto__', amount: '3', priority: -1000 },
  { key: 'constructor', amount: '4', priority: 1000 },
  { key: '', amount: '-0', priority: null },
]).map(g => g.key), ['__proto__', '10', '2', '', 'constructor']));

test('exact large totals and decimal normalization', () => {
  const digits = '9'.repeat(5000);
  assert.equal(summarize([{ key: 'x', amount: digits }, { key: 'x', amount: '+0001' }])[0].total,
    '1' + '0'.repeat(5000));
  assert.equal(summarize([{ key: 'x', amount: '-000' }])[0].total, '0');
});

test('failure codes, precedence, and validation of later duplicates', () => {
  for (const [rows, code] of [
    [null, 'rows'], [{}, 'rows'], [[null], 'key'], [[[]], 'key'],
    [[{ key: 1 }], 'key'], [[{ key: 'x' }], 'amount'],
    [[{ key: 'x', amount: '1\n' }], 'amount'],
    [[{ key: 'x', amount: '١' }], 'amount'],
    [[{ key: 'x', amount: '1', priority: true }], 'priority'],
    [[{ key: 'x', amount: '1', priority: 1.5 }], 'priority'],
    [[{ key: 'x', amount: '1', priority: 1001 }], 'priority'],
    [[{ key: 'x', amount: 'bad', priority: false }], 'amount'],
    [[{ key: 'x', amount: '1' }, { key: 'x', amount: '1', priority: '0' }], 'priority'],
  ]) assert.throws(() => summarize(rows), error => error instanceof Error && error.message === code);
});

test('does not mutate inputs or share returned groups between calls', () => {
  const rows = Object.freeze([Object.freeze({ key: 'x', amount: '1' })]);
  const first = summarize(rows);
  first[0].total = 'changed';
  assert.deepEqual(summarize(rows), [{ key: 'x', total: '1', priority: 100 }]);
});

test('deterministic JSON differential corpus matches Python values and failures', () => {
  let seed = 0x1ed6e7;
  const next = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const keys = ['', '10', '2', '__proto__', 'constructor', '😀', 'é', 'é', '\u0000'];
  const amounts = ['0', '-0', '+0001', '-005', '9'.repeat(100), '', ' 1', '1\n', '１２', '1e2', null, 1, true];
  const priorities = [undefined, null, -1000, 1000, 100, 0, -1, true, false, '1', 1.5, 1001, [], {}];
  const corpus = [null, {}, 'rows', 1, true, [], [null], [[]], [{}], [{ key: false }],
    [{ key: 'big', amount: '9'.repeat(5000) }, { key: 'big', amount: '1' }]];
  corpus.push(...amounts.map(amount => [{ key: 'x', amount }]));
  corpus.push(...priorities.map(priority => [{ key: 'x', amount: '1', priority }]));
  for (let i = 0; i < 600; i++) {
    const rows = [];
    for (let j = next(8); j > 0; j--) {
      const row = { key: keys[next(keys.length)], amount: amounts[next(amounts.length)] };
      const priority = priorities[next(priorities.length)];
      if (priority !== undefined) row.priority = priority;
      rows.push(row);
    }
    corpus.push(rows);
  }
  // Also exercise many successful groups, ties, cancellations and huge sums.
  for (let i = 0; i < 150; i++) {
    corpus.push(Array.from({ length: next(30) }, () => ({
      key: keys[next(keys.length)], amount: amounts[next(5)], priority: priorities[next(7)],
    })));
  }
  const python = spawnSync('python3', ['-c', `
import json, sys
sys.path.insert(0, 'source')
from ledger import summarize
out = []
for rows in json.load(sys.stdin):
    try: out.append({'value': summarize(rows)})
    except ValueError as error: out.append({'error': str(error)})
json.dump(out, sys.stdout)
`], { input: JSON.stringify(corpus), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(python.status, 0, python.stderr || String(python.error || ''));
  const expected = JSON.parse(python.stdout);
  corpus.forEach((rows, index) => {
    let actual;
    try { actual = { value: summarize(rows) }; }
    catch (error) { assert.ok(error instanceof Error); actual = { error: error.message }; }
    assert.deepEqual(actual, expected[index], `corpus case ${index}`);
  });
});

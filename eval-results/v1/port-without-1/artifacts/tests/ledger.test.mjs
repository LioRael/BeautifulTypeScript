import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../dist/ledger.js';

const row = (key, amount, priority = undefined) => ({ key, amount, priority });
function fails(input, code) {
  assert.throws(() => summarize(input), error =>
    error.constructor === Error && error.message === code);
}

test('empty (Python test_empty)', () => assert.deepEqual(summarize([]), []));
test('group (Python test_group)', () => {
  assert.deepEqual(summarize([row('a', '2'), row('a', '-1')]),
    [{ key: 'a', total: '1', priority: 100 }]);
});
test('first priority (Python test_first_priority)', () => {
  assert.deepEqual(summarize([row('a', '1', 5), row('a', '2', 0)]),
    [{ key: 'a', total: '3', priority: 5 }]);
});
test('bad amount (Python test_bad_amount)', () => fails([row('a', '1.5')], 'amount'));

test('priority sorting, stable ties, defaults and bounds', () => {
  assert.deepEqual(summarize([
    row('z', '1', 1000), row('b', '2', 0), row('a', '3', 0),
    row('default', '4'), row('null', '5', null), row('low', '6', -1000),
    row('b', '7', -1000),
  ]), [
    { key: 'low', total: '6', priority: -1000 },
    { key: 'b', total: '9', priority: 0 },
    { key: 'a', total: '3', priority: 0 },
    { key: 'default', total: '4', priority: 100 },
    { key: 'null', total: '5', priority: 100 },
    { key: 'z', total: '1', priority: 1000 },
  ]);
});
test('exact totals, signed decimals, leading zeros and canonical zero', () => {
  assert.deepEqual(summarize([
    row('huge', '90071992547409931234567890'), row('huge', '+00010'),
    row('zero', '-000'), row('cancel', '+0012'), row('cancel', '-12'),
  ]), [
    { key: 'huge', total: '90071992547409931234567900', priority: 100 },
    { key: 'zero', total: '0', priority: 100 },
    { key: 'cancel', total: '0', priority: 100 },
  ]);
  const huge = '9'.repeat(5000);
  assert.equal(summarize([row('x', huge)])[0].total, huge);
});
test('keys are exact strings, including object property names and Unicode', () => {
  const keys = ['__proto__', 'constructor', 'toString', '', '10', '2', 'é', 'e\u0301', '😀'];
  assert.deepEqual(summarize(keys.map(key => row(key, '1'))),
    keys.map(key => ({ key, total: '1', priority: 100 })));
  assert.deepEqual(summarize(JSON.parse('[{"key":"__proto__","amount":"2"}]')),
    [{ key: '__proto__', total: '2', priority: 100 }]);
});
test('rows must be a list', () => {
  for (const input of [undefined, null, {}, '[]', 0, false]) fails(input, 'rows');
});
test('row and key validation', () => {
  for (const input of [null, [], 'a', 1, true, {}, { key: null }, { key: 1 }]) {
    fails([input], 'key');
  }
});
test('amount must be a complete signed ASCII decimal string', () => {
  for (const amount of [undefined, null, 1, true, '', '+', '-', '1.5', '1e3', '0x10',
    ' 1', '1 ', '1\n', '1\r\n', '\n1', '１２', '١', '−1', '++1', '+-1', '1_000']) {
    fails([row('a', amount)], 'amount');
  }
});
test('priority must be an integer in range, excluding booleans', () => {
  for (const priority of [true, false, '1', [], {}, 0.5, -1001, 1001, NaN, Infinity]) {
    fails([row('a', '1', priority)], 'priority');
  }
});
test('validation order and validation of duplicate rows', () => {
  fails([{ key: 1, amount: 'bad', priority: false }], 'key');
  fails([row('a', 'bad', false)], 'amount');
  fails([row('a', '1'), row('a', '2', false)], 'priority');
  fails([row('a', '1'), row('a', 'bad')], 'amount');
});
test('does not mutate input and returns fresh output', () => {
  const input = Object.freeze([Object.freeze({ key: 'a', amount: '1', extra: true })]);
  const first = summarize(input);
  first[0].total = 'changed';
  assert.deepEqual(summarize(input), [{ key: 'a', total: '1', priority: 100 }]);
});

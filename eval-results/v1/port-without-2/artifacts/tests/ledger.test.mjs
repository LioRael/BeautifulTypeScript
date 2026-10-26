import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../dist/ledger.js';

const row = (amount, priority = 100, key = 'a') => ({ key, amount, priority });
const fails = (input, code) => assert.throws(() => summarize(input), {
  name: 'Error', message: code,
});

test('empty (Python test_empty)', () => assert.deepEqual(summarize([]), []));
test('group (Python test_group)', () => assert.deepEqual(
  summarize([row('2'), row('-1')]), [row('1')].map(({ amount, ...rest }) => ({ ...rest, total: amount })),
));
test('first priority (Python test_first_priority)', () => {
  assert.deepEqual(summarize([row('1', 5), row('2', 0)]), [{ key: 'a', total: '3', priority: 5 }]);
});
test('bad amount (Python test_bad_amount)', () => fails([row('1.5')], 'amount'));

test('exact signed decimal arithmetic and canonical output', () => {
  assert.deepEqual(summarize([row('+0002'), row('-0002'), row('-0')]),
    [{ key: 'a', total: '0', priority: 100 }]);
  assert.deepEqual(summarize([row('9007199254740993123456789'), row('-2')]),
    [{ key: 'a', total: '9007199254740993123456787', priority: 100 }]);
  const huge = '9'.repeat(1000);
  assert.equal(summarize([row(huge), row('1')])[0].total, '1' + '0'.repeat(1000));
});
test('priority sorting is stable and uses the first record', () => {
  assert.deepEqual(summarize([
    row('1', 2, 'z'), row('2', -1000, 'b'), row('3', 2, 'a'),
    row('4', 1000, 'b'), row('5', 1000, 'c'),
  ]), [
    { key: 'b', total: '6', priority: -1000 },
    { key: 'z', total: '1', priority: 2 },
    { key: 'a', total: '3', priority: 2 },
    { key: 'c', total: '5', priority: 1000 },
  ]);
});
test('missing/null priorities default; empty and special keys are valid', () => {
  assert.deepEqual(summarize([
    { key: '', amount: '1' }, row('2', null, '__proto__'),
    row('3', 100, 'constructor'), row('4', 100, '10'), row('5', 100, '2'),
  ]).map(g => [g.key, g.priority]), [
    ['', 100], ['__proto__', 100], ['constructor', 100], ['10', 100], ['2', 100],
  ]);
});
test('rows and key failures', () => {
  for (const input of [null, {}, '[]', 1, true]) fails(input, 'rows');
  for (const input of [null, [], 'a', 1, true, {}, { key: null }, { key: 1 }]) {
    fails([input], 'key');
  }
});
test('amount syntax is strictly signed ASCII decimal', () => {
  for (const amount of [undefined, null, 1, true, '', '+', '-', ' 1', '1 ',
    '1\n', '1\r', '1\r\n', '1\u2028', '1\u0000', '١', '１', '1_0',
    '1e2', '0x10', '--1', '+-1', '1.5']) fails([row(amount)], 'amount');
});
test('priority must be an integer in the inclusive range', () => {
  for (const priority of [true, false, '1', 0.5, -1001, 1001, [], {}, NaN, Infinity]) {
    fails([row('1', priority)], 'priority');
  }
  for (const priority of [-1000, 0, 1000]) assert.equal(summarize([row('1', priority)])[0].priority, priority);
});
test('validation order and duplicate-row validation', () => {
  fails([{ key: 1, amount: 'x', priority: false }], 'key');
  fails([row('x', false)], 'amount');
  fails([row('1'), row('2', false)], 'priority');
  fails([row('1'), row('x')], 'amount');
});
test('input is unchanged and calls are independent', () => {
  const input = Object.freeze([Object.freeze(row('2'))]);
  const first = summarize(input);
  first[0].total = 'changed';
  assert.deepEqual(summarize(input), [{ key: 'a', total: '2', priority: 100 }]);
  assert.deepEqual(input, [row('2')]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { summarize } from '../dist/ledger.js';

test('empty (test_empty)', () => assert.deepEqual(summarize([]), []));
test('group (test_group)', () => assert.deepEqual(summarize([
  {key: 'a', amount: '2'}, {key: 'a', amount: '-1'},
]), [{key: 'a', total: '1', priority: 100}]));
test('first priority (test_first_priority)', () => assert.equal(summarize([
  {key: 'a', amount: '1', priority: 5}, {key: 'a', amount: '2', priority: 0},
])[0].priority, 5));
const fails = (rows, code) => assert.throws(() => summarize(rows),
  error => error instanceof Error && error.message === code);
test('bad amount (test_bad_amount)', () => fails([{key: 'a', amount: '1.5'}], 'amount'));
test('validation and failure precedence', () => {
  for (const rows of [null, {}, 'x', 1, true]) fails(rows, 'rows');
  for (const row of [null, [], 1, 'x', {}, {key: null}, {key: 1}]) fails([row], 'key');
  for (const amount of [undefined, null, 1, true, '', '+', '-', '1.5', '1e2', ' 1', '1 ', '1\n', '1\r\n', '١', '１２', '1_0', '0x10']) {
    fails([{key: 'a', amount, priority: false}], 'amount');
  }
  for (const priority of [true, false, '1', [], {}, 0.5, -1001, 1001, NaN, Infinity]) {
    fails([{key: 'a', amount: '1', priority}], 'priority');
  }
  fails([{key:'a', amount:'1'}, {key:'a', amount:'1', priority:false}], 'priority');
  fails([{key:'a', amount:'x'}, {}], 'amount');
});
test('exact arithmetic, canonical zero and full string parsing', () => {
  const huge = '9'.repeat(5000);
  assert.deepEqual(summarize([{key:'', amount:huge}, {key:'', amount:'1'}]),
    [{key:'', total:'1' + '0'.repeat(5000), priority:100}]);
  for (const amount of ['+000', '-000', '0']) assert.equal(summarize([{key:'x', amount}])[0].total, '0');
  assert.equal(summarize([{key:'x', amount:'+00012'}, {key:'x', amount:'-2'}])[0].total, '10');
});
test('stable ordering, arbitrary keys, defaults and boundaries', () => {
  const keys = ['10', '2', '__proto__', 'constructor', 'toString', '', 'é', 'é', '😀'];
  assert.deepEqual(summarize(keys.map(key => ({key, amount:'1', priority:null}))).map(g => g.key), keys);
  assert.deepEqual(summarize([
    {key:'z',amount:'1',priority:1000}, {key:'a',amount:'1',priority:-1000},
    {key:'b',amount:'1'}, {key:'c',amount:'1',priority:null},
  ]).map(g => g.key), ['a','b','c','z']);
});
test('synchronous, no mutation or retained state; fresh outputs', () => {
  const row = Object.freeze({key:'a', amount:'2', priority:3});
  const rows = Object.freeze([row, row]);
  const result = summarize(rows);
  assert.deepEqual(result, [{key:'a',total:'4',priority:3}]);
  result[0].total = 'changed';
  assert.deepEqual(summarize(rows), [{key:'a',total:'4',priority:3}]);
  fails([{key:'a',amount:'1'}, {key:'b',amount:'bad'}], 'amount');
  assert.deepEqual(summarize([]), []);
});

test('source differential corpus (seed 0x51ed270b)', () => {
  let seed = 0x51ed270b;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const keys = ['10', '2', '__proto__', '', 'é', 'é', '😀'];
  const corpus = [[], null, {}, [null], [{}], [{key:'a',amount:'1\n'}],
    [{key:'x',amount:'9'.repeat(5000)}, {key:'x',amount:'1'}]];
  const amounts = ['+00012','-0','9007199254740993','-9007199254740992','1.5','١','1\n',''];
  const priorities = [null,-1000,1000,0,5,true,0.5,1001,'1'];
  for (let i = 0; i < 300; i++) {
    const rows = [];
    const size = next() % 12;
    for (let j = 0; j < size; j++) {
      const row = {key:keys[next() % keys.length], amount: i % 3 === 0 ? amounts[next() % amounts.length] : String(next())};
      if (next() % 3) row.priority = i % 4 === 0 ? priorities[next() % priorities.length] : (next() % 2001) - 1000;
      rows.push(row);
    }
    corpus.push(rows);
  }
  const script = `import json, sys\nsys.path.insert(0, 'source')\nfrom ledger import summarize\ndef run(rows):\n try: return {'ok': summarize(rows)}\n except ValueError as e: return {'error': str(e)}\nprint(json.dumps([run(rows) for rows in json.load(sys.stdin)], ensure_ascii=True))`;
  const source = spawnSync('python3', ['-c', script], {input:JSON.stringify(corpus), encoding:'utf8', maxBuffer:1024*1024});
  assert.equal(source.status, 0, source.stderr);
  const expected = JSON.parse(source.stdout);
  corpus.forEach((rows, index) => {
    let actual;
    try { actual = {ok:summarize(rows)}; } catch (error) { actual = {error:error.message}; }
    assert.deepEqual(actual, expected[index], `corpus case ${index}`);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, loadSettings } from '../dist/settings.js';
test('defaults', () => assert.deepEqual(parseSettings({ endpoint: '/api' }), { endpoint: '/api', retries: 3, enabled: true }));

test('preserves endpoint text, accepts retry boundaries and false, and drops extra fields', () => {
  for (const retries of [0, 1, 2, 3, 4, 5]) {
    assert.deepEqual(parseSettings({ endpoint: ' /api\n', retries, enabled: false, extra: 1 }), {
      endpoint: ' /api\n', retries, enabled: false,
    });
  }
  assert.equal(parseSettings({ endpoint: ' ' }).endpoint, ' ');
  assert.deepEqual(parseSettings({ endpoint: '/api', enabled: true }), {
    endpoint: '/api', retries: 3, enabled: true,
  });
});

test('returns fresh objects without mutating the input', () => {
  const input = Object.freeze({ endpoint: '/api', retries: 2, enabled: false, extra: 'ignored' });
  const first = parseSettings(input);
  const second = parseSettings(input);
  assert.notStrictEqual(first, input);
  assert.notStrictEqual(first, second);
  first.endpoint = '/changed';
  assert.equal(input.endpoint, '/api');
  assert.equal(second.endpoint, '/api');
  assert.deepEqual(Object.keys(second), ['endpoint', 'retries', 'enabled']);
});

test('rejects non-object settings and arrays', () => {
  for (const input of [null, undefined, [], ['/api'], 'text', 1, true, () => {}]) {
    assert.throws(() => parseSettings(input), { name: 'TypeError', message: /settings/ });
  }
});

test('requires a nonempty string endpoint', () => {
  for (const input of [{}, ...[undefined, null, '', 0, false, [], {}].map(endpoint => ({ endpoint }))]) {
    assert.throws(() => parseSettings(input), { name: 'TypeError', message: /endpoint/ });
  }
});

test('rejects invalid retries without coercion or defaulting explicit values', () => {
  for (const retries of [undefined, null, -1, 6, 0.5, NaN, Infinity, -Infinity, '3', true, [], {}]) {
    assert.throws(() => parseSettings({ endpoint: '/api', retries }), {
      name: 'TypeError', message: /retries/,
    });
  }
});

test('rejects non-boolean enabled values', () => {
  for (const enabled of [undefined, null, 0, 1, '', 'true', [], {}]) {
    assert.throws(() => parseSettings({ endpoint: '/api', enabled }), {
      name: 'TypeError', message: /enabled/,
    });
  }
});

test('uses own fields, including on objects with no prototype', () => {
  const input = Object.assign(Object.create(null), { endpoint: '/api' });
  assert.deepEqual(parseSettings(input), { endpoint: '/api', retries: 3, enabled: true });
  assert.throws(() => parseSettings(Object.create({ endpoint: '/inherited' })), {
    name: 'TypeError', message: /endpoint/,
  });
  const inheritedOptions = Object.assign(Object.create({ retries: 0, enabled: false }), { endpoint: '/api' });
  assert.deepEqual(parseSettings(inheritedOptions), { endpoint: '/api', retries: 3, enabled: true });
});

test('loadSettings reads once and validates parsed JSON', async () => {
  let calls = 0;
  const result = await loadSettings(async () => {
    calls++;
    return '{"endpoint":" /api ","retries":0,"enabled":false,"extra":1}';
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { endpoint: ' /api ', retries: 0, enabled: false });
  assert.deepEqual(await loadSettings(async () => '{"endpoint":"/api"}'), {
    endpoint: '/api', retries: 3, enabled: true,
  });
});

test('loadSettings rejects invalid parsed data with field errors', async () => {
  for (const [text, field] of [
    ['null', 'settings'], ['[]', 'settings'], ['{}', 'endpoint'],
    ['{"endpoint":"/api","retries":null}', 'retries'],
    ['{"endpoint":"/api","enabled":null}', 'enabled'],
  ]) {
    await assert.rejects(loadSettings(async () => text), {
      name: 'TypeError', message: new RegExp(field),
    });
  }
});

test('loadSettings preserves read failures and does not retry', async () => {
  const failure = new Error('read failed');
  let calls = 0;
  await assert.rejects(loadSettings(async () => { calls++; throw failure; }), error => error === failure);
  assert.equal(calls, 1);
  await assert.rejects(loadSettings(() => { throw failure; }), error => error === failure);
});

test('loadSettings propagates JSON syntax errors', async () => {
  const text = '{broken';
  let expected;
  try { JSON.parse(text); } catch (error) { expected = error; }
  await assert.rejects(loadSettings(async () => text), {
    name: expected.name, message: expected.message,
  });
});

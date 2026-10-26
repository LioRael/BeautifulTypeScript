import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, loadSettings } from '../dist/settings.js';
test('defaults', () => assert.deepEqual(parseSettings({ endpoint: '/api' }), { endpoint: '/api', retries: 3, enabled: true }));

test('preserves endpoint strings exactly and accepts retry boundaries and false', () => {
  for (const endpoint of ['/api', '  /api  ', ' ', 'https://example.test']) {
    for (let retries = 0; retries <= 5; retries++) {
      assert.deepEqual(parseSettings({ endpoint, retries, enabled: false }), {
        endpoint, retries, enabled: false,
      });
    }
  }
});

test('defaults each absent optional field independently', () => {
  assert.deepEqual(parseSettings({ endpoint: '/api', enabled: false }), {
    endpoint: '/api', retries: 3, enabled: false,
  });
  assert.deepEqual(parseSettings({ endpoint: '/api', retries: 0 }), {
    endpoint: '/api', retries: 0, enabled: true,
  });
});

test('returns fresh objects containing only the documented fields without mutating input', () => {
  const input = Object.freeze({ endpoint: '/api', retries: 2, enabled: true, extra: 42 });
  const first = parseSettings(input);
  const second = parseSettings(input);
  assert.deepEqual(first, { endpoint: '/api', retries: 2, enabled: true });
  assert.notStrictEqual(first, input);
  assert.notStrictEqual(first, second);
  first.endpoint = '/changed';
  assert.equal(input.endpoint, '/api');
  assert.equal(second.endpoint, '/api');
});

test('rejects values that are not settings objects', () => {
  for (const input of [null, undefined, [], ['/api'], 'text', 0, true, () => {}]) {
    assert.throws(() => parseSettings(input), { name: 'TypeError', message: /settings/i });
  }
});

test('requires a nonempty string endpoint', () => {
  for (const input of [{}, ...[null, undefined, '', 42, false, [], {}].map(endpoint => ({ endpoint }))]) {
    assert.throws(() => parseSettings(input), { name: 'TypeError', message: /endpoint/ });
  }
});

test('rejects invalid retries including explicit null and undefined', () => {
  for (const retries of [null, undefined, -1, 6, 1.5, NaN, Infinity, -Infinity, '3', true, {}, []]) {
    assert.throws(() => parseSettings({ endpoint: '/api', retries }), {
      name: 'TypeError', message: /retries/,
    });
  }
});

test('rejects nonboolean enabled including explicit null and undefined', () => {
  for (const enabled of [null, undefined, 0, 1, 'true', 'false', {}, []]) {
    assert.throws(() => parseSettings({ endpoint: '/api', enabled }), {
      name: 'TypeError', message: /enabled/,
    });
  }
});

test('uses own fields, including on objects without a prototype', () => {
  const input = Object.assign(Object.create(null), { endpoint: '/api' });
  assert.deepEqual(parseSettings(input), { endpoint: '/api', retries: 3, enabled: true });
  const inherited = Object.create({ retries: 5, enabled: false });
  inherited.endpoint = '/api';
  assert.deepEqual(parseSettings(inherited), { endpoint: '/api', retries: 3, enabled: true });
  assert.throws(() => parseSettings(Object.create({ endpoint: '/api' })), {
    name: 'TypeError', message: /endpoint/,
  });
});

test('loadSettings reads once and validates parsed JSON', async () => {
  let calls = 0;
  assert.deepEqual(await loadSettings(async () => {
    calls++;
    return '{"endpoint":" /api ","retries":0,"enabled":false,"extra":1}';
  }), { endpoint: ' /api ', retries: 0, enabled: false });
  assert.equal(calls, 1);
  assert.deepEqual(await loadSettings(async () => '{"endpoint":"/api"}'), {
    endpoint: '/api', retries: 3, enabled: true,
  });
});

test('loadSettings applies field and object validation', async () => {
  for (const [text, field] of [
    ['null', 'settings'], ['[]', 'settings'], ['{}', 'endpoint'],
    ['{"endpoint":""}', 'endpoint'],
    ['{"endpoint":"/api","retries":null}', 'retries'],
    ['{"endpoint":"/api","enabled":null}', 'enabled'],
  ]) {
    await assert.rejects(loadSettings(async () => text), {
      name: 'TypeError', message: new RegExp(field),
    });
  }
});

test('loadSettings preserves read errors and does not retry', async () => {
  const error = new Error('read failed');
  let calls = 0;
  await assert.rejects(loadSettings(async () => {
    calls++;
    throw error;
  }), actual => actual === error);
  assert.equal(calls, 1);
  await assert.rejects(loadSettings(() => { throw error; }), actual => actual === error);
});

test('loadSettings exposes JSON syntax errors', async () => {
  await assert.rejects(loadSettings(async () => '{broken'), SyntaxError);
});

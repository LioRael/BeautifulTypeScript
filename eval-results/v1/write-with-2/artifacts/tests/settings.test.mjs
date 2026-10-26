import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, loadSettings } from '../dist/settings.js';
test('defaults', () => assert.deepEqual(parseSettings({ endpoint: '/api' }), { endpoint: '/api', retries: 3, enabled: true }));

test('preserves endpoint text, zero retries and false enabled', () => {
  assert.deepEqual(parseSettings({ endpoint: '  /api  ', retries: 0, enabled: false }), {
    endpoint: '  /api  ', retries: 0, enabled: false,
  });
  assert.equal(parseSettings({ endpoint: ' ' }).endpoint, ' ');
  for (let retries = 0; retries <= 5; retries += 1) {
    assert.equal(parseSettings({ endpoint: '/api', retries }).retries, retries);
  }
});

test('returns fresh objects with only settings fields and leaves input unchanged', () => {
  const input = Object.freeze({ endpoint: '/api', extra: 'ignore' });
  const first = parseSettings(input);
  const second = parseSettings(input);
  assert.notEqual(first, input);
  assert.notEqual(first, second);
  assert.deepEqual(first, { endpoint: '/api', retries: 3, enabled: true });
  first.endpoint = '/changed';
  assert.equal(input.endpoint, '/api');
  assert.equal(second.endpoint, '/api');
});

test('rejects invalid outer containers', () => {
  for (const input of [null, undefined, [], ['/api'], 'text', 1, true, () => {}]) {
    assert.throws(() => parseSettings(input), { name: 'TypeError', message: /settings/ });
  }
});

test('rejects missing or invalid endpoint without coercion', () => {
  assert.throws(() => parseSettings({}), { name: 'TypeError', message: /endpoint/ });
  for (const endpoint of ['', null, undefined, 0, false, [], {}, new String('/api')]) {
    assert.throws(() => parseSettings({ endpoint }), { name: 'TypeError', message: /endpoint/ });
  }
});

test('rejects invalid retries without coercion or defaulting present values', () => {
  for (const retries of [null, undefined, -1, 6, 1.5, NaN, Infinity, -Infinity, '3', false, [], {}]) {
    assert.throws(() => parseSettings({ endpoint: '/api', retries }), {
      name: 'TypeError', message: /retries/,
    });
  }
});

test('rejects invalid enabled without coercion or defaulting present values', () => {
  for (const enabled of [null, undefined, 0, 1, '', 'false', [], {}]) {
    assert.throws(() => parseSettings({ endpoint: '/api', enabled }), {
      name: 'TypeError', message: /enabled/,
    });
  }
});

test('uses own JSON fields and handles objects without a prototype', () => {
  const input = Object.assign(Object.create(null), { endpoint: '/api' });
  assert.deepEqual(parseSettings(input), { endpoint: '/api', retries: 3, enabled: true });
  assert.throws(() => parseSettings(Object.create({ endpoint: '/inherited' })), {
    name: 'TypeError', message: /endpoint/,
  });
  assert.deepEqual(parseSettings(Object.assign(Object.create({ retries: 9, enabled: null }), {
    endpoint: '/api',
  })), { endpoint: '/api', retries: 3, enabled: true });
});

test('loadSettings reads once and validates parsed JSON', async () => {
  let calls = 0;
  const result = await loadSettings(async () => {
    calls += 1;
    return '{"endpoint":" /api ","retries":0,"enabled":false,"extra":1}';
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { endpoint: ' /api ', retries: 0, enabled: false });
  assert.deepEqual(await loadSettings(async () => '{"endpoint":"/api"}'), {
    endpoint: '/api', retries: 3, enabled: true,
  });
  for (const [json, field] of [
    ['[]', 'settings'], ['null', 'settings'], ['{}', 'endpoint'],
    ['{"endpoint":"/api","retries":null}', 'retries'],
    ['{"endpoint":"/api","enabled":null}', 'enabled'],
  ]) {
    await assert.rejects(loadSettings(async () => json), {
      name: 'TypeError', message: new RegExp(field),
    });
  }
});

test('loadSettings preserves read rejection identity and does not retry', async () => {
  for (const failure of [new Error('read failed'), 'read failed', null]) {
    let calls = 0;
    await assert.rejects(loadSettings(async () => {
      calls += 1;
      throw failure;
    }), (error) => error === failure);
    assert.equal(calls, 1);
  }
});

test('loadSettings turns synchronous reader throws into unchanged rejections', async () => {
  const failure = new Error('synchronous read failure');
  await assert.rejects(loadSettings(() => { throw failure; }), (error) => error === failure);
});

test('loadSettings preserves native JSON syntax errors', async () => {
  const text = '{ invalid JSON';
  let expected;
  try { JSON.parse(text); } catch (error) { expected = error; }
  await assert.rejects(loadSettings(async () => text), (error) => {
    assert.ok(error instanceof SyntaxError);
    assert.equal(error.message, expected.message);
    return true;
  });
});

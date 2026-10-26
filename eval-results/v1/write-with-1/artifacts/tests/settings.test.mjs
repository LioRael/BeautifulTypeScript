import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, loadSettings } from '../dist/settings.js';

function rejectsField(input, field) {
  assert.throws(() => parseSettings(input), error =>
    error instanceof TypeError && error.message.includes(field));
}

test('defaults only absent optional fields', () => {
  assert.deepEqual(parseSettings({ endpoint: '/api' }), {
    endpoint: '/api', retries: 3, enabled: true,
  });
  rejectsField({ endpoint: '/api', retries: undefined }, 'retries');
  rejectsField({ endpoint: '/api', enabled: undefined }, 'enabled');
});

test('preserves endpoint, zero and false; accepts both retry limits', () => {
  for (const retries of [0, 1, 2, 3, 4, 5]) {
    assert.deepEqual(parseSettings({ endpoint: ' /api\n', retries, enabled: false }), {
      endpoint: ' /api\n', retries, enabled: false,
    });
  }
  assert.equal(parseSettings({ endpoint: ' ' }).endpoint, ' ');
});

test('returns fresh objects, strips extra fields and leaves input untouched', () => {
  const input = Object.freeze({ endpoint: '/api', extra: 'ignored' });
  const first = parseSettings(input);
  const second = parseSettings(input);
  assert.notStrictEqual(first, input);
  assert.notStrictEqual(first, second);
  assert.deepEqual(first, { endpoint: '/api', retries: 3, enabled: true });
  first.endpoint = '/changed';
  assert.equal(input.endpoint, '/api');
  assert.equal(second.endpoint, '/api');
});

test('rejects non-object containers', () => {
  for (const input of [null, undefined, [], ['/api'], 'text', 0, true, () => {}]) {
    rejectsField(input, 'settings');
  }
});

test('requires a nonempty string endpoint', () => {
  rejectsField({}, 'endpoint');
  for (const endpoint of ['', null, undefined, 0, false, [], {}, new String('/api')]) {
    rejectsField({ endpoint }, 'endpoint');
  }
});

test('rejects invalid retries without coercion', () => {
  for (const retries of [null, -1, 6, 1.5, NaN, Infinity, -Infinity, '3', true, {}, []]) {
    rejectsField({ endpoint: '/api', retries }, 'retries');
  }
});

test('requires a boolean enabled value', () => {
  for (const enabled of [null, 0, 1, '', 'false', {}, []]) {
    rejectsField({ endpoint: '/api', enabled }, 'enabled');
  }
  assert.equal(parseSettings({ endpoint: '/api', enabled: true }).enabled, true);
});

test('uses own JSON fields, including objects without a prototype', () => {
  rejectsField(Object.create({ endpoint: '/inherited' }), 'endpoint');
  const input = Object.assign(Object.create(null), { endpoint: '/api' });
  assert.equal(parseSettings(input).retries, 3);
});

test('loads JSON, reads once and uses the same defaults and validation', async () => {
  let calls = 0;
  assert.deepEqual(await loadSettings(async () => {
    calls += 1;
    return '{"endpoint":"/api"}';
  }), { endpoint: '/api', retries: 3, enabled: true });
  assert.equal(calls, 1);
  assert.deepEqual(await loadSettings(async () =>
    '{"endpoint":" /api ","retries":0,"enabled":false,"extra":1}'), {
    endpoint: ' /api ', retries: 0, enabled: false,
  });
  for (const [json, field] of [
    ['null', 'settings'], ['[]', 'settings'], ['{}', 'endpoint'],
    ['{"endpoint":"/api","retries":null}', 'retries'],
    ['{"endpoint":"/api","enabled":null}', 'enabled'],
  ]) {
    await assert.rejects(loadSettings(async () => json), error =>
      error instanceof TypeError && error.message.includes(field));
  }
});

test('preserves read rejection identity and does not retry', async () => {
  for (const reason of [new Error('read failed'), 'read failed', null]) {
    let calls = 0;
    await assert.rejects(loadSettings(async () => {
      calls += 1;
      throw reason;
    }), error => error === reason);
    assert.equal(calls, 1);
  }
});

test('preserves synchronous reader failures as promise rejections', async () => {
  const failure = new Error('synchronous failure');
  await assert.rejects(loadSettings(() => { throw failure; }), error => error === failure);
});

test('preserves JSON parser errors', async () => {
  const originalParse = JSON.parse;
  const failure = new SyntaxError('parser sentinel');
  JSON.parse = () => { throw failure; };
  try {
    await assert.rejects(loadSettings(async () => '{'), error => error === failure);
  } finally {
    JSON.parse = originalParse;
  }
  await assert.rejects(loadSettings(async () => '{'), SyntaxError);
});

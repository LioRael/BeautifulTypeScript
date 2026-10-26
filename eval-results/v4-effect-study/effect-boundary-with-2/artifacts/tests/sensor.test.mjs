import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBatch, temperatureRange } from '../dist/sensor.js';
test('normalizes a gateway batch and computes its range', () => {
 const result=decodeBatch({sensorId:' rack-4 ',unit:'F',readings:[{atMs:0,value:32},{atMs:10,value:50}]});
 assert.equal(result.ok,true);
 assert.deepEqual(result.batch,{sensorId:'rack-4',readings:[{atMs:0,celsius:0},{atMs:10,celsius:10}]});
 assert.deepEqual(temperatureRange(result.batch),{minimum:0,maximum:10});
});

const validBatch = () => ({
  sensorId: ' sensor ',
  unit: 'C',
  readings: [{ atMs: 0, value: 0 }],
});
const invalid = { ok: false, error: 'invalid-batch' };

test('rejects malformed containers and batch fields without throwing', () => {
  const cases = [null, [], true, 42, 'batch', {},
    ...[null, 12, '', ' \t ', 'x'.repeat(33)].map(sensorId => ({ ...validBatch(), sensorId })),
    ...[null, 'c', ' F ', 0].map(unit => ({ ...validBatch(), unit })),
    ...[null, {}, 'readings', [], Array.from({ length: 101 }, (_, atMs) => ({ atMs, value: 0 }))]
      .map(readings => ({ ...validBatch(), readings })),
  ];
  for (const input of cases) assert.deepEqual(decodeBatch(input), invalid);
});

test('rejects malformed readings, numeric coercion, and invalid ordering', () => {
  const malformed = [null, [], false, 0, 'reading', {},
    ...[null, '0', -1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]
      .map(atMs => ({ atMs, value: 0 })),
    ...[null, '0', NaN, Infinity, -Infinity, -80.001, 80.001]
      .map(value => ({ atMs: 1, value })),
  ];
  for (const reading of malformed) {
    assert.deepEqual(decodeBatch({ ...validBatch(), readings: [reading] }), invalid);
  }
  for (const atMs of [0, 1]) {
    assert.deepEqual(decodeBatch({ ...validBatch(), readings: [
      { atMs: 1, value: 0 }, { atMs, value: 10 },
    ] }), invalid);
  }
  assert.deepEqual(decodeBatch({ ...validBatch(), readings: [
    { atMs: 0, value: 0 }, { atMs: 1, value: 'bad' },
  ] }), invalid);
  for (const value of [-112.001, 176.001]) {
    assert.deepEqual(decodeBatch({ ...validBatch(), unit: 'F', readings: [{ atMs: 0, value }] }), invalid);
  }
});

test('accepts inclusive bounds and preserves unrounded conversion', () => {
  for (const [unit, values] of [['C', [-80, 80]], ['F', [-112, 176, 33]]]) {
    const result = decodeBatch({ sensorId: ` ${'x'.repeat(32)} `, unit,
      readings: values.map((value, i) => ({ atMs: i === values.length - 1 ? Number.MAX_SAFE_INTEGER : i, value })),
    });
    assert.deepEqual(result, { ok: true, batch: {
      sensorId: 'x'.repeat(32),
      readings: values.map((value, i) => ({
        atMs: i === values.length - 1 ? Number.MAX_SAFE_INTEGER : i,
        celsius: unit === 'C' ? value : (value - 32) * 5 / 9,
      })),
    } });
  }
  const input = { ...validBatch(), readings: Array.from({ length: 100 }, (_, atMs) => ({ atMs, value: 0 })) };
  assert.equal(decodeBatch(input).ok, true);
});

test('ignores extra properties, preserves input, and owns normalized output', () => {
  const input = { ...validBatch(), extra: { ignored: true },
    readings: [{ atMs: 0, value: 12, celsius: 999, extra: true }],
  };
  const before = structuredClone(input);
  const result = decodeBatch(input);
  const expected = { ok: true, batch: { sensorId: 'sensor', readings: [{ atMs: 0, celsius: 12 }] } };
  assert.deepEqual(result, expected);
  assert.deepEqual(input, before);
  assert.notEqual(result.batch, input);
  assert.notEqual(result.batch.readings, input.readings);
  assert.notEqual(result.batch.readings[0], input.readings[0]);
  input.sensorId = 'changed';
  input.readings[0].atMs = 100;
  input.readings[0].value = 80;
  input.readings.push({ atMs: 101, value: 0 });
  assert.deepEqual(result, expected);
  assert.deepEqual(temperatureRange(result.batch), { minimum: 12, maximum: 12 });
});

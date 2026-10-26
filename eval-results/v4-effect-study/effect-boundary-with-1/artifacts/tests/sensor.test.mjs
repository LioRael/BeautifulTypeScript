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
  sensorId: 'rack-4',
  unit: 'C',
  readings: [{ atMs: 0, value: 0 }],
});
const invalidBatch = { ok: false, error: 'invalid-batch' };

test('rejects malformed containers and batch fields without throwing', () => {
  const cases = [null, undefined, false, 1, 'batch', [], {},
    ...[null, 7, '', '  ', 'x'.repeat(33)].map(sensorId => ({ ...validBatch(), sensorId })),
    ...[undefined, null, 'c', 'f', 0].map(unit => ({ ...validBatch(), unit })),
    ...[undefined, null, {}, 'readings', [], Array.from({ length: 101 }, (_, atMs) => ({ atMs, value: 0 }))]
      .map(readings => ({ ...validBatch(), readings })),
  ];
  for (const input of cases) assert.deepEqual(decodeBatch(input), invalidBatch);
});

test('rejects malformed readings and invalid numbers for the whole batch', () => {
  const badReadings = [null, [], 1, 'reading', {}, { atMs: 0 }, { value: 0 },
    ...[undefined, null, '1', -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]
      .map(atMs => ({ atMs, value: 0 })),
    ...[undefined, null, '0', NaN, Infinity, -Infinity, -80.01, 80.01]
      .map(value => ({ atMs: 1, value })),
  ];
  for (const reading of badReadings) {
    assert.deepEqual(decodeBatch({ ...validBatch(), readings: [{ atMs: 0, value: 0 }, reading] }), invalidBatch);
  }
  for (const atMs of [0, 1]) {
    assert.deepEqual(decodeBatch({ ...validBatch(), readings: [{ atMs: 1, value: 0 }, { atMs, value: 0 }] }), invalidBatch);
  }
  for (const value of [-112.01, 176.01]) {
    assert.deepEqual(decodeBatch({ ...validBatch(), unit: 'F', readings: [{ atMs: 0, value }] }), invalidBatch);
  }
});

test('accepts inclusive limits and converts Fahrenheit without rounding', () => {
  for (const [unit, values] of [['C', [-80, 80]], ['F', [-112, 176, 33]]]) {
    const result = decodeBatch({ sensorId: ` ${'x'.repeat(32)} `, unit,
      readings: values.map((value, i) => ({ atMs: i === values.length - 1 ? Number.MAX_SAFE_INTEGER : i, value })),
    });
    assert.equal(result.ok, true);
    assert.equal(result.batch.sensorId, 'x'.repeat(32));
    assert.deepEqual(result.batch.readings.map(r => r.celsius),
      values.map(value => unit === 'C' ? value : (value - 32) * 5 / 9));
  }
  const result = decodeBatch({ ...validBatch(), readings: Array.from({ length: 100 }, (_, atMs) => ({ atMs, value: 0 })) });
  assert.equal(result.ok, true);
  assert.equal(result.batch.readings.length, 100);
});

test('ignores unknown properties, preserves input, and owns the normalized output', () => {
  const input = { ...validBatch(), sensorId: ' rack-4 ', extra: { ignored: true },
    readings: [{ atMs: 0, value: 12, celsius: 999, extra: true }],
  };
  const before = structuredClone(input);
  const result = decodeBatch(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result, { ok: true, batch: { sensorId: 'rack-4', readings: [{ atMs: 0, celsius: 12 }] } });
  assert.notEqual(result.batch, input);
  assert.notEqual(result.batch.readings, input.readings);
  assert.notEqual(result.batch.readings[0], input.readings[0]);
  input.sensorId = 'changed';
  input.readings[0].atMs = 100;
  input.readings[0].value = 80;
  input.readings.push({ atMs: 101, value: 0 });
  assert.deepEqual(result.batch, { sensorId: 'rack-4', readings: [{ atMs: 0, celsius: 12 }] });

  const frozen = Object.freeze({ sensorId: 'frozen', unit: 'C',
    readings: Object.freeze([Object.freeze({ atMs: 0, value: 2 })]),
  });
  assert.equal(decodeBatch(frozen).ok, true);
});

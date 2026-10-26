import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBatch, temperatureRange } from '../dist/sensor.js';
test('normalizes a gateway batch and computes its range', () => {
 const result=decodeBatch({sensorId:' rack-4 ',unit:'F',readings:[{atMs:0,value:32},{atMs:10,value:50}]});
 assert.equal(result.ok,true);
 assert.deepEqual(result.batch,{sensorId:'rack-4',readings:[{atMs:0,celsius:0},{atMs:10,celsius:10}]});
 assert.deepEqual(temperatureRange(result.batch),{minimum:0,maximum:10});
});

const validBatch = () => ({sensorId:'rack',unit:'C',readings:[{atMs:0,value:20}]});
const invalid = {ok:false,error:'invalid-batch'};

test('rejects malformed batch fields without throwing', () => {
 const bodies = [null, undefined, true, 1, 'batch', [], {},
  ...[null, 1, '', '   ', 'x'.repeat(33)].map(sensorId => ({...validBatch(),sensorId})),
  ...[null, 'c', '', 0].map(unit => ({...validBatch(),unit})),
  ...[null, {}, 'readings', [], Array.from({length:101}, (_,atMs) => ({atMs,value:0}))]
   .map(readings => ({...validBatch(),readings}))];
 for (const body of bodies) assert.deepEqual(decodeBatch(body),invalid);
});

test('rejects invalid readings and non-increasing timestamps as a whole batch', () => {
 const badReadings = [null, [], {}, 'reading',
  ...[undefined, null, '0', -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER+1]
   .map(atMs => ({atMs,value:0})),
  ...[undefined, null, '20', NaN, Infinity, -Infinity, -80.01, 80.01]
   .map(value => ({atMs:1,value}))];
 for (const reading of badReadings) {
  assert.deepEqual(decodeBatch({...validBatch(),readings:[{atMs:0,value:0},reading]}),invalid);
 }
 for (const atMs of [0, 1]) {
  assert.deepEqual(decodeBatch({...validBatch(),readings:[{atMs:1,value:0},{atMs,value:0}]}),invalid);
 }
 for (const value of [-112.01,176.01]) {
  assert.deepEqual(decodeBatch({...validBatch(),unit:'F',readings:[{atMs:0,value}]}),invalid);
 }
});

test('accepts inclusive limits and converts Fahrenheit without rounding', () => {
 for (const [unit,values] of [['C',[-80,80]],['F',[-112,176]]]) {
  const result = decodeBatch({sensorId:` ${'x'.repeat(32)} `,unit,
   readings:values.map((value,i) => ({atMs:i === 0 ? 0 : Number.MAX_SAFE_INTEGER,value}))});
  assert.equal(result.ok,true);
  assert.equal(result.batch.sensorId,'x'.repeat(32));
  assert.deepEqual(result.batch.readings.map(r => r.celsius),[-80,80]);
 }
 const result = decodeBatch({...validBatch(),unit:'F',readings:[{atMs:0,value:33}]});
 assert.equal(result.ok,true);
 assert.equal(result.batch.readings[0].celsius,5/9);
 const full = decodeBatch({...validBatch(),readings:Array.from({length:100},(_,atMs) => ({atMs,value:0}))});
 assert.equal(full.ok,true);
 assert.equal(full.batch.readings.length,100);
});

test('ignores extra properties and owns all normalized objects', () => {
 const input = {...validBatch(),extra:{ignored:true}};
 input.readings[0].extra = 'ignored';
 const snapshot = structuredClone(input);
 const result = decodeBatch(input);
 assert.equal(result.ok,true);
 assert.deepEqual(input,snapshot);
 assert.deepEqual(result.batch,{sensorId:'rack',readings:[{atMs:0,celsius:20}]});
 assert.notEqual(result.batch,input);
 assert.notEqual(result.batch.readings,input.readings);
 assert.notEqual(result.batch.readings[0],input.readings[0]);
 input.sensorId = 'changed';
 input.readings[0].atMs = 100;
 input.readings[0].value = 40;
 input.readings.push({atMs:200,value:50});
 assert.deepEqual(result.batch,{sensorId:'rack',readings:[{atMs:0,celsius:20}]});
});

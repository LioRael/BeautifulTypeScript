import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBatch, temperatureRange } from '../dist/sensor.js';
test('normalizes a gateway batch and computes its range', () => {
 const result=decodeBatch({sensorId:' rack-4 ',unit:'F',readings:[{atMs:0,value:32},{atMs:10,value:50}]});
 assert.equal(result.ok,true);
 assert.deepEqual(result.batch,{sensorId:'rack-4',readings:[{atMs:0,celsius:0},{atMs:10,celsius:10}]});
 assert.deepEqual(temperatureRange(result.batch),{minimum:0,maximum:10});
});

const validBatch = () => ({sensorId:'sensor',unit:'C',readings:[{atMs:0,value:0}]});
const invalid = {ok:false,error:'invalid-batch'};

test('rejects malformed bodies and batch fields without throwing', () => {
 const cases = [null, [], true, 1, 'batch', {},
  ...[null, 7, '', '   ', 'x'.repeat(33)].map(sensorId => ({...validBatch(),sensorId})),
  ...[null, 'c', 'K', 0].map(unit => ({...validBatch(),unit})),
  ...[null, {}, 'readings', [], Array.from({length:101}, (_,atMs) => ({atMs,value:0}))]
   .map(readings => ({...validBatch(),readings}))];
 for (const body of cases) assert.deepEqual(decodeBatch(body),invalid);
});

test('rejects malformed readings, numeric coercion, and unordered timestamps', () => {
 const cases = [null, [], 1, {},
  ...[null, '0', -1, 0.5, Number.MAX_SAFE_INTEGER+1, NaN, Infinity]
   .map(atMs => ({atMs,value:0})),
  ...[null, '0', NaN, Infinity, -Infinity, -80.01, 80.01]
   .map(value => ({atMs:0,value}))];
 for (const reading of cases) {
  assert.deepEqual(decodeBatch({...validBatch(),readings:[reading]}),invalid);
 }
 for (const atMs of [0, 1]) {
  assert.deepEqual(decodeBatch({...validBatch(),readings:[{atMs:1,value:0},{atMs,value:0}]}),invalid);
 }
 for (const value of [-112.01,176.01]) {
  assert.deepEqual(decodeBatch({...validBatch(),unit:'F',readings:[{atMs:0,value}]}),invalid);
 }
});

test('accepts inclusive limits and preserves unrounded conversion', () => {
 for (const [unit, values] of [['C',[-80,80]],['F',[-112,176]]]) {
  const result = decodeBatch({sensorId:` ${'x'.repeat(32)} `,unit,
   readings:values.map((value,atMs) => ({atMs:atMs * Number.MAX_SAFE_INTEGER,value}))});
  assert.equal(result.ok,true);
  assert.deepEqual(result.batch.readings.map(r => r.celsius),[-80,80]);
 }
 const result = decodeBatch({...validBatch(),unit:'F',readings:[{atMs:0,value:33}]});
 assert.equal(result.batch.readings[0].celsius,5/9);
 const hundred = Array.from({length:100},(_,atMs) => ({atMs,value:0}));
 assert.equal(decodeBatch({...validBatch(),readings:hundred}).ok,true);
});

test('ignores unknown properties and returns independent objects without mutating input', () => {
 const reading = Object.freeze({atMs:0,value:12,extra:'ignored'});
 const input = Object.freeze({...validBatch(),extra:42,readings:Object.freeze([reading])});
 const result = decodeBatch(input);
 assert.deepEqual(result,{ok:true,batch:{sensorId:'sensor',readings:[{atMs:0,celsius:12}]}});
 assert.notEqual(result.batch,input);
 assert.notEqual(result.batch.readings,input.readings);
 assert.notEqual(result.batch.readings[0],reading);

 const mutable = validBatch();
 const decoded = decodeBatch(mutable);
 mutable.sensorId = 'changed';
 mutable.readings[0].atMs = 99;
 mutable.readings[0].value = 80;
 mutable.readings.push({atMs:100,value:1});
 assert.deepEqual(decoded,{ok:true,batch:{sensorId:'sensor',readings:[{atMs:0,celsius:0}]}});
});

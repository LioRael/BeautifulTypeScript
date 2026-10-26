import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBatch, temperatureRange } from '../dist/sensor.js';
test('normalizes a gateway batch and computes its range', () => {
 const result=decodeBatch({sensorId:' rack-4 ',unit:'F',readings:[{atMs:0,value:32},{atMs:10,value:50}]});
 assert.equal(result.ok,true);
 assert.deepEqual(result.batch,{sensorId:'rack-4',readings:[{atMs:0,celsius:0},{atMs:10,celsius:10}]});
 assert.deepEqual(temperatureRange(result.batch),{minimum:0,maximum:10});
});

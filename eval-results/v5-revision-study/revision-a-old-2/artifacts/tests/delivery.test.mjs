import test from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryQuotes } from '../dist/quotes.js';
import { Checkout } from '../dist/checkout.js';
const parcel = { weightGrams: 200, destination: 'AB1' };
test('filters invalid rates and recommends cheapest eligible delivery', async () => {
  const quotes = new DeliveryQuotes([{ id: 'post', async quote() { return [
    {service:'slow',amountCents:100,days:5},
    {service:'fast',amountCents:300,days:1},
    {service:'bad',amountCents:-1,days:1},
  ]; }}]);
  const result = await new Checkout(quotes).delivery({parcel, maximumDays:2});
  assert.deepEqual(result.options.map(x => x.service), ['fast']);
  assert.equal(result.message, 'post fast: 1 day');
});
test('invalid parcel never calls adapters', async () => {
  let calls = 0;
  const q = new DeliveryQuotes([{id:'x', async quote(){ calls++; return []; }}]);
  await assert.rejects(q.collect({...parcel, weightGrams:0}), RangeError);
  assert.equal(calls, 0);
});

test('starts every carrier once, waits for all settlements and orders failures by configuration', async () => {
  const calls = [];
  let finishFirst;
  let finishSuccess;
  const first = new Promise((_, reject) => { finishFirst = reject; });
  const success = new Promise(resolve => { finishSuccess = resolve; });
  const quotes = new DeliveryQuotes([
    { id: 'first', quote() { calls.push('first'); return first; } },
    { id: 'sync', quote() { calls.push('sync'); throw new Error('sync failure'); } },
    { id: 'success', quote() { calls.push('success'); return success; } },
    { id: 'last', quote() { calls.push('last'); return Promise.reject('async failure'); } },
    { id: 'empty', async quote() { calls.push('empty'); return []; } },
    { id: 'ineligible', async quote() {
      calls.push('ineligible');
      return [{ service: 'invalid', amountCents: -1, days: 1 }];
    } },
  ]);
  let settled = false;
  const pending = quotes.collect(parcel).then(result => { settled = true; return result; });
  assert.deepEqual(calls, ['first', 'sync', 'success', 'last', 'empty', 'ineligible']);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  finishFirst(new Error('late failure'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  finishSuccess([{ service: 'standard', amountCents: 100, days: 2 }]);
  const result = await pending;
  assert.deepEqual(result.failedCarrierIds, ['first', 'sync', 'last']);
  assert.deepEqual(result.options, [
    { carrierId: 'success', service: 'standard', amountCents: 100, days: 2 },
  ]);
});

test('checkout forwards failures even when maximum days removes every successful option', async () => {
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'broken', quote() { throw new Error('unavailable'); } },
    { id: 'slow', async quote() { return [{ service: 'ground', amountCents: 100, days: 5 }]; } },
  ]));
  assert.deepEqual(await checkout.delivery({ parcel, maximumDays: 2 }), {
    options: [], failedCarrierIds: ['broken'], recommended: null, message: 'No delivery options',
  });
  const result = await checkout.delivery({ parcel });
  assert.deepEqual(result.failedCarrierIds, ['broken']);
  assert.equal(result.recommended, result.options[0]);
  assert.equal(result.message, 'slow ground: 5 days');
});

test('each carrier receives an isolated parcel and each result owns its arrays and options', async () => {
  const input = { ...parcel };
  const ownedRates = [{ service: 'standard', amountCents: 100, days: 2 }];
  const received = [];
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'mutator', async quote(copy) {
      received.push(copy);
      copy.destination = 'changed';
      copy.weightGrams = 999;
      return ownedRates;
    } },
    { id: 'observer', async quote(copy) {
      received.push(copy);
      assert.deepEqual(copy, parcel);
      return ownedRates;
    } },
    { id: 'broken', async quote() { throw new Error('unavailable'); } },
  ]));
  const first = await checkout.delivery({ parcel: input });
  assert.deepEqual(input, parcel);
  assert.notEqual(received[0], input);
  assert.notEqual(received[0], received[1]);
  assert.notEqual(first.options[0], first.options[1]);
  first.recommended.service = 'edited';
  first.options.push({ carrierId: 'extra', service: 'extra', amountCents: 0, days: 1 });
  first.failedCarrierIds.push('extra');
  assert.deepEqual(ownedRates, [{ service: 'standard', amountCents: 100, days: 2 }]);
  const second = await checkout.delivery({ parcel: input });
  assert.deepEqual(second.options.map(option => option.service), ['standard', 'standard']);
  assert.deepEqual(second.failedCarrierIds, ['broken']);
  assert.notEqual(first.options, second.options);
  assert.notEqual(first.options[0], second.options[0]);
  assert.notEqual(first.failedCarrierIds, second.failedCarrierIds);
});

test('invalid parcel and maximum days reject with existing messages before invoking carriers', async () => {
  let calls = 0;
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'unused', async quote() { calls++; return []; } },
  ]));
  for (const maximumDays of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkout.delivery({ parcel, maximumDays }), {
      name: 'RangeError', message: 'Maximum days must be a positive integer',
    });
  }
  for (const weightGrams of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkout.delivery({ parcel: { ...parcel, weightGrams } }), {
      name: 'RangeError', message: 'Weight must be a positive integer',
    });
  }
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, destination: '  ' } }), {
    name: 'RangeError', message: 'Destination is required',
  });
  assert.equal(calls, 0);
});

test('successful options keep policy ordering and empty collections have fresh failure arrays', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'z', async quote() { return [
      { service: 'b', amountCents: 100, days: 2 },
      { service: 'a', amountCents: 100, days: 2 },
      { service: 'fast', amountCents: 100, days: 1 },
      { service: 'cheap', amountCents: 0, days: 5 },
    ]; } },
    { id: 'a', async quote() { return [{ service: 'standard', amountCents: 100, days: 2 }]; } },
  ]);
  const result = await quotes.collect(parcel);
  assert.deepEqual(result.options.map(option => `${option.carrierId}/${option.service}`),
    ['z/cheap', 'z/fast', 'a/standard', 'z/a', 'z/b']);
  assert.deepEqual(result.failedCarrierIds, []);
  const empty = new DeliveryQuotes([]);
  const first = await empty.collect(parcel);
  first.failedCarrierIds.push('edited');
  first.options.push(result.options[0]);
  assert.deepEqual(await empty.collect(parcel), { options: [], failedCarrierIds: [] });
});

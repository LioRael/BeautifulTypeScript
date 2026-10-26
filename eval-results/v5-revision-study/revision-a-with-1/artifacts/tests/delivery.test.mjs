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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

test('starts every carrier once, waits for all, and orders failures by configuration', async () => {
  const first = deferred();
  const successful = deferred();
  const calls = [];
  const quotes = new DeliveryQuotes([
    { id: 'first', quote() { calls.push('first'); return first.promise; } },
    { id: 'sync', quote() { calls.push('sync'); throw new Error('sync failure'); } },
    { id: 'success', quote() { calls.push('success'); return successful.promise; } },
    { id: 'rejected', quote() { calls.push('rejected'); return Promise.reject(new Error('rejected')); } },
  ]);
  let settled = false;
  const pending = quotes.collect(parcel).then(result => { settled = true; return result; });
  assert.deepEqual(calls, ['first', 'sync', 'success', 'rejected']);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  first.reject(new Error('last failure to complete'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  successful.resolve([{ service: 'standard', amountCents: 200, days: 2 }]);
  assert.deepEqual(await pending, {
    options: [{ carrierId: 'success', service: 'standard', amountCents: 200, days: 2 }],
    failedCarrierIds: ['first', 'sync', 'rejected'],
  });
  assert.equal(calls.length, 4);
});

test('empty and policy-rejected rates are successful, including no configured carriers', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'empty', async quote() { return []; } },
    { id: 'ineligible', async quote() { return [
      { service: '', amountCents: 0, days: 1 },
      { service: 'negative', amountCents: -1, days: 1 },
      { service: 'fractional', amountCents: 1.5, days: 1 },
      { service: 'invalid-days', amountCents: 100, days: 0 },
    ]; } },
  ]);
  assert.deepEqual(await quotes.collect(parcel), { options: [], failedCarrierIds: [] });
  assert.deepEqual(await new DeliveryQuotes([]).collect(parcel), { options: [], failedCarrierIds: [] });
});

test('checkout preserves ordering, recommendation and failure IDs through maximum-days filtering', async () => {
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'z', async quote() { return [
      { service: 'slow', amountCents: 10, days: 5 },
      { service: 'fast', amountCents: 100, days: 1 },
    ]; } },
    { id: 'broken', async quote() { throw new Error('unavailable'); } },
    { id: 'a', async quote() { return [
      { service: 'z', amountCents: 100, days: 2 },
      { service: 'b', amountCents: 100, days: 1 },
      { service: 'a', amountCents: 100, days: 1 },
    ]; } },
  ]));
  const result = await checkout.delivery({ parcel, maximumDays: 2 });
  assert.deepEqual(result.options.map(option => `${option.carrierId}/${option.service}`), ['a/a', 'a/b', 'z/fast', 'a/z']);
  assert.equal(result.recommended, result.options[0]);
  assert.equal(result.message, 'a a: 1 day');
  assert.deepEqual(result.failedCarrierIds, ['broken']);

  const filtered = await new Checkout(new DeliveryQuotes([
    { id: 'slow', async quote() { return [{ service: 'slow', amountCents: 10, days: 5 }]; } },
    { id: 'broken', quote() { throw new Error('unavailable'); } },
  ])).delivery({ parcel, maximumDays: 1 });
  assert.deepEqual(filtered, {
    options: [], failedCarrierIds: ['broken'], recommended: null, message: 'No delivery options',
  });
});

test('invalid parcel and maximum days reject before any carrier is invoked', async () => {
  let calls = 0;
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'x', async quote() { calls++; return []; } },
  ]));
  for (const weightGrams of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkout.delivery({ parcel: { ...parcel, weightGrams } }), {
      name: 'RangeError', message: 'Weight must be a positive integer',
    });
  }
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, destination: '  ' } }), {
    name: 'RangeError', message: 'Destination is required',
  });
  for (const maximumDays of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkout.delivery({ parcel, maximumDays }), {
      name: 'RangeError', message: 'Maximum days must be a positive integer',
    });
  }
  assert.equal(calls, 0);
});

test('parcel copies and result values are isolated from callers, adapters and later collections', async () => {
  const input = { ...parcel };
  const received = [];
  const rates = [{ service: 'standard', amountCents: 100, days: 2 }];
  const quotes = new DeliveryQuotes([
    { id: 'mutator', async quote(copy) {
      received.push(copy);
      copy.destination = 'changed';
      copy.weightGrams = 999;
      return rates;
    } },
    { id: 'observer', async quote(copy) {
      received.push(copy);
      assert.deepEqual(copy, parcel);
      return [];
    } },
    { id: 'broken', async quote() { throw new Error('unavailable'); } },
  ]);
  const checkout = new Checkout(quotes);
  const first = await checkout.delivery({ parcel: input });
  assert.deepEqual(input, parcel);
  assert.notEqual(received[0], received[1]);
  assert.notEqual(received[0], input);
  assert.notEqual(received[1], input);
  first.recommended.service = 'edited';
  first.options.push({ carrierId: 'fake', service: 'fake', amountCents: 0, days: 1 });
  first.failedCarrierIds.push('fake');
  assert.deepEqual(rates, [{ service: 'standard', amountCents: 100, days: 2 }]);
  const second = await checkout.delivery({ parcel: input });
  assert.deepEqual(second.options, [{ carrierId: 'mutator', service: 'standard', amountCents: 100, days: 2 }]);
  assert.deepEqual(second.failedCarrierIds, ['broken']);
  assert.notEqual(second.options, first.options);
  assert.notEqual(second.options[0], first.options[0]);
  assert.notEqual(second.failedCarrierIds, first.failedCarrierIds);
  const direct = await quotes.collect(input);
  direct.options[0].amountCents = 999;
  direct.options.length = 0;
  direct.failedCarrierIds.length = 0;
  assert.deepEqual(await quotes.collect(input), {
    options: [{ carrierId: 'mutator', service: 'standard', amountCents: 100, days: 2 }],
    failedCarrierIds: ['broken'],
  });
});

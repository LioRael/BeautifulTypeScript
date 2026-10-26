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
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('starts every carrier once and waits for all outcomes in configured order', async () => {
  const first = deferred();
  const last = deferred();
  const calls = [];
  const quotes = new DeliveryQuotes([
    { id: 'first', quote() { calls.push('first'); return first.promise; } },
    { id: 'sync', quote() { calls.push('sync'); throw new Error('sync failure'); } },
    { id: 'success', quote() { calls.push('success'); return Promise.resolve([
      { service: 'standard', amountCents: 200, days: 2 },
    ]); } },
    { id: 'last', quote() { calls.push('last'); return last.promise; } },
  ]);
  let finished = false;
  const pending = quotes.collect(parcel).then(result => { finished = true; return result; });
  assert.deepEqual(calls, ['first', 'sync', 'success', 'last']);
  last.reject(new Error('last failure'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  first.reject(new Error('first failure'));
  const result = await pending;
  assert.deepEqual(result.failedCarrierIds, ['first', 'sync', 'last']);
  assert.deepEqual(result.options, [
    { carrierId: 'success', service: 'standard', amountCents: 200, days: 2 },
  ]);
});

test('empty and policy-rejected rates are successful; options retain policy ordering', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'empty', async quote() { return []; } },
    { id: 'invalid', async quote() { return [{ service: 'bad', amountCents: -1, days: 1 }]; } },
    { id: 'z', async quote() { return [
      { service: 'slow', amountCents: 100, days: 3 },
      { service: 'fast', amountCents: 100, days: 1 },
    ]; } },
    { id: 'a', async quote() { return [
      { service: 'b', amountCents: 100, days: 1 },
      { service: 'a', amountCents: 100, days: 1 },
    ]; } },
  ]);
  const result = await quotes.collect(parcel);
  assert.deepEqual(result.failedCarrierIds, []);
  assert.deepEqual(result.options.map(x => `${x.carrierId}/${x.service}`), ['a/a', 'a/b', 'z/fast', 'z/slow']);
  assert.deepEqual(await new DeliveryQuotes([]).collect(parcel), { options: [], failedCarrierIds: [] });
});

test('checkout forwards failures with and without eligible options', async () => {
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'broken', async quote() { throw new Error('unavailable'); } },
    { id: 'post', async quote() { return [
      { service: 'slow', amountCents: 100, days: 5 },
      { service: 'fast', amountCents: 300, days: 2 },
    ]; } },
  ]));
  const eligible = await checkout.delivery({ parcel, maximumDays: 2 });
  assert.deepEqual(eligible.failedCarrierIds, ['broken']);
  assert.equal(eligible.recommended, eligible.options[0]);
  assert.equal(eligible.message, 'post fast: 2 days');
  const empty = await checkout.delivery({ parcel, maximumDays: 1 });
  assert.deepEqual(empty, { options: [], failedCarrierIds: ['broken'], recommended: null, message: 'No delivery options' });
});

test('invalid inputs reject before any adapter invocation', async () => {
  let calls = 0;
  const quotes = new DeliveryQuotes([{ id: 'x', async quote() { calls++; return []; } }]);
  const checkout = new Checkout(quotes);
  for (const maximumDays of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(checkout.delivery({ parcel, maximumDays }), { name: 'RangeError', message: 'Maximum days must be a positive integer' });
  }
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, destination: ' ' } }), { name: 'RangeError', message: 'Destination is required' });
  await assert.rejects(quotes.collect({ ...parcel, weightGrams: 0 }), { name: 'RangeError', message: 'Weight must be a positive integer' });
  assert.equal(calls, 0);
});

test('parcels and result values are isolated from callers, adapters and later collections', async () => {
  const input = { ...parcel };
  const rates = [{ service: 'standard', amountCents: 100, days: 2 }];
  const received = [];
  const quotes = new DeliveryQuotes([
    { id: 'mutator', async quote(copy) { received.push(copy); copy.destination = 'changed'; return []; } },
    { id: 'post', async quote(copy) { received.push(copy); assert.deepEqual(copy, parcel); return rates; } },
    { id: 'broken', quote() { throw new Error('failure'); } },
  ]);
  const first = await quotes.collect(input);
  assert.deepEqual(input, parcel);
  assert.notEqual(received[0], received[1]);
  assert.notEqual(received[0], input);
  first.options[0].service = 'mutated';
  first.options.push({ carrierId: 'fake', service: 'fake', amountCents: 0, days: 1 });
  first.failedCarrierIds.push('fake');
  assert.equal(rates[0].service, 'standard');
  const second = await quotes.collect(input);
  assert.deepEqual(second.options, [{ carrierId: 'post', ...rates[0] }]);
  assert.deepEqual(second.failedCarrierIds, ['broken']);
  rates[0].service = 'adapter change';
  assert.equal(second.options[0].service, 'standard');
  const checkout = new Checkout(quotes);
  const delivery = await checkout.delivery({ parcel });
  delivery.options[0].service = 'checkout mutation';
  delivery.failedCarrierIds.length = 0;
  const later = await checkout.delivery({ parcel });
  assert.equal(later.options[0].service, 'adapter change');
  assert.deepEqual(later.failedCarrierIds, ['broken']);
});

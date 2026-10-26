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
  assert.deepEqual(result.failedCarrierIds, []);
});
test('invalid parcel never calls adapters', async () => {
  let calls = 0;
  const q = new DeliveryQuotes([{id:'x', async quote(){ calls++; return []; }}]);
  await assert.rejects(q.collect({...parcel, weightGrams:0}), RangeError);
  assert.equal(calls, 0);
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('starts every carrier once and waits for all, reporting failures in configuration order', async () => {
  const first = deferred();
  const last = deferred();
  const calls = [];
  const quotes = new DeliveryQuotes([
    { id: 'first', quote() { calls.push('first'); return first.promise; } },
    { id: 'sync', quote() { calls.push('sync'); throw new Error('sync'); } },
    { id: 'success', quote() { calls.push('success'); return Promise.resolve([
      { service: 'standard', amountCents: 100, days: 2 },
    ]); } },
    { id: 'last', quote() { calls.push('last'); return last.promise; } },
  ]);
  let finished = false;
  const pending = quotes.collect(parcel).then(result => { finished = true; return result; });
  assert.deepEqual(calls, ['first', 'sync', 'success', 'last']);
  last.reject(new Error('last'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  first.reject(new Error('first'));
  const result = await pending;
  assert.deepEqual(result.failedCarrierIds, ['first', 'sync', 'last']);
  assert.deepEqual(result.options, [
    { carrierId: 'success', service: 'standard', amountCents: 100, days: 2 },
  ]);
});

test('empty and policy-rejected responses are successful, including no carriers', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'empty', async quote() { return []; } },
    { id: 'invalid', async quote() { return [
      { service: '', amountCents: 100, days: 1 },
      { service: 'negative', amountCents: -1, days: 1 },
      { service: 'fraction', amountCents: 1.5, days: 1 },
      { service: 'zero days', amountCents: 1, days: 0 },
    ]; } },
  ]);
  assert.deepEqual(await quotes.collect(parcel), { options: [], failedCarrierIds: [] });
  assert.deepEqual(await new DeliveryQuotes([]).collect(parcel), { options: [], failedCarrierIds: [] });
});

test('checkout forwards failures when maximum days excludes every successful option', async () => {
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'failed', async quote() { throw new Error('offline'); } },
    { id: 'slow', async quote() { return [{ service: 'ground', amountCents: 100, days: 5 }]; } },
  ]));
  assert.deepEqual(await checkout.delivery({ parcel, maximumDays: 2 }), {
    options: [], failedCarrierIds: ['failed'], recommended: null, message: 'No delivery options',
  });
});

test('invalid public inputs reject with existing messages before any adapter calls', async () => {
  let calls = 0;
  const quotes = new DeliveryQuotes([{ id: 'x', async quote() { calls++; return []; } }]);
  const checkout = new Checkout(quotes);
  for (const weightGrams of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(quotes.collect({ ...parcel, weightGrams }), {
      name: 'RangeError', message: 'Weight must be a positive integer',
    });
  }
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, destination: '  ' } }), {
    name: 'RangeError', message: 'Destination is required',
  });
  for (const maximumDays of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(checkout.delivery({ parcel, maximumDays }), {
      name: 'RangeError', message: 'Maximum days must be a positive integer',
    });
  }
  assert.equal(calls, 0);
});

test('isolates parcels and owns result arrays and options across collections', async () => {
  const input = { ...parcel };
  const rate = { service: 'standard', amountCents: 100, days: 2 };
  const rates = [rate];
  const received = [];
  const quotes = new DeliveryQuotes([
    { id: 'mutator', async quote(copy) {
      received.push(copy);
      copy.weightGrams = 999;
      copy.destination = 'changed';
      return rates;
    } },
    { id: 'observer', async quote(copy) {
      received.push(copy);
      assert.deepEqual(copy, parcel);
      return rates;
    } },
    { id: 'failed', async quote() { throw new Error('offline'); } },
  ]);
  const checkout = new Checkout(quotes);
  const first = await checkout.delivery({ parcel: input });
  assert.deepEqual(input, parcel);
  assert.notEqual(received[0], input);
  assert.notEqual(received[0], received[1]);
  assert.notEqual(first.options[0], rate);
  first.options[0].service = 'changed';
  first.options.pop();
  first.failedCarrierIds.push('invented');
  assert.deepEqual(rates, [{ service: 'standard', amountCents: 100, days: 2 }]);
  const second = await checkout.delivery({ parcel: input });
  assert.deepEqual(second.failedCarrierIds, ['failed']);
  assert.equal(second.options.length, 2);
  assert.equal(second.options[0].service, 'standard');
  assert.equal(second.recommended, second.options[0]);
});

test('successful options retain deterministic price, days, carrier and service ordering', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'z', async quote() { return [{ service: 'a', amountCents: 100, days: 2 }]; } },
    { id: 'a', async quote() { return [
      { service: 'z', amountCents: 100, days: 2 },
      { service: 'a', amountCents: 100, days: 2 },
      { service: 'quick', amountCents: 100, days: 1 },
      { service: 'cheap', amountCents: 50, days: 5 },
    ]; } },
  ]);
  const result = await new Checkout(quotes).delivery({ parcel, maximumDays: 2 });
  assert.deepEqual(result.options.map(option => `${option.carrierId}/${option.service}`),
    ['a/quick', 'a/a', 'a/z', 'z/a']);
  assert.equal(result.recommended, result.options[0]);
  assert.equal(result.message, 'a quick: 1 day');
});

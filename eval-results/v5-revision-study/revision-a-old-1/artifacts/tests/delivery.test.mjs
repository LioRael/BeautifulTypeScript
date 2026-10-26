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
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('starts every carrier once and waits for all, preserving successes and failure order', async () => {
  const first = deferred();
  const last = deferred();
  const calls = [];
  const quotes = new DeliveryQuotes([
    { id: 'first', quote() { calls.push('first'); return first.promise; } },
    { id: 'sync', quote() { calls.push('sync'); throw new Error('sync failure'); } },
    { id: 'last', quote() { calls.push('last'); return last.promise; } },
    { id: 'ok', quote() { calls.push('ok'); return Promise.resolve([
      { service: 'slow', amountCents: 100, days: 5 },
      { service: 'fast', amountCents: 300, days: 1 },
    ]); } },
  ]);
  let settled = false;
  const pending = quotes.collect(parcel).then(result => { settled = true; return result; });
  assert.deepEqual(calls, ['first', 'sync', 'last', 'ok']);
  last.reject('last failure');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  first.reject(new Error('first failure'));
  const result = await pending;
  assert.deepEqual(result.failedCarrierIds, ['first', 'sync', 'last']);
  assert.deepEqual(result.options.map(option => option.service), ['slow', 'fast']);
  assert.deepEqual(calls, ['first', 'sync', 'last', 'ok']);
});

test('empty and policy-rejected rates are successful carrier responses', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'empty', async quote() { return []; } },
    { id: 'invalid', async quote() { return [
      { service: '', amountCents: 10, days: 1 },
      { service: 'bad-price', amountCents: -1, days: 1 },
      { service: 'bad-days', amountCents: 10, days: 0 },
    ]; } },
  ]);
  assert.deepEqual(await quotes.collect(parcel), { options: [], failedCarrierIds: [] });
  assert.deepEqual(await new DeliveryQuotes([]).collect(parcel), { options: [], failedCarrierIds: [] });
});

test('checkout retains failures when filtering removes all options', async () => {
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'failed', async quote() { throw new Error('offline'); } },
    { id: 'ok', async quote() { return [{ service: 'slow', amountCents: 100, days: 5 }]; } },
  ]));
  assert.deepEqual(await checkout.delivery({ parcel, maximumDays: 2 }), {
    options: [], failedCarrierIds: ['failed'], recommended: null, message: 'No delivery options',
  });
  const result = await checkout.delivery({ parcel });
  assert.deepEqual(result.failedCarrierIds, ['failed']);
  assert.equal(result.recommended, result.options[0]);
  assert.equal(result.message, 'ok slow: 5 days');
});

test('invalid checkout inputs reject before any adapter is called', async () => {
  let calls = 0;
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'x', async quote() { calls++; return []; } },
  ]));
  for (const maximumDays of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkout.delivery({ parcel, maximumDays }), {
      name: 'RangeError', message: 'Maximum days must be a positive integer',
    });
  }
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, weightGrams: 0 } }), {
    name: 'RangeError', message: 'Weight must be a positive integer',
  });
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, destination: ' ' } }), {
    name: 'RangeError', message: 'Destination is required',
  });
  assert.equal(calls, 0);
});

test('parcel copies are isolated and result mutations cannot affect adapters or later collections', async () => {
  const input = { ...parcel };
  const rate = { service: 'standard', amountCents: 200, days: 2 };
  const rates = [rate];
  const received = [];
  const quotes = new DeliveryQuotes([
    { id: 'mutator', async quote(value) {
      received.push(value);
      value.weightGrams = 999;
      value.destination = 'changed';
      return [];
    } },
    { id: 'ok', async quote(value) {
      received.push(value);
      assert.deepEqual(value, parcel);
      return rates;
    } },
    { id: 'failed', quote() { throw null; } },
  ]);
  const first = await quotes.collect(input);
  first.options[0].service = 'changed';
  first.options.push({ carrierId: 'extra', ...rate });
  first.failedCarrierIds.push('extra');
  const second = await quotes.collect(input);
  assert.deepEqual(input, parcel);
  assert.equal(new Set(received).size, received.length);
  assert.deepEqual(rates, [{ service: 'standard', amountCents: 200, days: 2 }]);
  assert.deepEqual(second, {
    options: [{ carrierId: 'ok', ...rate }], failedCarrierIds: ['failed'],
  });
  const checkout = new Checkout(quotes);
  const delivery = await checkout.delivery({ parcel: input });
  delivery.recommended.amountCents = 1;
  delivery.options.length = 0;
  delivery.failedCarrierIds.length = 0;
  const next = await checkout.delivery({ parcel: input });
  assert.equal(next.recommended.amountCents, 200);
  assert.deepEqual(next.failedCarrierIds, ['failed']);
});

test('successful options retain deterministic price, days, carrier and service ordering', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'z', async quote() { return [
      { service: 'cheap', amountCents: 50, days: 9 },
      { service: 'z', amountCents: 100, days: 2 },
      { service: 'fast', amountCents: 100, days: 1 },
    ]; } },
    { id: 'a', async quote() { return [
      { service: 'z', amountCents: 100, days: 2 },
      { service: 'a', amountCents: 100, days: 2 },
    ]; } },
  ]);
  const result = await quotes.collect(parcel);
  assert.deepEqual(result.options.map(option => `${option.carrierId}/${option.service}`),
    ['z/cheap', 'z/fast', 'a/a', 'a/z', 'z/z']);
  assert.deepEqual(result.failedCarrierIds, []);
});

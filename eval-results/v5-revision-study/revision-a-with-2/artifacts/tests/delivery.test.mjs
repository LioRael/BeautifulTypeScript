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

test('starts every carrier once, waits for all, and reports failures in configuration order', async () => {
  const first = deferred();
  const last = deferred();
  const calls = [];
  const quotes = new DeliveryQuotes([
    { id: 'first', quote() { calls.push('first'); return first.promise; } },
    { id: 'sync', quote() { calls.push('sync'); throw new Error('sync failure'); } },
    { id: 'success', quote() {
      calls.push('success');
      return Promise.resolve([{ service: 'standard', amountCents: 100, days: 2 }]);
    } },
    { id: 'last', quote() { calls.push('last'); return last.promise; } },
  ]);
  let finished = false;
  const collection = quotes.collect(parcel).then(result => { finished = true; return result; });
  assert.deepEqual(calls, ['first', 'sync', 'success', 'last']);
  last.reject(new Error('last failure'));
  // Let already settled carriers finish while the first carrier remains pending.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  first.reject(new Error('first failure'));
  const result = await collection;
  assert.deepEqual(result.failedCarrierIds, ['first', 'sync', 'last']);
  assert.deepEqual(result.options, [
    { carrierId: 'success', service: 'standard', amountCents: 100, days: 2 },
  ]);
});

test('empty and policy-rejected rates are successful, including empty configuration', async () => {
  const quotes = new DeliveryQuotes([
    { id: 'empty', async quote() { return []; } },
    { id: 'invalid', async quote() { return [
      { service: '', amountCents: 10, days: 1 },
      { service: 'bad amount', amountCents: -1, days: 1 },
      { service: 'bad days', amountCents: 10, days: 0 },
    ]; } },
  ]);
  assert.deepEqual(await quotes.collect(parcel), { options: [], failedCarrierIds: [] });
  assert.deepEqual(await new DeliveryQuotes([]).collect(parcel), { options: [], failedCarrierIds: [] });
});

test('checkout preserves failures when maximum-days filtering removes every option', async () => {
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'failed', async quote() { throw new Error('unavailable'); } },
    { id: 'slow', async quote() { return [{ service: 'standard', amountCents: 50, days: 5 }]; } },
  ]));
  assert.deepEqual(await checkout.delivery({ parcel, maximumDays: 2 }), {
    options: [], failedCarrierIds: ['failed'], recommended: null, message: 'No delivery options',
  });
  const result = await checkout.delivery({ parcel });
  assert.equal(result.recommended, result.options[0]);
  assert.equal(result.message, 'slow standard: 5 days');
  assert.deepEqual(result.failedCarrierIds, ['failed']);
});

test('invalid parcel and maximum-days input reject before any carrier runs', async () => {
  let calls = 0;
  const checkout = new Checkout(new DeliveryQuotes([
    { id: 'unused', async quote() { calls++; return []; } },
  ]));
  for (const maximumDays of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(checkout.delivery({ parcel, maximumDays }), {
      name: 'RangeError', message: 'Maximum days must be a positive integer',
    });
  }
  for (const weightGrams of [0, -1, 0.5, NaN, Infinity]) {
    await assert.rejects(checkout.delivery({ parcel: { ...parcel, weightGrams } }), {
      name: 'RangeError', message: 'Weight must be a positive integer',
    });
  }
  await assert.rejects(checkout.delivery({ parcel: { ...parcel, destination: '  ' } }), {
    name: 'RangeError', message: 'Destination is required',
  });
  assert.equal(calls, 0);
});

test('isolates parcel copies and owns options and arrays across collections', async () => {
  const input = { ...parcel };
  const rates = [{ service: 'standard', amountCents: 100, days: 2 }];
  const received = [];
  const checkout = new Checkout(new DeliveryQuotes([
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
    { id: 'failed', async quote() { throw new Error('unavailable'); } },
  ]));
  const first = await checkout.delivery({ parcel: input });
  assert.deepEqual(input, parcel);
  assert.notEqual(received[0], input);
  assert.notEqual(received[0], received[1]);
  assert.notEqual(first.options[0], first.options[1]);
  first.recommended.service = 'edited';
  first.options.pop();
  first.failedCarrierIds.push('invented');
  assert.deepEqual(rates, [{ service: 'standard', amountCents: 100, days: 2 }]);
  const second = await checkout.delivery({ parcel: input });
  assert.deepEqual(second.options.map(option => option.service), ['standard', 'standard']);
  assert.deepEqual(second.failedCarrierIds, ['failed']);
  rates[0].service = 'adapter edited';
  rates.length = 0;
  assert.equal(second.recommended.service, 'standard');
});

test('successful options retain price, days, carrier and service ordering', async () => {
  const result = await new DeliveryQuotes([
    { id: 'z', async quote() { return [
      { service: 'cheap', amountCents: 50, days: 8 },
      { service: 'fast', amountCents: 100, days: 1 },
      { service: 'standard', amountCents: 100, days: 2 },
    ]; } },
    { id: 'a', async quote() { return [
      { service: 'zeta', amountCents: 100, days: 2 },
      { service: 'alpha', amountCents: 100, days: 2 },
    ]; } },
    { id: 'failed', quote() { throw new Error('unavailable'); } },
  ]).collect(parcel);
  assert.deepEqual(result.options.map(option => `${option.carrierId}/${option.service}`),
    ['z/cheap', 'z/fast', 'a/alpha', 'a/zeta', 'z/standard']);
  assert.deepEqual(result.failedCarrierIds, ['failed']);
});

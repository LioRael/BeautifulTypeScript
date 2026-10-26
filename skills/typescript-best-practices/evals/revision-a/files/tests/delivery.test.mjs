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

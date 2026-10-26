import test from 'node:test';
import assert from 'node:assert/strict';
import { Catalog } from '../dist/catalog.js';
import { CartPricing } from '../dist/cart.js';
const make = () => new CartPricing(new Catalog([
  {sku:'book',unitCents:199,promotionEligible:true},
], [{code:'SAVE',percent:10,minimumEligibleCents:300}]));
test('quantities, repeated lines, rounding and original order', () => {
  const result = make().quote({lines:[{sku:'book',quantity:1},{sku:'book',quantity:2}],promotionCode:'SAVE'});
  assert.equal(result.subtotalCents,597);
  assert.equal(result.discountCents,59);
  assert.equal(result.totalCents,538);
  assert.deepEqual(result.lines.map(x => x.quantity),[1,2]);
});
test('unknown codes remain no discount and invalid lines throw', () => {
  assert.equal(make().quote({lines:[],promotionCode:'missing'}).appliedCode,null);
  assert.throws(() => make().quote({lines:[{sku:'book',quantity:0}]}),RangeError);
  assert.throws(() => make().quote({lines:[{sku:'missing',quantity:1}]}),/Unknown SKU/);
});

const mixedCatalog = () => new Catalog([
  { sku: 'eligible', unitCents: 199, promotionEligible: true },
  { sku: 'excluded', unitCents: 1000, promotionEligible: false },
  { sku: 'free', unitCents: 0, promotionEligible: true },
], [
  { code: 'SAVE', percent: 10, minimumEligibleCents: 597 },
  { code: 'CAP', percent: 50, minimumEligibleCents: 0, maximumDiscountCents: 20 },
  { code: 'ZERO', percent: 50, minimumEligibleCents: 0, maximumDiscountCents: 0 },
]);

test('ineligible products neither meet the minimum nor receive discounts', () => {
  const pricing = new CartPricing(mixedCatalog());
  const below = pricing.quote({ lines: [
    { sku: 'eligible', quantity: 2 },
    { sku: 'excluded', quantity: 3 },
  ], promotionCode: 'SAVE' });
  assert.equal(below.subtotalCents, 3398);
  assert.equal(below.eligibleSubtotalCents, 398);
  assert.equal(below.discountCents, 0);
  assert.equal(below.totalCents, 3398);
  assert.equal(below.appliedCode, null);

  const result = pricing.quote({ lines: [
    { sku: 'eligible', quantity: 1 },
    { sku: 'excluded', quantity: 2 },
    { sku: 'eligible', quantity: 2 },
  ], promotionCode: 'SAVE' });
  assert.deepEqual(result, {
    lines: [
      { sku: 'eligible', quantity: 1, unitCents: 199, subtotalCents: 199 },
      { sku: 'excluded', quantity: 2, unitCents: 1000, subtotalCents: 2000 },
      { sku: 'eligible', quantity: 2, unitCents: 199, subtotalCents: 398 },
    ],
    subtotalCents: 2597,
    eligibleSubtotalCents: 597,
    discountCents: 59,
    totalCents: 2538,
    appliedCode: 'SAVE',
  });
});

test('eligible base is always reported and existing caps and zero discounts apply', () => {
  const pricing = new CartPricing(mixedCatalog());
  const lines = [{ sku: 'excluded', quantity: 1 }, { sku: 'eligible', quantity: 2 }];
  for (const promotionCode of [undefined, 'missing', 'save', 'ZERO']) {
    const result = pricing.quote({ lines, promotionCode });
    assert.equal(result.eligibleSubtotalCents, 398);
    assert.equal(result.discountCents, 0);
    assert.equal(result.totalCents, 1398);
    assert.equal(result.appliedCode, null);
  }
  const capped = pricing.quote({ lines, promotionCode: 'CAP' });
  assert.equal(capped.discountCents, 20);
  assert.equal(capped.totalCents, 1378);
  assert.equal(capped.appliedCode, 'CAP');
  for (const lines of [[], [{ sku: 'excluded', quantity: 1 }], [{ sku: 'free', quantity: 4 }]]) {
    const result = pricing.quote({ lines, promotionCode: 'CAP' });
    assert.equal(result.eligibleSubtotalCents, 0);
    assert.equal(result.discountCents, 0);
    assert.equal(result.appliedCode, null);
  }
  const tiny = new CartPricing(new Catalog([
    { sku: 'tiny', unitCents: 1, promotionEligible: true },
  ], [{ code: 'SAVE', percent: 10, minimumEligibleCents: 0 }]));
  assert.equal(tiny.quote({ lines: [{ sku: 'tiny', quantity: 1 }], promotionCode: 'SAVE' }).appliedCode, null);
});

test('inputs, catalog snapshots and quote lines retain independent ownership', () => {
  const product = { sku: 'item', unitCents: 199, promotionEligible: true };
  const promotion = { code: 'SAVE', percent: 10, minimumEligibleCents: 0 };
  const catalog = new Catalog([product], [promotion]);
  product.promotionEligible = false;
  product.unitCents = 999;
  promotion.percent = 100;
  catalog.product('item').promotionEligible = false;
  catalog.promotion('SAVE').percent = 100;
  const lines = Object.freeze([Object.freeze({ sku: 'item', quantity: 2 })]);
  const request = Object.freeze({ lines, promotionCode: 'SAVE' });
  const pricing = new CartPricing(catalog);
  const first = pricing.quote(request);
  const second = pricing.quote(request);
  assert.equal(first.eligibleSubtotalCents, 398);
  assert.equal(first.discountCents, 39);
  assert.notEqual(first.lines, lines);
  assert.notEqual(first.lines, second.lines);
  assert.notEqual(first.lines[0], lines[0]);
  assert.notEqual(first.lines[0], second.lines[0]);
  first.lines[0].quantity = 99;
  first.lines.push(first.lines[0]);
  assert.equal(second.lines.length, 1);
  assert.equal(second.lines[0].quantity, 2);
  assert.equal(lines[0].quantity, 2);
  assert.deepEqual(pricing.quote(request), second);
});

test('validation and amount overflow errors remain synchronous for every code path', () => {
  const pricing = new CartPricing(new Catalog([
    { sku: 'large', unitCents: Number.MAX_SAFE_INTEGER, promotionEligible: false },
    { sku: 'eligible', unitCents: 1, promotionEligible: true },
  ], [{ code: 'SAVE', percent: 10, minimumEligibleCents: 0 }]));
  for (const promotionCode of [undefined, 'missing', 'SAVE']) {
    for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => pricing.quote({ lines: [{ sku: 'eligible', quantity }], promotionCode }),
        { name: 'RangeError', message: 'Invalid cart line' });
    }
    assert.throws(() => pricing.quote({ lines: [{ sku: 'missing', quantity: 1 }], promotionCode }),
      { message: 'Unknown SKU: missing' });
    for (const lines of [
      [{ sku: 'large', quantity: 2 }],
      [{ sku: 'large', quantity: 1 }, { sku: 'eligible', quantity: 1 }],
    ]) {
      assert.throws(() => pricing.quote({ lines, promotionCode }),
        { name: 'RangeError', message: 'Cart amount exceeds supported range' });
    }
  }
});

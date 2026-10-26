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

const mixedPricing = () => new CartPricing(new Catalog([
  { sku: 'eligible', unitCents: 199, promotionEligible: true },
  { sku: 'excluded', unitCents: 1000, promotionEligible: false },
  { sku: 'free', unitCents: 0, promotionEligible: true },
], [
  { code: 'SAVE', percent: 10, minimumEligibleCents: 398 },
  { code: 'CAP', percent: 100, minimumEligibleCents: 0, maximumDiscountCents: 25 },
  { code: 'ZERO', percent: 100, minimumEligibleCents: 0, maximumDiscountCents: 0 },
]));

test('excluded products neither meet the minimum nor receive discounts', () => {
  const pricing = mixedPricing();
  const below = pricing.quote({
    lines: [{ sku: 'eligible', quantity: 1 }, { sku: 'excluded', quantity: 2 }],
    promotionCode: 'SAVE',
  });
  assert.equal(below.subtotalCents, 2199);
  assert.equal(below.eligibleSubtotalCents, 199);
  assert.equal(below.discountCents, 0);
  assert.equal(below.appliedCode, null);
  assert.equal(below.totalCents, 2199);

  const lines = [
    { sku: 'eligible', quantity: 1 },
    { sku: 'excluded', quantity: 2 },
    { sku: 'eligible', quantity: 1 },
  ];
  const atMinimum = pricing.quote({ lines, promotionCode: 'SAVE' });
  assert.equal(atMinimum.subtotalCents, 2398);
  assert.equal(atMinimum.eligibleSubtotalCents, 398);
  assert.equal(atMinimum.discountCents, 39); // Floor once across both eligible lines.
  assert.equal(atMinimum.totalCents, 2359);
  assert.equal(atMinimum.appliedCode, 'SAVE');
  assert.deepEqual(atMinimum.lines.map(({ sku, quantity }) => ({ sku, quantity })), lines);
  assert.equal(pricing.quote({ lines, promotionCode: 'CAP' }).discountCents, 25);
});

test('eligible subtotal is always reported, including quantities and repeated SKUs', () => {
  for (const promotionCode of [undefined, 'missing', 'save']) {
    const quote = mixedPricing().quote({
      lines: [
        { sku: 'eligible', quantity: 2 },
        { sku: 'excluded', quantity: 1 },
        { sku: 'eligible', quantity: 1 },
      ],
      ...(promotionCode === undefined ? {} : { promotionCode }),
    });
    assert.equal(quote.eligibleSubtotalCents, 597);
    assert.equal(quote.subtotalCents, 1597);
    assert.equal(quote.totalCents, 1597);
    assert.equal(quote.discountCents, 0);
    assert.equal(quote.appliedCode, null);
  }
});

test('empty, ineligible, free and zero-cap quotes retain null applied codes', () => {
  for (const lines of [[], [{ sku: 'excluded', quantity: 1 }], [{ sku: 'free', quantity: 3 }]]) {
    const quote = mixedPricing().quote({ lines, promotionCode: 'CAP' });
    assert.equal(quote.eligibleSubtotalCents, 0);
    assert.equal(quote.discountCents, 0);
    assert.equal(quote.appliedCode, null);
    assert.equal(quote.totalCents, quote.subtotalCents);
  }
  const zeroCap = mixedPricing().quote({
    lines: [{ sku: 'eligible', quantity: 1 }], promotionCode: 'ZERO',
  });
  assert.equal(zeroCap.eligibleSubtotalCents, 199);
  assert.equal(zeroCap.discountCents, 0);
  assert.equal(zeroCap.appliedCode, null);
});

test('quotes preserve inputs, catalog snapshots and independent output ownership', () => {
  const products = [{ sku: 'book', unitCents: 199, promotionEligible: true }];
  const promotions = [{ code: 'SAVE', percent: 10, minimumEligibleCents: 0 }];
  const catalog = new Catalog(products, promotions);
  products[0].promotionEligible = false;
  promotions[0].percent = 100;
  const productCopy = catalog.product('book');
  productCopy.promotionEligible = false;
  const promotionCopy = catalog.promotion('SAVE');
  promotionCopy.percent = 100;
  const request = Object.freeze({
    lines: Object.freeze([Object.freeze({ sku: 'book', quantity: 2 })]),
    promotionCode: 'SAVE',
  });
  const pricing = new CartPricing(catalog);
  const first = pricing.quote(request);
  const second = pricing.quote(request);
  assert.equal(first.eligibleSubtotalCents, 398);
  assert.equal(first.discountCents, 39);
  assert.notStrictEqual(first.lines, second.lines);
  assert.notStrictEqual(first.lines[0], second.lines[0]);
  assert.notStrictEqual(first.lines[0], request.lines[0]);
  first.lines[0].quantity = 99;
  first.lines.push({ sku: 'extra', quantity: 1, unitCents: 0, subtotalCents: 0 });
  assert.equal(second.lines.length, 1);
  assert.equal(second.lines[0].quantity, 2);
  assert.equal(request.lines[0].quantity, 2);
  assert.equal(catalog.product('book').promotionEligible, true);
  assert.equal(catalog.promotion('SAVE').percent, 10);
});

test('validation and monetary overflows still throw synchronously for every code path', () => {
  for (const promotionCode of [undefined, 'missing', 'SAVE']) {
    const pricing = new CartPricing(new Catalog([
      { sku: 'large', unitCents: Number.MAX_SAFE_INTEGER, promotionEligible: false },
      { sku: 'one', unitCents: 1, promotionEligible: true },
    ], [{ code: 'SAVE', percent: 10, minimumEligibleCents: 0 }]));
    for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => pricing.quote({ lines: [{ sku: 'one', quantity }], promotionCode }),
        { name: 'RangeError', message: 'Invalid cart line' });
    }
    assert.throws(() => pricing.quote({ lines: [{ sku: 'absent', quantity: 1 }], promotionCode }),
      { message: 'Unknown SKU: absent' });
    for (const lines of [
      [{ sku: 'large', quantity: 2 }],
      [{ sku: 'large', quantity: 1 }, { sku: 'one', quantity: 1 }],
    ]) {
      assert.throws(() => pricing.quote({ lines, promotionCode }),
        { name: 'RangeError', message: 'Cart amount exceeds supported range' });
    }
  }
});

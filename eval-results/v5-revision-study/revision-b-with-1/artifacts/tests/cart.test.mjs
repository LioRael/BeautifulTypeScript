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

const mixed = (promotion = {}) => new CartPricing(new Catalog([
  {sku:'eligible',unitCents:199,promotionEligible:true},
  {sku:'excluded',unitCents:1000,promotionEligible:false},
  {sku:'free',unitCents:0,promotionEligible:true},
], [{code:'SAVE',percent:10,minimumEligibleCents:398,...promotion}]));
const mixedLines = () => [
  {sku:'eligible',quantity:1},
  {sku:'excluded',quantity:2},
  {sku:'eligible',quantity:2},
];

test('mixed baskets qualify and discount only the combined eligible subtotal', () => {
  const result = mixed().quote({lines:mixedLines(),promotionCode:'SAVE'});
  assert.deepEqual(result, {
    lines:[
      {sku:'eligible',quantity:1,unitCents:199,subtotalCents:199},
      {sku:'excluded',quantity:2,unitCents:1000,subtotalCents:2000},
      {sku:'eligible',quantity:2,unitCents:199,subtotalCents:398},
    ],
    subtotalCents:2597,
    eligibleSubtotalCents:597,
    discountCents:59,
    totalCents:2538,
    appliedCode:'SAVE',
  });
  const below = mixed().quote({lines:[
    {sku:'excluded',quantity:2},{sku:'eligible',quantity:1},
  ],promotionCode:'SAVE'});
  assert.equal(below.eligibleSubtotalCents,199);
  assert.equal(below.discountCents,0);
  assert.equal(below.appliedCode,null);
  assert.equal(below.totalCents,2199);
  const boundary = mixed().quote({lines:[
    {sku:'eligible',quantity:2},{sku:'excluded',quantity:1},
  ],promotionCode:'SAVE'});
  assert.equal(boundary.discountCents,39);
});

test('eligible subtotal is reported for omitted, unknown and case-mismatched codes', () => {
  for (const promotionCode of [undefined,'missing','save']) {
    const result = mixed().quote({lines:mixedLines(),promotionCode});
    assert.equal(result.eligibleSubtotalCents,597);
    assert.equal(result.subtotalCents,2597);
    assert.equal(result.discountCents,0);
    assert.equal(result.totalCents,2597);
    assert.equal(result.appliedCode,null);
  }
});

test('caps and zero discounts preserve appliedCode convention', () => {
  for (const [cap,discount] of [[20,20],[0,0]]) {
    const result = mixed({maximumDiscountCents:cap}).quote({lines:mixedLines(),promotionCode:'SAVE'});
    assert.equal(result.discountCents,discount);
    assert.equal(result.appliedCode,discount > 0 ? 'SAVE' : null);
  }
  for (const lines of [[],[{sku:'excluded',quantity:1}],[{sku:'free',quantity:3}]]) {
    const result = mixed({minimumEligibleCents:0}).quote({lines,promotionCode:'SAVE'});
    assert.equal(result.eligibleSubtotalCents,0);
    assert.equal(result.discountCents,0);
    assert.equal(result.appliedCode,null);
  }
  const tiny = new CartPricing(new Catalog([
    {sku:'tiny',unitCents:1,promotionEligible:true},
  ], [{code:'SAVE',percent:10,minimumEligibleCents:0}]));
  assert.equal(tiny.quote({lines:[{sku:'tiny',quantity:1}],promotionCode:'SAVE'}).appliedCode,null);
});

test('inputs, catalog snapshots and quote lines retain independent ownership', () => {
  const product = {sku:'book',unitCents:199,promotionEligible:true};
  const promotion = {code:'SAVE',percent:10,minimumEligibleCents:0};
  const catalog = new Catalog([product],[promotion]);
  product.promotionEligible = false;
  product.unitCents = 1;
  promotion.percent = 100;
  catalog.product('book').promotionEligible = false;
  catalog.promotion('SAVE').percent = 100;
  const lines = Object.freeze([Object.freeze({sku:'book',quantity:2})]);
  const request = Object.freeze({lines,promotionCode:'SAVE'});
  const pricing = new CartPricing(catalog);
  const first = pricing.quote(request);
  const second = pricing.quote(request);
  assert.equal(first.eligibleSubtotalCents,398);
  assert.equal(first.discountCents,39);
  assert.notEqual(first.lines,second.lines);
  assert.notEqual(first.lines[0],second.lines[0]);
  assert.notEqual(first.lines[0],lines[0]);
  first.lines[0].quantity = 99;
  first.lines.push({...first.lines[0]});
  assert.equal(second.lines.length,1);
  assert.equal(second.lines[0].quantity,2);
  assert.deepEqual(lines,[{sku:'book',quantity:2}]);
});

test('validation and monetary overflows still throw synchronously regardless of promotion', () => {
  const pricing = new CartPricing(new Catalog([
    {sku:'huge',unitCents:Number.MAX_SAFE_INTEGER,promotionEligible:false},
    {sku:'one',unitCents:1,promotionEligible:true},
  ], []));
  for (const promotionCode of [undefined,'missing']) {
    for (const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => pricing.quote({lines:[{sku:'one',quantity}],promotionCode}),
        {name:'RangeError',message:'Invalid cart line'});
    }
    assert.throws(() => pricing.quote({lines:[{sku:'missing',quantity:1}],promotionCode}),
      {message:'Unknown SKU: missing'});
    for (const lines of [
      [{sku:'huge',quantity:2}],
      [{sku:'huge',quantity:1},{sku:'one',quantity:1}],
    ]) {
      assert.throws(() => pricing.quote({lines,promotionCode}),
        {name:'RangeError',message:'Cart amount exceeds supported range'});
    }
  }
});

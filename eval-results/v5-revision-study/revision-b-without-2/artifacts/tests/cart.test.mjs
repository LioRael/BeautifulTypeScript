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
  assert.equal(result.eligibleSubtotalCents,597);
  assert.equal(result.discountCents,59);
  assert.equal(result.totalCents,538);
  assert.deepEqual(result.lines.map(x => x.quantity),[1,2]);
});

const mixed = (promotion = {}) => new CartPricing(new Catalog([
  {sku:'eligible',unitCents:199,promotionEligible:true},
  {sku:'excluded',unitCents:1000,promotionEligible:false},
  {sku:'free',unitCents:0,promotionEligible:true},
], [{code:'SAVE',percent:10,minimumEligibleCents:300,...promotion}]));

test('ineligible products neither satisfy the minimum nor receive discounts', () => {
  const pricing = mixed();
  const below = pricing.quote({lines:[
    {sku:'excluded',quantity:2},{sku:'eligible',quantity:1},
  ],promotionCode:'SAVE'});
  assert.equal(below.subtotalCents,2199);
  assert.equal(below.eligibleSubtotalCents,199);
  assert.equal(below.discountCents,0);
  assert.equal(below.totalCents,2199);
  assert.equal(below.appliedCode,null);

  const result = pricing.quote({lines:[
    {sku:'eligible',quantity:1},{sku:'excluded',quantity:2},
    {sku:'eligible',quantity:2},
  ],promotionCode:'SAVE'});
  assert.equal(result.subtotalCents,2597);
  assert.equal(result.eligibleSubtotalCents,597);
  assert.equal(result.discountCents,59);
  assert.equal(result.totalCents,2538);
  assert.equal(result.appliedCode,'SAVE');
  assert.deepEqual(result.lines.map(({sku,quantity}) => ({sku,quantity})),[
    {sku:'eligible',quantity:1},{sku:'excluded',quantity:2},{sku:'eligible',quantity:2},
  ]);
});

test('eligible subtotal is reported with omitted, unknown and case-mismatched codes', () => {
  for (const promotionCode of [undefined,'missing','save']) {
    const result = mixed().quote({lines:[
      {sku:'excluded',quantity:1},{sku:'eligible',quantity:2},
    ],promotionCode});
    assert.equal(result.eligibleSubtotalCents,398);
    assert.equal(result.subtotalCents,1398);
    assert.equal(result.discountCents,0);
    assert.equal(result.totalCents,1398);
    assert.equal(result.appliedCode,null);
  }
  assert.equal(mixed().quote({lines:[]}).eligibleSubtotalCents,0);
});

test('minimum is inclusive, rounding is combined, and caps preserve zero convention', () => {
  const request = {lines:[
    {sku:'eligible',quantity:1},{sku:'excluded',quantity:1},
    {sku:'eligible',quantity:1},
  ],promotionCode:'SAVE'};
  assert.equal(mixed({minimumEligibleCents:398}).quote(request).discountCents,39);
  assert.equal(mixed({maximumDiscountCents:25}).quote(request).discountCents,25);
  const zeroCap = mixed({maximumDiscountCents:0}).quote(request);
  assert.equal(zeroCap.discountCents,0);
  assert.equal(zeroCap.appliedCode,null);
  for (const lines of [[],[{sku:'excluded',quantity:1}],[{sku:'free',quantity:2}]]) {
    const result = mixed({minimumEligibleCents:0}).quote({lines,promotionCode:'SAVE'});
    assert.equal(result.eligibleSubtotalCents,0);
    assert.equal(result.discountCents,0);
    assert.equal(result.appliedCode,null);
  }
  const tiny = new CartPricing(new Catalog([
    {sku:'tiny',unitCents:1,promotionEligible:true},
  ],[{code:'SAVE',percent:1,minimumEligibleCents:0}]));
  assert.equal(tiny.quote({lines:[{sku:'tiny',quantity:1}],promotionCode:'SAVE'}).appliedCode,null);
});

test('validation and overflow errors remain synchronous for every code path', () => {
  const pricing = new CartPricing(new Catalog([
    {sku:'large',unitCents:Number.MAX_SAFE_INTEGER,promotionEligible:false},
    {sku:'one',unitCents:1,promotionEligible:true},
  ],[]));
  for (const promotionCode of [undefined,'missing']) {
    for (const quantity of [0,-1,1.5,Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => pricing.quote({lines:[{sku:'one',quantity}],promotionCode}),
        {name:'RangeError',message:'Invalid cart line'});
    }
    assert.throws(() => pricing.quote({lines:[{sku:'absent',quantity:1}],promotionCode}),
      {message:'Unknown SKU: absent'});
    for (const lines of [
      [{sku:'large',quantity:2}],
      [{sku:'large',quantity:1},{sku:'one',quantity:1}],
    ]) {
      assert.throws(() => pricing.quote({lines,promotionCode}),
        {name:'RangeError',message:'Cart amount exceeds supported range'});
    }
  }
});

test('catalog snapshots, caller inputs and quote ownership remain independent', () => {
  const product = {sku:'item',unitCents:199,promotionEligible:true};
  const promotion = {code:'SAVE',percent:10,minimumEligibleCents:0};
  const catalog = new Catalog([product],[promotion]);
  product.promotionEligible = false;
  product.unitCents = 999;
  promotion.percent = 100;
  catalog.product('item').promotionEligible = false;
  catalog.promotion('SAVE').percent = 100;
  const pricing = new CartPricing(catalog);
  const line = Object.freeze({sku:'item',quantity:2});
  const request = Object.freeze({lines:Object.freeze([line,line]),promotionCode:'SAVE'});
  const first = pricing.quote(request);
  const second = pricing.quote(request);
  assert.equal(first.eligibleSubtotalCents,796);
  assert.equal(first.discountCents,79);
  assert.notStrictEqual(first.lines,second.lines);
  assert.notStrictEqual(first.lines[0],first.lines[1]);
  assert.notStrictEqual(first.lines[0],second.lines[0]);
  assert.notStrictEqual(first.lines[0],line);
  first.lines[0].quantity = 99;
  first.lines.pop();
  assert.equal(second.lines.length,2);
  assert.equal(second.lines[0].quantity,2);
  assert.equal(request.lines.length,2);
  assert.equal(line.quantity,2);
});
test('unknown codes remain no discount and invalid lines throw', () => {
  assert.equal(make().quote({lines:[],promotionCode:'missing'}).appliedCode,null);
  assert.throws(() => make().quote({lines:[{sku:'book',quantity:0}]}),RangeError);
  assert.throws(() => make().quote({lines:[{sku:'missing',quantity:1}]}),/Unknown SKU/);
});

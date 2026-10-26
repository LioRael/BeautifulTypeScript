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

const mixedCatalog = () => new Catalog([
  {sku:'eligible',unitCents:19,promotionEligible:true},
  {sku:'excluded',unitCents:1000,promotionEligible:false},
  {sku:'free',unitCents:0,promotionEligible:true},
], [
  {code:'MIN',percent:10,minimumEligibleCents:57},
  {code:'CAP',percent:100,minimumEligibleCents:0,maximumDiscountCents:7},
  {code:'ZERO',percent:100,minimumEligibleCents:0,maximumDiscountCents:0},
]);

test('ineligible amounts cannot meet the minimum or receive a discount', () => {
  const pricing = new CartPricing(mixedCatalog());
  const below = pricing.quote({lines:[
    {sku:'eligible',quantity:2},{sku:'excluded',quantity:1},
  ],promotionCode:'MIN'});
  assert.equal(below.subtotalCents,1038);
  assert.equal(below.eligibleSubtotalCents,38);
  assert.equal(below.discountCents,0);
  assert.equal(below.appliedCode,null);
  assert.equal(below.totalCents,1038);

  const result = pricing.quote({lines:[
    {sku:'eligible',quantity:1},{sku:'excluded',quantity:2},
    {sku:'eligible',quantity:2},
  ],promotionCode:'MIN'});
  assert.equal(result.subtotalCents,2057);
  assert.equal(result.eligibleSubtotalCents,57);
  assert.equal(result.discountCents,5);
  assert.equal(result.appliedCode,'MIN');
  assert.equal(result.totalCents,2052);
  assert.deepEqual(result.lines.map(({sku,quantity}) => ({sku,quantity})),[
    {sku:'eligible',quantity:1},{sku:'excluded',quantity:2},{sku:'eligible',quantity:2},
  ]);
});

test('eligible base is always reported, with caps and zero discounts preserved', () => {
  const pricing = new CartPricing(mixedCatalog());
  const lines = [{sku:'excluded',quantity:1},{sku:'eligible',quantity:3}];
  for (const promotionCode of [undefined,'missing','min','CAP','ZERO']) {
    const result = pricing.quote({lines,promotionCode});
    assert.equal(result.eligibleSubtotalCents,57);
    assert.equal(result.discountCents,promotionCode === 'CAP' ? 7 : 0);
    assert.equal(result.appliedCode,promotionCode === 'CAP' ? 'CAP' : null);
    assert.equal(result.totalCents,1057 - result.discountCents);
  }
  for (const lines of [[],[{sku:'free',quantity:3}],[{sku:'excluded',quantity:2}]]) {
    const result = pricing.quote({lines,promotionCode:'CAP'});
    assert.equal(result.eligibleSubtotalCents,0);
    assert.equal(result.discountCents,0);
    assert.equal(result.appliedCode,null);
  }
});

test('catalog snapshots, caller inputs and quote ownership are preserved', () => {
  const product = {sku:'item',unitCents:19,promotionEligible:true};
  const promotion = {code:'SAVE',percent:10,minimumEligibleCents:0};
  const catalog = new Catalog([product],[promotion]);
  product.promotionEligible = false;
  promotion.percent = 100;
  catalog.product('item').promotionEligible = false;
  catalog.promotion('SAVE').percent = 100;
  const lines = Object.freeze([Object.freeze({sku:'item',quantity:3})]);
  const request = Object.freeze({lines,promotionCode:'SAVE'});
  const pricing = new CartPricing(catalog);
  const first = pricing.quote(request);
  const second = pricing.quote(request);
  assert.equal(second.eligibleSubtotalCents,57);
  assert.equal(second.discountCents,5);
  assert.notStrictEqual(first.lines,second.lines);
  assert.notStrictEqual(first.lines[0],second.lines[0]);
  assert.notStrictEqual(first.lines[0],lines[0]);
  first.lines[0].quantity = 99;
  first.lines.push(first.lines[0]);
  assert.equal(second.lines.length,1);
  assert.equal(second.lines[0].quantity,3);
  assert.deepEqual(lines,[{sku:'item',quantity:3}]);
});

test('validation and overflow remain synchronous for every promotion lookup outcome', () => {
  const pricing = new CartPricing(new Catalog([
    {sku:'huge',unitCents:Number.MAX_SAFE_INTEGER,promotionEligible:false},
  ],[{code:'SAVE',percent:10,minimumEligibleCents:0}]));
  for (const promotionCode of [undefined,'missing','SAVE']) {
    for (const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => pricing.quote({lines:[{sku:'huge',quantity}],promotionCode}),
        {name:'RangeError',message:'Invalid cart line'});
    }
    assert.throws(() => pricing.quote({lines:[{sku:'missing',quantity:1}],promotionCode}),
      {message:'Unknown SKU: missing'});
    for (const lines of [
      [{sku:'huge',quantity:2}],
      [{sku:'huge',quantity:1},{sku:'huge',quantity:1}],
    ]) {
      assert.throws(() => pricing.quote({lines,promotionCode}),
        {name:'RangeError',message:'Cart amount exceeds supported range'});
    }
  }
});
test('unknown codes remain no discount and invalid lines throw', () => {
  assert.equal(make().quote({lines:[],promotionCode:'missing'}).appliedCode,null);
  assert.throws(() => make().quote({lines:[{sku:'book',quantity:0}]}),RangeError);
  assert.throws(() => make().quote({lines:[{sku:'missing',quantity:1}]}),/Unknown SKU/);
});

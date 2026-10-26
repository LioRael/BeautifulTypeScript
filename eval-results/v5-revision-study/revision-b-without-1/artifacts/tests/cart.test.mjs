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

const mixed = (promotions = [{code:'SAVE',percent:10,minimumEligibleCents:300}]) =>
  new CartPricing(new Catalog([
    {sku:'book',unitCents:199,promotionEligible:true},
    {sku:'gift',unitCents:1000,promotionEligible:false},
    {sku:'penny',unitCents:1,promotionEligible:true},
    {sku:'free',unitCents:0,promotionEligible:true},
  ], promotions));

test('ineligible items neither meet the minimum nor receive a discount', () => {
  const pricing = mixed();
  const below = pricing.quote({lines:[{sku:'book',quantity:1},{sku:'gift',quantity:2}],promotionCode:'SAVE'});
  assert.deepEqual([below.subtotalCents,below.eligibleSubtotalCents,below.discountCents,below.totalCents,below.appliedCode],
    [2199,199,0,2199,null]);
  const lines = [{sku:'book',quantity:1},{sku:'gift',quantity:2},{sku:'book',quantity:2}];
  const result = pricing.quote({lines,promotionCode:'SAVE'});
  assert.deepEqual(result.lines.map(({sku,quantity}) => ({sku,quantity})),lines);
  assert.deepEqual([result.subtotalCents,result.eligibleSubtotalCents,result.discountCents,result.totalCents,result.appliedCode],
    [2597,597,59,2538,'SAVE']);
});

test('eligible subtotal is reported without a known promotion', () => {
  for (const promotionCode of [undefined,'missing','save']) {
    const result = mixed().quote({lines:[{sku:'gift',quantity:2},{sku:'book',quantity:3}],promotionCode});
    assert.deepEqual([result.subtotalCents,result.eligibleSubtotalCents,result.discountCents,result.totalCents,result.appliedCode],
      [2597,597,0,2597,null]);
  }
});

test('minimum is inclusive and rounding happens once across eligible lines', () => {
  const result = mixed([{code:'HALF',percent:50,minimumEligibleCents:2}]).quote({
    lines:[{sku:'penny',quantity:1},{sku:'gift',quantity:1},{sku:'penny',quantity:1}],promotionCode:'HALF',
  });
  assert.deepEqual([result.eligibleSubtotalCents,result.discountCents,result.totalCents,result.appliedCode], [2,1,1001,'HALF']);
});

test('caps and zero discounts preserve the applied-code convention', () => {
  for (const [cap,discount] of [[10,10],[0,0]]) {
    const result = mixed([{code:'CAP',percent:100,minimumEligibleCents:0,maximumDiscountCents:cap}])
      .quote({lines:[{sku:'book',quantity:1},{sku:'gift',quantity:1}],promotionCode:'CAP'});
    assert.equal(result.discountCents,discount);
    assert.equal(result.appliedCode,discount ? 'CAP' : null);
  }
  for (const lines of [[],[{sku:'gift',quantity:1}],[{sku:'free',quantity:3}],[{sku:'penny',quantity:1}]]) {
    const result = mixed([{code:'SMALL',percent:10,minimumEligibleCents:0}]).quote({lines,promotionCode:'SMALL'});
    assert.equal(result.discountCents,0);
    assert.equal(result.appliedCode,null);
  }
});

test('inputs and catalog snapshots remain untouched and quotes own their lines', () => {
  const product = {sku:'book',unitCents:199,promotionEligible:true};
  const promotion = {code:'SAVE',percent:10,minimumEligibleCents:0};
  const catalog = new Catalog([product],[promotion]);
  product.promotionEligible = false;
  promotion.percent = 100;
  catalog.product('book').promotionEligible = false;
  catalog.promotion('SAVE').percent = 100;
  const pricing = new CartPricing(catalog);
  const lines = Object.freeze([Object.freeze({sku:'book',quantity:2})]);
  const request = Object.freeze({lines,promotionCode:'SAVE'});
  const first = pricing.quote(request);
  const second = pricing.quote(request);
  assert.equal(first.eligibleSubtotalCents,398);
  assert.equal(first.discountCents,39);
  assert.notStrictEqual(first.lines,second.lines);
  assert.notStrictEqual(first.lines[0],second.lines[0]);
  assert.notStrictEqual(first.lines[0],lines[0]);
  first.lines[0].quantity = 100;
  first.lines.push({...first.lines[0]});
  assert.equal(second.lines.length,1);
  assert.equal(second.lines[0].quantity,2);
  assert.equal(lines[0].quantity,2);
});

test('validation and overflow remain synchronous regardless of promotion', () => {
  const pricing = new CartPricing(new Catalog([
    {sku:'large',unitCents:Number.MAX_SAFE_INTEGER,promotionEligible:true},
    {sku:'excluded',unitCents:Number.MAX_SAFE_INTEGER,promotionEligible:false},
  ], []));
  for (const promotionCode of [undefined,'missing']) {
    for (const sku of ['large','excluded']) {
      for (const lines of [[{sku,quantity:2}],[{sku,quantity:1},{sku,quantity:1}]]) {
        assert.throws(() => pricing.quote({lines,promotionCode}),
          {name:'RangeError',message:'Cart amount exceeds supported range'});
      }
    }
    for (const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => pricing.quote({lines:[{sku:'large',quantity}],promotionCode}),
        {name:'RangeError',message:'Invalid cart line'});
    }
    assert.throws(() => pricing.quote({lines:[{sku:'missing',quantity:1}],promotionCode}),
      {message:'Unknown SKU: missing'});
  }
});

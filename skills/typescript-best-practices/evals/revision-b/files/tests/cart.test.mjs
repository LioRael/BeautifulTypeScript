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

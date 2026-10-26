import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const workspace = path.resolve(process.argv[2]);
const load = name => import(pathToFileURL(path.join(workspace, 'dist', name + '.js')).href);
const results = [];
async function group(id, run) {
  try { await run(); results.push({id, pass:true}); }
  catch (error) { results.push({id, pass:false, evidence:String(error?.stack ?? error)}); }
}

async function make(products, promotions=[]) {
  const {Catalog}=await load('catalog');
  const {CartPricing}=await load('cart');
  return new CartPricing(new Catalog(products,promotions));
}
const product=(sku,unitCents,promotionEligible=true)=>({sku,unitCents,promotionEligible});
const promo=(extra={})=>({code:'SAVE',percent:10,minimumEligibleCents:0,...extra});
await group('eligible-base-and-minimum',async()=>{
  const pricing=await make([product('yes',199),product('no',1000,false)],[promo({minimumEligibleCents:400})]);
  const below=pricing.quote({lines:[{sku:'yes',quantity:2},{sku:'no',quantity:1}],promotionCode:'SAVE'});
  assert.equal(below.eligibleSubtotalCents,398);
  assert.equal(below.subtotalCents,1398);
  assert.equal(below.discountCents,0);
  assert.equal(below.appliedCode,null);
  const reached=pricing.quote({lines:[{sku:'no',quantity:1},{sku:'yes',quantity:3}],promotionCode:'SAVE'});
  assert.equal(reached.discountCents,59);
  assert.equal(reached.totalCents,1538);
  assert.equal(reached.appliedCode,'SAVE');
});
await group('public-field-and-no-code',async()=>{
  const pricing=await make([product('yes',20),product('no',50,false)]);
  for(const code of [undefined,'unknown']) {
    const request={lines:[{sku:'yes',quantity:2},{sku:'no',quantity:3}]};
    if(code!==undefined) request.promotionCode=code;
    const result=pricing.quote(request);
    assert.equal(result.eligibleSubtotalCents,40);
    assert.equal(result.subtotalCents,190);
    assert.equal(result.discountCents,0);
    assert.equal(result.totalCents,190);
    assert.equal(result.appliedCode,null);
  }
  assert.equal(pricing.quote({lines:[]}).eligibleSubtotalCents,0);
});
await group('rounding-cap-and-boundaries',async()=>{
  const pricing=await make([product('a',19),product('b',11),product('x',999,false)],
    [promo({minimumEligibleCents:30}),promo({code:'CAP',percent:100,maximumDiscountCents:7}),promo({code:'ZERO',maximumDiscountCents:0})]);
  const lines=[{sku:'a',quantity:1},{sku:'x',quantity:1},{sku:'b',quantity:1}];
  assert.equal(pricing.quote({lines,promotionCode:'SAVE'}).discountCents,3);
  assert.equal(pricing.quote({lines,promotionCode:'CAP'}).discountCents,7);
  assert.equal(pricing.quote({lines,promotionCode:'ZERO'}).appliedCode,null);
  const ineligible=pricing.quote({lines:[{sku:'x',quantity:1}],promotionCode:'SAVE'});
  assert.equal(ineligible.discountCents,0);
  assert.equal(ineligible.appliedCode,null);
});
await group('line-order-and-quantities',async()=>{
  const pricing=await make([product('a',101),product('b',99,false)],[promo()]);
  const result=pricing.quote({lines:[{sku:'a',quantity:2},{sku:'b',quantity:1},{sku:'a',quantity:3}],promotionCode:'SAVE'});
  assert.deepEqual(result.lines,[
    {sku:'a',quantity:2,unitCents:101,subtotalCents:202},
    {sku:'b',quantity:1,unitCents:99,subtotalCents:99},
    {sku:'a',quantity:3,unitCents:101,subtotalCents:303},
  ]);
  assert.equal(result.eligibleSubtotalCents,505);
  assert.equal(result.discountCents,50);
  assert.equal(result.totalCents,554);
});
await group('existing-errors-and-range-policy',async()=>{
  const pricing=await make([product('a',Number.MAX_SAFE_INTEGER),product('b',1,false)],[promo()]);
  assert.throws(()=>pricing.quote({lines:[{sku:'a',quantity:2}]}),/Cart amount exceeds supported range/);
  assert.throws(()=>pricing.quote({lines:[{sku:'a',quantity:1},{sku:'b',quantity:1}],promotionCode:'unknown'}),RangeError);
  assert.throws(()=>pricing.quote({lines:[{sku:'missing',quantity:1}]}),/Unknown SKU: missing/);
  for(const quantity of [0,-1,1.5,NaN]) assert.throws(()=>pricing.quote({lines:[{sku:'a',quantity}]}),/Invalid cart line/);
  const result=pricing.quote({lines:[{sku:'a',quantity:1}],promotionCode:'SAVE'});
  assert.equal(result.discountCents,Number(BigInt(Number.MAX_SAFE_INTEGER)*10n/100n));
});
await group('catalog-and-quote-ownership',async()=>{
  const {Catalog}=await load('catalog');
  const {CartPricing}=await load('cart');
  const source=product('a',100);
  const promotion=promo();
  const catalog=new Catalog([source],[promotion]);
  source.unitCents=500;source.promotionEligible=false;promotion.percent=90;
  catalog.product('a').unitCents=200;
  catalog.promotion('SAVE').percent=80;
  const pricing=new CartPricing(catalog);
  const line=Object.freeze({sku:'a',quantity:2});
  const request=Object.freeze({lines:Object.freeze([line]),promotionCode:'SAVE'});
  const first=pricing.quote(request);
  first.lines[0].quantity=99;first.lines.push({...first.lines[0]});
  const next=pricing.quote(request);
  assert.equal(next.lines.length,1);
  assert.equal(next.lines[0].quantity,2);
  assert.equal(next.subtotalCents,200);
  assert.equal(next.discountCents,20);
  assert.equal(line.quantity,2);
});
console.log(JSON.stringify(results));

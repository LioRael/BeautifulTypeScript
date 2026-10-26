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

const parcel = {weightGrams:500,destination:'XY2'};
const rate = (service='standard', amountCents=100, days=2) => ({service,amountCents,days});
await group('failure-isolation', async () => {
  const {DeliveryQuotes} = await load('quotes');
  const q = new DeliveryQuotes([
    {id:'sync',quote(){throw new Error('offline');}},
    {id:'ok',async quote(){return [rate()];}},
    {id:'async',async quote(){throw new Error('unavailable');}},
  ]);
  const result = await q.collect(parcel);
  assert.deepEqual(result.failedCarrierIds,['sync','async']);
  assert.deepEqual(result.options,[{carrierId:'ok',...rate()}]);
});
await group('settlement-and-order', async () => {
  const {DeliveryQuotes} = await load('quotes');
  const gates = [];
  const started = [];
  const carriers = ['first','second','third'].map(id => ({id,quote(){
    started.push(id);
    return new Promise((resolve,reject) => gates.push({resolve,reject}));
  }}));
  let settled = false;
  const pending = new DeliveryQuotes(carriers).collect(parcel);
  const observed = pending.then(x => {settled=true;return x;}, e => {settled=true;throw e;});
  observed.catch(() => {});
  try {
    await Promise.resolve();
    assert.deepEqual(started,['first','second','third']);
    gates[1].reject(new Error('second'));
    for(let i=0;i<8;i++) await Promise.resolve();
    assert.equal(settled,false,'collection must await remaining carriers');
    gates[2].resolve([rate()]);
    gates[0].reject(new Error('first'));
    const result = await observed;
    assert.deepEqual(result.failedCarrierIds,['first','second']);
    assert.equal(result.options[0].carrierId,'third');
  } finally {
    for (const gate of gates) gate.resolve([]);
    await Promise.allSettled([observed]);
  }
});
await group('policy-and-empty-success', async () => {
  const {DeliveryQuotes} = await load('quotes');
  const result = await new DeliveryQuotes([
    {id:'empty',async quote(){return [];}},
    {id:'invalid',async quote(){return [rate('',10),rate('x',-1),rate('x',2,0)];}},
    {id:'z',async quote(){return [rate('b',0,2),rate('a',0,1)];}},
    {id:'a',async quote(){return [rate('a',0,1)];}},
  ]).collect(parcel);
  assert.deepEqual(result.options.map(x => [x.carrierId,x.service]),[['a','a'],['z','a'],['z','b']]);
  assert.deepEqual(result.failedCarrierIds,[]);
  const empty = await new DeliveryQuotes([]).collect(parcel);
  assert.deepEqual(empty, {options:[], failedCarrierIds:[]});
});
await group('checkout-public-contract', async () => {
  const {DeliveryQuotes} = await load('quotes');
  const {Checkout} = await load('checkout');
  const checkout = new Checkout(new DeliveryQuotes([
    {id:'down',async quote(){throw 17;}},
    {id:'up',async quote(){return [rate('slow',1,5),rate('fast',20,1)];}},
  ]));
  const result = await checkout.delivery({parcel,maximumDays:2});
  assert.deepEqual(result.failedCarrierIds,['down']);
  assert.equal(result.recommended.service,'fast');
  assert.equal(result.message,'up fast: 1 day');
  const empty = await new Checkout(new DeliveryQuotes([
    {id:'down',quote(){throw null;}},
  ])).delivery({parcel});
  assert.equal(empty.recommended,null);
  assert.equal(empty.message,'No delivery options');
  assert.deepEqual(empty.failedCarrierIds,['down']);
  const filtered = await checkout.delivery({parcel,maximumDays:1});
  assert.equal(filtered.options.length,1);
  const noOptions = await new Checkout(new DeliveryQuotes([
    {id:'down',async quote(){throw new Error();}},
    {id:'slow',async quote(){return [rate('slow',1,5)];}},
  ])).delivery({parcel,maximumDays:1});
  assert.deepEqual(noOptions.failedCarrierIds,['down']);
  assert.equal(noOptions.recommended,null);
});
await group('validation-before-side-effects', async () => {
  const {DeliveryQuotes} = await load('quotes');
  const {Checkout} = await load('checkout');
  let calls=0;
  const q = new DeliveryQuotes([{id:'x',async quote(){calls++;return [];}}]);
  for(const p of [{...parcel,weightGrams:0},{...parcel,destination:' '}]) {
    await assert.rejects(q.collect(p),RangeError);
  }
  await assert.rejects(new Checkout(q).delivery({parcel,maximumDays:0}),RangeError);
  assert.equal(calls,0);
});
await group('result-and-parcel-ownership', async () => {
  const {DeliveryQuotes} = await load('quotes');
  const input = Object.freeze({...parcel});
  const owned = Object.freeze(rate());
  let calls=0;
  const q = new DeliveryQuotes([
    {id:'mutator',async quote(p){calls++;p.destination='changed';return [owned];}},
    {id:'observer',async quote(p){calls++;assert.equal(p.destination,parcel.destination);return [];}},
  ]);
  const one = await q.collect(input);
  one.options[0].service='edited';
  one.options.length=0;
  if(one.failedCarrierIds) one.failedCarrierIds.push('invented');
  const two=await q.collect(input);
  assert.equal(two.options[0].service,'standard');
  assert.equal(owned.service,'standard');
  assert.equal(input.destination,parcel.destination);
  assert.equal(calls,4);
  if(two.failedCarrierIds) assert.deepEqual(two.failedCarrierIds,[]);
});
console.log(JSON.stringify(results));

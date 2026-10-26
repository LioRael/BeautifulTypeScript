import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const results=[];
async function group(id, fn) {
 try { await fn(); results.push({id,pass:true}); }
 catch(e) { results.push({id,pass:false,evidence:e instanceof Error ? e.message : String(e)}); }
}
let mod;
try { mod=await import(pathToFileURL(resolve(process.argv[2], 'dist/preview-cache.js')).href); }
catch(e) { results.push({id:'load',pass:false,evidence:String(e)}); }

if(mod) {

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
const preview=n=>({documentId:'a',html:String(n),revision:n});
function setup(){const loads=[];const cache=new mod.PreviewCache(id=>{const d=deferred();loads.push({id,...d});return d.promise;});return {cache,loads};}
await group('dedup-and-independent-keys',async()=>{
 const {cache,loads}=setup();const a=cache.get('a'),b=cache.get('a'),c=cache.get('b');
 await Promise.resolve();assert.equal(loads.length,2);
 const p=preview(1);loads.find(x=>x.id==='a').resolve(p);loads.find(x=>x.id==='b').resolve(preview(2));
 assert.equal(await a,p);assert.equal(await b,p);await c;
 assert.equal(await cache.get('a'),p);assert.equal(loads.length,2);
});
await group('forgotten-success-does-not-repopulate',async()=>{
 const {cache,loads}=setup();const old=cache.get('a');await Promise.resolve();cache.invalidate('a');
 const fresh=cache.get('a');await Promise.resolve();loads[1].resolve(preview(2));await fresh;
 loads[0].resolve(preview(1));assert.equal((await old).revision,1);
 assert.equal((await cache.get('a')).revision,2);assert.equal(loads.length,2);
});
await group('forgotten-rejection-does-not-remove-new-work',async()=>{
 const {cache,loads}=setup();const old=cache.get('a');const reason={offline:true};
 const rejection=assert.rejects(old,e=>e===reason);await Promise.resolve();cache.invalidate('a');
 const fresh=cache.get('a');await Promise.resolve();loads[0].reject(reason);await rejection;
 const joined=cache.get('a');await Promise.resolve();assert.equal(loads.length,2);
 loads[1].resolve(preview(2));assert.equal((await fresh).revision,2);assert.equal((await joined).revision,2);
});
await group('clear-isolates-all-generations',async()=>{
 const {cache,loads}=setup();const oldA=cache.get('a'),oldB=cache.get('b');await Promise.resolve();cache.clear();
 loads[0].resolve(preview(1));loads[1].resolve(preview(1));await Promise.all([oldA,oldB]);
 const a=cache.get('a'),b=cache.get('b');await Promise.resolve();assert.equal(loads.length,4);
 loads[2].resolve(preview(2));loads[3].resolve(preview(2));await Promise.all([a,b]);
 cache.clear();const next=cache.get('a');await Promise.resolve();assert.equal(loads.length,5);loads[4].resolve(preview(3));await next;
});
await group('sync-throw-is-promise-rejection-and-retry',async()=>{
 const reason={code:'offline'};let calls=0;const cache=new mod.PreviewCache(()=>{calls++;throw reason;});
 let promise;assert.doesNotThrow(()=>{promise=cache.get('a')});assert.ok(promise instanceof Promise);
 await assert.rejects(promise,e=>e===reason);await assert.rejects(cache.get('a'),e=>e===reason);assert.equal(calls,2);
});
await group('ordinary-rejection-and-invalidate-scope',async()=>{
 let calls=0;const reason=new Error('offline');const cache=new mod.PreviewCache(async id=>{calls++;if(calls===1)throw reason;return {...preview(calls),documentId:id};});
 await assert.rejects(cache.get('a'),e=>e===reason);await cache.get('a');const b=await cache.get('b');cache.invalidate('a');assert.equal(await cache.get('b'),b);await cache.get('a');assert.equal(calls,4);
});

}
console.log(JSON.stringify(results));

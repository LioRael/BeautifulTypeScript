import test from 'node:test';
import assert from 'node:assert/strict';
import { PreviewCache, renderDocument } from '../dist/preview-cache.js';
test('successful loads are reused until invalidated', async () => {
 let calls=0;
 const cache=new PreviewCache(async id=>({documentId:id,html:`<p>${++calls}</p>`,revision:calls}));
 assert.equal(await renderDocument(cache,'a'),'<p>1</p>');
 assert.equal(await renderDocument(cache,'a'),'<p>1</p>');
 cache.invalidate('a');
 assert.equal(await renderDocument(cache,'a'),'<p>2</p>');
});
test('rejected loads can be retried', async () => {
 const reason=new Error('offline'); let calls=0;
 const cache=new PreviewCache(async id=>{if(++calls===1) throw reason; return {documentId:id,html:'ok',revision:2};});
 await assert.rejects(cache.get('a'),e=>e===reason);
 assert.equal((await cache.get('a')).html,'ok');
});

function deferred() {
 let resolve, reject;
 const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
 return { promise, resolve, reject };
}

function preview(id, revision) {
 return { documentId: id, html: `<p>${revision}</p>`, revision };
}

test('concurrent requests share a load, while different keys load independently', async () => {
 const loads = new Map([['a', deferred()], ['b', deferred()]]);
 const calls = [];
 const cache = new PreviewCache(id => { calls.push(id); return loads.get(id).promise; });
 const first = cache.get('a');
 const second = cache.get('a');
 const other = cache.get('b');
 await Promise.resolve();
 assert.deepEqual(calls, ['a', 'b']);
 const a = preview('a', 1), b = preview('b', 1);
 loads.get('a').resolve(a);
 loads.get('b').resolve(b);
 assert.equal(await first, a);
 assert.equal(await second, a);
 assert.equal(await other, b);
 assert.equal(await cache.get('a'), a);
 assert.deepEqual(calls, ['a', 'b']);
});

test('synchronous throws return rejected promises with the exact reason and allow retry', async () => {
 const reason = { message: 'synchronous failure' };
 const value = preview('a', 2);
 let calls = 0;
 const cache = new PreviewCache(() => {
  if (++calls === 1) throw reason;
  return Promise.resolve(value);
 });
 let first;
 assert.doesNotThrow(() => { first = cache.get('a'); });
 const second = cache.get('a');
 await Promise.all([
  assert.rejects(first, error => error === reason),
  assert.rejects(second, error => error === reason),
 ]);
 assert.equal(calls, 1);
 assert.equal(await cache.get('a'), value);
 assert.equal(calls, 2);
});

for (const reset of ['invalidate', 'clear']) {
 for (const outcome of ['resolve', 'reject']) {
  for (const oldFirst of [true, false]) {
   test(`${reset}: forgotten ${outcome} ${oldFirst ? 'before' : 'after'} fresh completion cannot change current work`, async () => {
    const old = deferred(), fresh = deferred();
    let calls = 0;
    const cache = new PreviewCache(() => (++calls === 1 ? old.promise : fresh.promise));
    const oldRequest = cache.get('a');
    await Promise.resolve();
    cache[reset]('a');
    const freshRequest = cache.get('a');
    await Promise.resolve();
    const oldValue = preview('a', 1), freshValue = preview('a', 2);
    const reason = { message: 'forgotten failure' };
    const oldResult = outcome === 'reject'
     ? assert.rejects(oldRequest, error => error === reason)
     : oldRequest.then(value => assert.equal(value, oldValue));
    const finishOld = async () => {
     old[outcome](outcome === 'resolve' ? oldValue : reason);
     await oldResult;
    };
    if (oldFirst) await finishOld();
    else {
     fresh.resolve(freshValue);
     assert.equal(await freshRequest, freshValue);
     await finishOld();
    }
    const joined = cache.get('a');
    if (oldFirst) fresh.resolve(freshValue);
    assert.equal(await freshRequest, freshValue);
    assert.equal(await joined, freshValue);
    assert.equal(await cache.get('a'), freshValue);
    assert.equal(calls, 2);
   });
  }
 }
}

test('invalidate preserves other keys and clear forgets all cached keys', async () => {
 let calls = 0;
 const cache = new PreviewCache(async id => preview(id, ++calls));
 await cache.get('a');
 const b = await cache.get('b');
 cache.invalidate('a');
 assert.equal(await cache.get('b'), b);
 await cache.get('a');
 assert.equal(calls, 3);
 cache.clear();
 await Promise.all([cache.get('a'), cache.get('b')]);
 assert.equal(calls, 5);
});

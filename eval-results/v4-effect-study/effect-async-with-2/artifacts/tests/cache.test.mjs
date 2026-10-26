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
 const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
 return { promise, resolve, reject };
}

function preview(documentId, revision) {
 return { documentId, html: `<p>${revision}</p>`, revision };
}

test('concurrent requests share a load and different keys load independently', async () => {
 const loads = new Map();
 const calls = [];
 const cache = new PreviewCache(id => {
  calls.push(id);
  const load = deferred();
  loads.set(id, load);
  return load.promise;
 });
 const a = cache.get('a');
 const anotherA = cache.get('a');
 const b = cache.get('b');
 await Promise.resolve();
 assert.deepEqual(calls, ['a', 'b']);
 const resultA = preview('a', 1);
 const resultB = preview('b', 2);
 loads.get('b').resolve(resultB);
 assert.equal(await b, resultB);
 loads.get('a').resolve(resultA);
 assert.equal(await a, resultA);
 assert.equal(await anotherA, resultA);
 assert.equal(await cache.get('a'), resultA);
 assert.deepEqual(calls, ['a', 'b']);
});

test('synchronous throws become rejections with the exact reason and allow retry', async () => {
 const reason = { message: 'offline' };
 let calls = 0;
 const result = preview('a', 2);
 const cache = new PreviewCache(() => {
  if (++calls === 1) throw reason;
  return Promise.resolve(result);
 });
 let request;
 assert.doesNotThrow(() => { request = cache.get('a'); });
 assert.ok(request instanceof Promise);
 const concurrent = cache.get('a');
 await Promise.all([
  assert.rejects(request, error => error === reason),
  assert.rejects(concurrent, error => error === reason),
 ]);
 assert.equal(calls, 1);
 assert.equal(await cache.get('a'), result);
 assert.equal(calls, 2);
});

for (const reset of ['invalidate', 'clear']) {
 for (const outcome of ['resolve', 'reject']) {
  for (const oldFirst of [true, false]) {
   test(`${reset}: forgotten ${outcome} settles ${oldFirst ? 'before' : 'after'} the new load`, async () => {
    const oldLoad = deferred();
    const newLoad = deferred();
    let calls = 0;
    const cache = new PreviewCache(() => (++calls === 1 ? oldLoad : newLoad).promise);
    const oldRequest = cache.get('a');
    const oldResult = preview('a', 1);
    const newResult = preview('a', 2);
    const reason = { message: 'old load failed' };
    const oldObserved = outcome === 'reject'
     ? assert.rejects(oldRequest, error => error === reason)
     : oldRequest.then(result => assert.equal(result, oldResult));
    // Ensure invalidation overlaps an invoked, unfinished loader.
    await Promise.resolve();
    cache[reset]('a');
    const newRequest = cache.get('a');
    const settleOld = async () => {
     oldLoad[outcome](outcome === 'resolve' ? oldResult : reason);
     await oldObserved;
    };
    if (oldFirst) await settleOld();
    else {
     newLoad.resolve(newResult);
     assert.equal(await newRequest, newResult);
     await settleOld();
    }
    const repeated = cache.get('a');
    newLoad.resolve(newResult);
    assert.equal(await newRequest, newResult);
    assert.equal(await repeated, newResult);
    assert.equal(await cache.get('a'), newResult);
    assert.equal(calls, 2);
   });
  }
 }
}

test('invalidate preserves other keys and clear forgets all cached and pending keys', async () => {
 let calls = 0;
 const cache = new PreviewCache(async id => preview(id, ++calls));
 const a = await cache.get('a');
 const b = await cache.get('b');
 cache.invalidate('a');
 assert.equal(await cache.get('b'), b);
 assert.notEqual(await cache.get('a'), a);
 const pendingA = cache.get('pending-a');
 const pendingB = cache.get('pending-b');
 cache.clear();
 await Promise.all([pendingA, pendingB]);
 await Promise.all(['a', 'b', 'pending-a', 'pending-b'].map(id => cache.get(id)));
 assert.equal(calls, 9);
});

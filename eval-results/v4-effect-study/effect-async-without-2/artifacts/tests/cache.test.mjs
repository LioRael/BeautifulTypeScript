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
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function preview(id, revision) {
  return { documentId: id, html: `<p>${revision}</p>`, revision };
}

test('concurrent callers share a load while different keys load independently', async () => {
  const loads = new Map();
  const cache = new PreviewCache(id => {
    assert.equal(loads.has(id), false);
    const work = deferred();
    loads.set(id, work);
    return work.promise;
  });
  const first = cache.get('a');
  const second = cache.get('a');
  const other = cache.get('b');
  await Promise.resolve();
  assert.equal(loads.size, 2);
  const a = preview('a', 1);
  const b = preview('b', 1);
  loads.get('b').resolve(b);
  assert.equal(await other, b);
  loads.get('a').resolve(a);
  assert.equal(await first, a);
  assert.equal(await second, a);
  assert.equal(await cache.get('a'), a);
});

test('synchronous throws become promise rejections with the exact reason and allow retry', async () => {
  const reason = { failure: 'synchronous' };
  let calls = 0;
  const value = preview('a', 2);
  const cache = new PreviewCache(() => {
    if (++calls === 1) throw reason;
    return Promise.resolve(value);
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
  assert.equal(await cache.get('a'), value);
  assert.equal(calls, 2);
});

for (const reset of ['invalidate', 'clear']) {
  for (const outcome of ['resolve', 'reject']) {
    for (const order of ['old-first', 'new-first']) {
      test(`${reset}: forgotten ${outcome} (${order}) cannot affect replacement`, async () => {
        const old = deferred();
        const fresh = deferred();
        let calls = 0;
        const cache = new PreviewCache(() => (++calls === 1 ? old.promise : fresh.promise));
        const original = cache.get('a');
        const reason = { failure: 'forgotten' };
        const oldValue = preview('a', 1);
        const newValue = preview('a', 2);
        // Attach a rejection observer before settling either generation.
        const observed = outcome === 'reject'
          ? assert.rejects(original, error => error === reason)
          : original.then(value => assert.equal(value, oldValue));
        await Promise.resolve();
        if (reset === 'clear') cache.clear();
        else cache.invalidate('a');
        const replacement = cache.get('a');
        await Promise.resolve();
        assert.equal(calls, 2);
        const settleOld = async () => {
          if (outcome === 'reject') old.reject(reason);
          else old.resolve(oldValue);
          await observed;
        };
        if (order === 'old-first') {
          await settleOld();
          const concurrent = cache.get('a');
          await Promise.resolve();
          assert.equal(calls, 2);
          fresh.resolve(newValue);
          assert.equal(await concurrent, newValue);
        } else {
          fresh.resolve(newValue);
          assert.equal(await replacement, newValue);
          await settleOld();
        }
        assert.equal(await replacement, newValue);
        assert.equal(await cache.get('a'), newValue);
        assert.equal(calls, 2);
      });
    }
  }
}

test('clear forgets cached values and in-flight work across all keys', async () => {
  const forgotten = deferred();
  const calls = [];
  const cache = new PreviewCache(id => {
    calls.push(id);
    if (id === 'b' && calls.length === 2) return forgotten.promise;
    return Promise.resolve(preview(id, calls.length));
  });
  await cache.get('a');
  const oldB = cache.get('b');
  await Promise.resolve();
  cache.clear();
  const newA = await cache.get('a');
  const newB = await cache.get('b');
  forgotten.resolve(preview('b', 0));
  assert.equal((await oldB).revision, 0);
  assert.equal(await cache.get('a'), newA);
  assert.equal(await cache.get('b'), newB);
  assert.deepEqual(calls, ['a', 'b', 'a', 'b']);
});

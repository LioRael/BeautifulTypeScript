import test from 'node:test';
import assert from 'node:assert/strict';
import { PreviewCache, renderDocument } from '../dist/preview-cache.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function preview(documentId, revision) {
  return { documentId, html: `<p>${revision}</p>`, revision };
}

test('concurrent callers share loads while different keys load independently', async () => {
  const loads = new Map([['a', deferred()], ['b', deferred()]]);
  const calls = [];
  const cache = new PreviewCache(id => {
    calls.push(id);
    return loads.get(id).promise;
  });
  const a = cache.get('a');
  const anotherA = cache.get('a');
  const b = cache.get('b');
  await Promise.resolve();
  assert.deepEqual(calls, ['a', 'b']);
  const valueA = preview('a', 1);
  const valueB = preview('b', 1);
  loads.get('b').resolve(valueB);
  assert.equal(await b, valueB);
  loads.get('a').resolve(valueA);
  assert.equal(await a, valueA);
  assert.equal(await anotherA, valueA);
  assert.equal(await cache.get('a'), valueA);
  assert.deepEqual(calls, ['a', 'b']);
});

for (const synchronous of [false, true]) {
  test(`${synchronous ? 'synchronous throws' : 'promise rejections'} preserve reasons and permit retries`, async () => {
    const reason = { failure: 'offline' };
    const value = preview('a', 2);
    let calls = 0;
    const cache = new PreviewCache(() => {
      if (++calls > 1) return Promise.resolve(value);
      if (synchronous) throw reason;
      return Promise.reject(reason);
    });
    let first;
    assert.doesNotThrow(() => { first = cache.get('a'); });
    assert.ok(first instanceof Promise);
    const second = cache.get('a');
    await Promise.all([
      assert.rejects(first, error => error === reason),
      assert.rejects(second, error => error === reason),
    ]);
    assert.equal(calls, 1);
    assert.equal(await cache.get('a'), value);
    assert.equal(calls, 2);
  });
}

for (const operation of ['invalidate', 'clear']) {
  for (const fails of [false, true]) {
    for (const oldFirst of [false, true]) {
      test(`${operation}: forgotten ${fails ? 'failure' : 'success'} settles ${oldFirst ? 'before' : 'after'} replacement`, async () => {
        const oldLoad = deferred();
        const newLoad = deferred();
        const oldValue = preview('a', 1);
        const newValue = preview('a', 2);
        const reason = { failure: 'old load' };
        let calls = 0;
        const cache = new PreviewCache(() => (++calls === 1 ? oldLoad : newLoad).promise);
        const oldRequest = cache.get('a');
        const oldResult = fails
          ? assert.rejects(oldRequest, error => error === reason)
          : oldRequest.then(value => assert.equal(value, oldValue));
        cache[operation]('a');
        const newRequest = cache.get('a');
        const settleOld = async () => {
          if (fails) oldLoad.reject(reason);
          else oldLoad.resolve(oldValue);
          await oldResult;
        };
        if (oldFirst) {
          await settleOld();
          const concurrent = cache.get('a');
          await Promise.resolve();
          assert.equal(calls, 2);
          newLoad.resolve(newValue);
          assert.equal(await concurrent, newValue);
        } else {
          newLoad.resolve(newValue);
          assert.equal(await newRequest, newValue);
          await settleOld();
        }
        assert.equal(await newRequest, newValue);
        assert.equal(await cache.get('a'), newValue);
        assert.equal(calls, 2);
      });
    }
  }
}

test('invalidate is per key and clear forgets all cached and pending keys', async () => {
  const pending = deferred();
  const calls = [];
  const cache = new PreviewCache(id => {
    calls.push(id);
    return id === 'pending' && calls.filter(key => key === id).length === 1
      ? pending.promise
      : Promise.resolve(preview(id, calls.length));
  });
  const a = await cache.get('a');
  const b = await cache.get('b');
  const oldPending = cache.get('pending');
  await Promise.resolve();
  cache.invalidate('a');
  assert.equal(await cache.get('b'), b);
  assert.notEqual(await cache.get('a'), a);
  cache.clear();
  assert.notEqual(await cache.get('b'), b);
  const fresh = await cache.get('pending');
  pending.resolve(preview('pending', 0));
  await oldPending;
  assert.equal(await cache.get('pending'), fresh);
  assert.deepEqual(calls, ['a', 'b', 'pending', 'a', 'b', 'pending']);
});
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

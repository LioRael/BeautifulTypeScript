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

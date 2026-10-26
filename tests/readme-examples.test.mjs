import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const snippets = [...readFileSync('README.md', 'utf8').matchAll(/^```ts\r?\n([\s\S]*?)^```\s*$/gm)];
const modules = await Promise.all(snippets.map(async ([, code]) => {
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}));

test('README search refactor preserves the same contract on both sides', () => {
  const versions = modules.filter(m => m.firstActiveName);
  assert.equal(versions.length, 2);
  for (const { firstActiveName } of versions) {
    assert.equal(firstActiveName([]), undefined);
    assert.equal(firstActiveName([{ name: 'inactive', active: false }]), undefined);
    const input = Object.freeze([
      Object.freeze({ name: 'inactive', active: false }),
      Object.freeze({ name: '', active: true }),
      Object.freeze({ name: 'later', active: true }),
    ]);
    assert.equal(firstActiveName(input), '');
    assert.equal(firstActiveName([{ name: 'first', active: true }]), 'first');
  }
});

test('README async fix waits, propagates the original error, and stops later writes', async () => {
  const versions = modules.filter(m => m.saveAll);
  assert.equal(versions.length, 2);
  const { saveAll } = versions[1];
  const started = [];
  const failure = new Error('write failed');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const work = saveAll([1, 2, 3], async item => {
    started.push(item);
    if (item === 1) await gate;
    if (item === 2) throw failure;
  });
  assert.deepEqual(started, [1]);
  const rejected = assert.rejects(work, error => error === failure);
  release();
  await rejected;
  assert.deepEqual(started, [1, 2]);
});

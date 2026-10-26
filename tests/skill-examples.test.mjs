import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const file = 'skills/typescript-best-practices/assets/patterns.ts';
const source = readFileSync(file, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { parsePageOptions, saveInOrder } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('bundled skill patterns typecheck under strict optional/indexed settings', () => {
  const program = ts.createProgram([file], {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true,
    noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noEmit: true,
    types: [], lib: ['lib.es2022.d.ts'],
  });
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
});

test('boundary example preserves valid empty/zero values and rejects invalid present fields', () => {
  const input = Object.freeze({ cursor: '', limit: 0 });
  assert.deepEqual(parsePageOptions(input), { cursor: '', limit: 0 });
  assert.notEqual(parsePageOptions(input), input);
  assert.deepEqual(parsePageOptions({}), { cursor: null, limit: 20 });
  for (const value of [null, [], { cursor: 4 }, { limit: null }, { limit: undefined }, { limit: 0.5 }, { limit: 101 }]) {
    assert.throws(() => parsePageOptions(value), TypeError);
  }
});

test('sequential example waits and stops later side effects after rejection', async () => {
  const calls = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const failure = new Error('save failed');
  const work = saveInOrder([1, 2, 3], async value => {
    calls.push(value);
    if (value === 1) await gate;
    if (value === 2) throw failure;
  });
  assert.deepEqual(calls, [1]);
  const rejected = assert.rejects(work, error => error === failure);
  release();
  await rejected;
  assert.deepEqual(calls, [1, 2]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const read = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
assert.equal(read.error, undefined);
const config = ts.parseJsonConfigFileContent(read.config, ts.sys, '.');
assert.deepEqual(config.errors, []);
function diagnostics(file) {
  const { outDir, rootDir, declaration, ...options } = config.options;
  const program = ts.createProgram([file], { ...options, noEmit: true });
  return ts.getPreEmitDiagnostics(program);
}
test('strict/indexed/optional checks reject bad types', () => {
  const errors = diagnostics('fixtures/types/bad.ts');
  assert.deepEqual(errors.map(e => [e.file.getLineAndCharacterOfPosition(e.start).line + 1, e.code]), [[1,2322], [2,2375], [3,2322]]);
});
test('good types and built declaration consumer compile', () => {
  for (const file of ['fixtures/types/good.ts', 'fixtures/consumer/index.ts']) {
    const errors = diagnostics(file);
    assert.deepEqual(errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')), []);
  }
});

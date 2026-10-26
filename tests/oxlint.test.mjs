import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function lint(config, file) {
  const result = spawnSync(process.execPath, [
    'node_modules/oxlint/bin/oxlint', '-c', config, file,
    '--format', 'json', '--max-warnings', '0',
  ], { encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  const report = JSON.parse(result.stdout);
  assert.equal(report.number_of_files, 1, 'fixture must actually be linted');
  return { status: result.status, diagnostics: report.diagnostics };
}

for (const [name, config, directory, expected] of [
  ['syntax', 'configs/oxlint.json', 'fixtures/oxlint', [[2, 'eslint(eqeqeq)']]],
  ['typed', 'configs/oxlint.typed.json', 'fixtures/lint', [
    [2, 'typescript(no-floating-promises)'],
    [5, 'typescript(no-misused-promises)'],
    [8, 'typescript(no-floating-promises)'],
  ]],
]) {
  test(`Oxlint ${name} recipe reports intended rules and accepts the fix`, () => {
    const bad = lint(config, `${directory}/bad.ts`);
    assert.equal(bad.status, 1);
    assert.deepEqual(bad.diagnostics.map(d => [d.labels[0].span.line, d.code])
      .sort((a, b) => a[0] - b[0]), expected);
    const good = lint(config, `${directory}/good.ts`);
    assert.equal(good.status, 0);
    assert.deepEqual(good.diagnostics, []);
  });
}

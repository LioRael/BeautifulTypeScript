import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
test('standalone install and overwrite protection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'beautiful-ts-'));
  try {
    for (const name of ['typescript-best-practices', 'typescript-review', 'typescript-port', 'typescript-verify']) {
      execFileSync(process.execPath, ['scripts/install.mjs', name, dir]);
      assert.match(readFileSync(join(dir, name, 'SKILL.md'), 'utf8'), new RegExp(`name: ${name}`));
      assert.ok(readFileSync(join(dir, name, 'references/sources.md'), 'utf8').length > 0);
      assert.notEqual(spawnSync(process.execPath, ['scripts/install.mjs', name, dir]).status, 0);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

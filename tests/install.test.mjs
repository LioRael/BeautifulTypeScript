import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
test('standalone install and overwrite protection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'beautiful-ts-'));
  try {
    for (const name of ['typescript-best-practices', 'typescript-review', 'typescript-port', 'typescript-verify']) {
      execFileSync(process.execPath, ['scripts/install.mjs', name, dir]);
      assert.match(readFileSync(join(dir, name, 'SKILL.md'), 'utf8'), new RegExp(`name: ${name}`));
      function verifyTree(source, installed) {
        for (const entry of readdirSync(source, { withFileTypes: true })) {
          const from = join(source, entry.name);
          const to = join(installed, entry.name);
          if (entry.isDirectory()) verifyTree(from, to);
          else assert.equal(readFileSync(to, 'utf8'), readFileSync(from, 'utf8'), from);
        }
      }
      verifyTree(join('skills', name), join(dir, name));
      assert.ok(existsSync(join(dir, name, 'evals')));
      assert.notEqual(spawnSync(process.execPath, ['scripts/install.mjs', name, dir]).status, 0);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

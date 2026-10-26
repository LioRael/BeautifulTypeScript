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
      const references = readdirSync(join('skills', name, 'references'));
      assert.ok(references.length > 0);
      for (const file of references) {
        assert.equal(readFileSync(join(dir, name, 'references', file), 'utf8'),
          readFileSync(join('skills', name, 'references', file), 'utf8'));
      }
      const assets = join('skills', name, 'assets');
      if (existsSync(assets)) {
        for (const file of readdirSync(assets)) {
          assert.equal(readFileSync(join(dir, name, 'assets', file), 'utf8'),
            readFileSync(join(assets, file), 'utf8'));
        }
      }
      assert.notEqual(spawnSync(process.execPath, ['scripts/install.mjs', name, dir]).status, 0);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

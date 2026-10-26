import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const examples = [];
const readme = readFileSync('README.md', 'utf8');
for (const match of readme.matchAll(/^```ts\r?\n([\s\S]*?)^```\s*$/gm)) {
  examples.push({ name: 'README.md:' + readme.slice(0, match.index).split('\n').length, code: match[1] });
}
for (const skill of readdirSync('skills')) {
  const directory = join('skills', skill, 'references');
  const documents = [join('skills', skill, 'SKILL.md'),
    ...readdirSync(directory).filter(name => name.endsWith('.md')).map(file => join(directory, file))];
  for (const path of documents) {
    for (const match of readFileSync(path, 'utf8').matchAll(/^```ts\r?\n([\s\S]*?)^```\s*$/gm)) {
      const line = readFileSync(path, 'utf8').slice(0, match.index).split('\n').length;
      examples.push({ name: `${path}:${line}`, code: match[1] });
    }
  }
}

test('README, skill and reference TypeScript examples compile, including expected type errors', () => {
  assert.ok(examples.length > 0, 'No examples discovered');
  const directory = mkdtempSync(join(tmpdir(), 'beautiful-ts-references-'));
  try {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    const files = examples.map((example, index) => {
      const file = `example-${index}.ts`;
      writeFileSync(join(directory, file), `export {};\n${example.code}`);
      return file;
    });
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
        strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
        types: [], lib: ['ES2022', 'DOM'], outDir: 'dist',
      }, files,
    }));
    try {
      execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', join(directory, 'tsconfig.json')], { stdio: 'pipe' });
    } catch (error) {
      const diagnostics = String(error.stdout).replace(/example-(\d+)\.ts/g, (_, index) => examples[Number(index)].name);
      assert.fail(diagnostics || error.message);
    }
    for (const [index, example] of examples.entries()) {
      if (!example.code.includes('// @example-run')) continue;
      assert.doesNotThrow(() => execFileSync(process.execPath, [join(directory, 'dist', `example-${index}.js`)], { stdio: 'pipe', timeout: 5000 }), example.name);
    }
    console.log(`README/skill/reference examples: ${examples.length} compiled; ${examples.filter(e => e.code.includes('// @example-run')).length} executed`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

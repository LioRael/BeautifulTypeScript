import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('skills');
const names = ['typescript-best-practices', 'typescript-review', 'typescript-port', 'typescript-verify'];
const source = readFileSync('docs/SOURCES.md', 'utf8');
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)]); }
for (const name of names) {
  const dir = resolve(root, name);
  const text = readFileSync(resolve(dir, 'SKILL.md'), 'utf8');
  assert.match(text, new RegExp(`^---\nname: ${name}\ndescription: [^\n]+\n---\n`));
  assert.ok(text.split('\n').length < 250, `${name}: keep the entrypoint small`);
  assert.equal(readFileSync(resolve(dir, 'references/sources.md'), 'utf8'), source);
  for (const file of walk(dir).filter(f => f.endsWith('.md'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1];
      if (/^https?:/.test(link) || link.startsWith('#')) continue;
      const target = resolve(dirname(file), link.split('#')[0]);
      assert.ok(!relative(dir, target).startsWith(`..${sep}`), `${name}: dependency outside skill`);
      assert.ok(existsSync(target), `broken link: ${file}: ${link}`);
    }
  }
}
console.log('4 standalone skills: frontmatter, local links and source-reference parity passed');

for (const file of ['README.md', 'CONTRIBUTING.md', ...walk(resolve('docs')), ...walk(resolve('configs')), ...walk(resolve('examples'))].filter(f => f.endsWith('.md'))) {
  for (const [, link] of readFileSync(file, 'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(link) || link.startsWith('#')) continue;
    assert.ok(existsSync(resolve(dirname(file), link.split('#')[0])), `broken documentation link: ${file}: ${link}`);
  }
}
console.log('Repository Markdown file links passed (external URLs/anchors not checked)');

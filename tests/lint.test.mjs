import test from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

test('typed rules fire at expected lines and good counterpart is clean', async () => {
  const eslint = new ESLint();
  const [bad] = await eslint.lintFiles(['fixtures/lint/bad.ts']);
  assert.deepEqual(bad.messages.map(m => [m.line, m.ruleId]), [
    [2, '@typescript-eslint/no-floating-promises'],
    [5, '@typescript-eslint/no-misused-promises'],
    [8, '@typescript-eslint/no-floating-promises'],
  ]);
  const [good] = await eslint.lintFiles(['fixtures/lint/good.ts']);
  assert.deepEqual(good.messages, []);
});

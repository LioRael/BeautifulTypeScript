import test from 'node:test';
import assert from 'node:assert/strict';
import { firstActiveName, pageSize } from '../dist/selection.js';

test('first active name, absence, empty names and input ownership', () => {
  assert.equal(firstActiveName([]), undefined);
  assert.equal(firstActiveName([{ name: 'hidden', active: false }]), undefined);
  const members = Object.freeze([
    Object.freeze({ name: 'hidden', active: false }),
    Object.freeze({ name: '', active: true }),
    Object.freeze({ name: 'later', active: true }),
  ]);
  assert.equal(firstActiveName(members), '');
  assert.equal(firstActiveName([{ name: 'visible', active: true }]), 'visible');
});
test('page size defaults only when omitted', () => {
  assert.equal(pageSize({}), 20);
  for (const limit of [0, 1, -1, 20, 100]) assert.equal(pageSize({ limit }), limit);
});

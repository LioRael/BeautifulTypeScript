import test from 'node:test';
import assert from 'node:assert/strict';
import { readLimit } from '../dist/queue.js';
test('default limit', () => assert.equal(readLimit(), 3));

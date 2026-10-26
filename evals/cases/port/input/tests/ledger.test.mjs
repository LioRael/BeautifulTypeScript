import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../dist/ledger.js';
test('empty', () => assert.deepEqual(summarize([]), []));

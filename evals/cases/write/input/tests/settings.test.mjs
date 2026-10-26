import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings } from '../dist/settings.js';
test('defaults', () => assert.deepEqual(parseSettings({ endpoint: '/api' }), { endpoint: '/api', retries: 3, enabled: true }));

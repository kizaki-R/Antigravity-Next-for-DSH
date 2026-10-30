#!/usr/bin/env node
import assert from 'node:assert/strict';
import { MODELS, ROUTING, RUNTIME_MAX_TOKENS } from '../lib/constants.js';
import { migrateArgonVisibility, MODEL_VISIBILITY_VERSION } from '../lib/model-visibility.js';
import { quotaBucketMatchesFamily, quotaFamilyForModel } from '../lib/model-family.js';

const argon = MODELS.find((model) => model.id === 'gemini-4-argon');
assert.ok(argon, 'Argon is present in the picker catalog');
assert.equal(argon.name, 'Gemini 4 Argon');
assert.equal(argon.ctx, 1048576);
assert.equal(argon.max, 65536);
assert.deepEqual(argon.efforts, ['low', 'medium', 'high']);
assert.deepEqual(ROUTING['gemini-4-argon'], {
  off: 'gemini-4-argon-low',
  minimal: 'gemini-4-argon-low',
  low: 'gemini-4-argon-low',
  medium: 'gemini-4-argon-medium',
  high: 'gemini-4-argon-high',
  xhigh: 'gemini-4-argon-high',
});
for (const level of ['low', 'medium', 'high']) {
  assert.equal(RUNTIME_MAX_TOKENS[`gemini-4-argon-${level}`], 65536);
}
assert.equal(quotaFamilyForModel('gemini-4-argon'), 'argon');
assert.equal(quotaFamilyForModel('gemini-3.8-flash'), 'gemini');
assert.equal(quotaBucketMatchesFamily('argon', 'gemini-argon-wtu-weekly'), true);
assert.equal(quotaBucketMatchesFamily('argon', 'gemini-models-weekly'), false);
assert.equal(quotaBucketMatchesFamily('gemini', 'gemini-models-weekly'), true);
assert.equal(quotaBucketMatchesFamily('gemini', 'gemini-argon-wtu-weekly'), false);

const legacy = { visibleModels: ['gemini-3.8-flash', 'claude-sonnet-5-5'] };
assert.equal(migrateArgonVisibility(legacy), true);
assert.deepEqual(legacy.visibleModels, ['gemini-3.8-flash', 'claude-sonnet-5-5', 'gemini-4-argon']);
assert.equal(legacy.modelVisibilityVersion, MODEL_VISIBILITY_VERSION);
assert.equal(migrateArgonVisibility(legacy), false, 'migration runs once');
legacy.visibleModels = ['gemini-3.8-flash']; // User subsequently hides Argon.
assert.equal(migrateArgonVisibility(legacy), false);
assert.deepEqual(legacy.visibleModels, ['gemini-3.8-flash']);

const emptyBook = { visibleModels: [] };
assert.equal(migrateArgonVisibility(emptyBook), true);
assert.deepEqual(emptyBook.visibleModels, ['gemini-4-argon']);

console.log('PASS: Argon model catalog, effort routes, token limits, one-time visibility migration');

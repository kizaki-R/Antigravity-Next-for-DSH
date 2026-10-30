#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolveDynamicLimits } from '../lib/dynamic-models.js';
import { MODELS } from '../lib/constants.js';

// 1. Pro tier upstream metadata mock
const proUpstream = {
  'claude-sonnet-5-5-medium': { maxTokens: 1000000, maxOutputTokens: 128000 },
  'claude-opus-5-5-medium': { maxTokens: 1000000, maxOutputTokens: 128000 },
  'gpt-oss-120b-medium': { maxTokens: 131072, maxOutputTokens: 32768 },
  'gemini-3.8-flash-tiered': { maxTokens: 1048576, maxOutputTokens: 65536 },
  'gemini-4-argon-medium': { maxTokens: 1048576, maxOutputTokens: 65536 },
};

const sonnetPro = resolveDynamicLimits('claude-sonnet-5-5', proUpstream);
assert.equal(sonnetPro.ctx, 1000000, 'Claude Sonnet 5.5 on Pro gets 1M dynamic context');
assert.equal(sonnetPro.max, 128000, 'Claude Sonnet 5.5 on Pro gets 128k output ceiling');

const gptPro = resolveDynamicLimits('gpt-oss-120b', proUpstream);
assert.equal(gptPro.ctx, 131072, 'GPT-OSS gets upstream 131k limit');
assert.equal(gptPro.max, 32768);

// 2. Standard tier upstream metadata mock (no 5.5, has 4.6)
const standardUpstream = {
  'claude-sonnet-4-6': { maxTokens: 250000, maxOutputTokens: 64000 },
  'claude-opus-4-6-thinking': { maxTokens: 250000, maxOutputTokens: 64000 },
  'gpt-oss-120b-medium': { maxTokens: 131072, maxOutputTokens: 32768 },
};

const sonnetStandard = resolveDynamicLimits('claude-sonnet-4-6', standardUpstream);
assert.equal(sonnetStandard.ctx, 250000, 'Claude Sonnet 4.6 on Standard gets 250k dynamic context');
assert.equal(sonnetStandard.max, 64000);

// 3. Fallback when upstream is missing/null/offline
assert.equal(resolveDynamicLimits('claude-sonnet-5-5', null), null);
assert.equal(resolveDynamicLimits('claude-sonnet-5-5', {}), null);

console.log('PASS: Dynamic upstream model limits discovery, tier-aware mapping, offline fallback');

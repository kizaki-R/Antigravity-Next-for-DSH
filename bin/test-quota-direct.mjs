#!/usr/bin/env node
import assert from 'node:assert/strict';
import { USER_AGENT, PRODUCT_VERSION } from '../lib/constants.js';
import { retrieveUserQuotaSummary } from '../lib/client.js';

assert.match(USER_AGENT, /^antigravity\/hub\/[\d.]+ \(aidev_client; os_type=[a-z]+; arch=[a-z0-9]+\)$/);
assert.ok(USER_AGENT.includes(`/hub/${PRODUCT_VERSION} `));
const previousFetch = globalThis.fetch;
const calls = [];
const groups = [{displayName:'Gemini 4 Argon',buckets:[{bucketId:'gemini-argon-wtu-weekly',window:'weekly',remainingFraction:0.62,resetTime:'2026-10-30T01:33:02Z'}]}];
try {
 globalThis.fetch = async (url, options) => {
  calls.push({url, options});
  return new Response(JSON.stringify({groups}), {status:200,headers:{'content-type':'application/json'}});
 };
 for(const token of ['test-account-a', 'test-account-b']) {
  const result = await retrieveUserQuotaSummary(token);
  assert.deepEqual(result.groups, groups);
 }
 assert.equal(calls.length,2);
 for(const [i,call] of calls.entries()) {
  assert.equal(new URL(call.url).hostname,'daily-cloudcode-pa.googleapis.com');
  assert.equal(call.options.headers['User-Agent'],USER_AGENT);
  assert.equal(call.options.headers.Authorization,`Bearer test-account-${i===0?'a':'b'}`);
  assert.equal(call.options.body,'{}');
  assert.equal(call.options.method,'POST');
 }
 console.log('PASS: official hub UA, independent account OAuth, direct Google quota, no local App RPC');
} finally { globalThis.fetch=previousFetch; }

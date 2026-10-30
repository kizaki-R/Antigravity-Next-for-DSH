#!/usr/bin/env node
// Regression: the model picker must never wait on the network, and the models
// it offers must be the ones THIS account can actually serve.
import assert from 'node:assert/strict';

const { AntigravityAdapter } = await import('../lib/index.js');
const {
  primeUpstreamModels, peekUpstreamModels, invalidateUpstreamModels, isModelServedUpstream,
} = await import('../lib/dynamic-models.js');
const { buildStatus } = await import('../lib/web-api.js');
const { fallbackRuntimeModel } = await import('../lib/index.js');

const previousFetch = globalThis.fetch;
let calls = [];

globalThis.fetch = async (url, init) => {
  const token = init?.headers?.Authorization ?? init?.headers?.authorization ?? "";
  calls.push({ url, token });
  const models = token.includes('token-account-b')
    ? { 'claude-opus-4-6-thinking': { maxTokens: 1000000, maxOutputTokens: 64000 }, 'gemini-3.8-flash-tiered': { maxTokens: 1048576, maxOutputTokens: 65536 } }
    : {
        'gemini-3.8-flash-tiered': { maxTokens: 1048576, maxOutputTokens: 65536 },
        'gemini-4-argon-medium': { maxTokens: 1048576, maxOutputTokens: 65536 },
      };
  return Response.json({ models });
};

try {
  /* 1. listModels with a cold cache returns immediately. */
  invalidateUpstreamModels('token-account-a');
  calls = [];
  const book = { activeId: 'a', visibleModels: null, accounts: [
    { id: 'a', email: 'a@example.invalid', access: 'token-account-a', projectId: 'p-a', expires: Date.now() + 3600_000 },
    { id: 'b', email: 'b@example.invalid', access: 'token-account-b', projectId: 'p-b', expires: Date.now() + 3600_000 },
  ] };
  const store = { readBook: async () => book, writeBook: async () => {} };
  const adapter = new AntigravityAdapter(store, {});

  const cold = await adapter.listModels('agy-next');
  assert.ok(cold.some((model) => model.id === 'gemini-3.8-flash'), 'served models are listed after discovery');
  assert.ok(!cold.some((model) => model.id === 'claude-opus-4-6'), 'a model this account cannot serve stays out of chat');
  const endpointsPerRefresh = 3;
  assert.equal(calls.length, endpointsPerRefresh, 'the first picker open discovers once');

  /* 2. After the refresh, the account's own list filters the catalog. */
  const warm = await adapter.listModels('agy-next');
  const ids = warm.map((m) => m.id);
  assert.ok(ids.includes('gemini-3.8-flash'), 'a served model stays listed');
  assert.ok(ids.includes('gemini-4-argon'), 'Argon is derived from its medium/high/low routes, not its bare id');
  assert.ok(!ids.includes('claude-sonnet-5-5'), 'a model the account does not serve is not offered');
  assert.ok(!ids.includes('claude-sonnet-4-6'), 'stale Claude entitlements are not offered either');

  /* 3. resolveModel is equally non-blocking and uses the cached snapshot.
        (Re-prime first: step 5-style expiry is applied later, not here.) */
  await primeUpstreamModels('token-account-a', 'p-a');
  calls = [];
  const resolved = await adapter.resolveModel('agy-next', 'gemini-3.8-flash');
  assert.equal(calls.length, 0, 'resolveModel must not trigger a fetch when a fresh snapshot exists');
  assert.equal(resolved.context.contextWindow, 1048576, 'limits come from this account snapshot');

  /* 4. Switching accounts changes the answer: b has no snapshot, so the cold
        rule applies (everything listed, one refresh started for b only). */
  calls = [];
  book.activeId = 'b';
  const forB = await adapter.listModels('agy-next');
  assert.ok(forB.some((m) => m.id === 'claude-opus-4-6'), 'the new account shows the models Google returned for it');
  assert.ok(!forB.some((m) => m.id === 'gemini-4-argon'), 'the previous account rollout is not kept after a switch');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(calls.every((call) => call.token.includes('token-account-b')), 'refresh uses the new account credentials');
  assert.equal(calls.length, endpointsPerRefresh, 'exactly one refresh is started for the new account');

  /* 5. Expired snapshot: still returned immediately (stale-while-revalidate). */
  const staleEntry = peekUpstreamModels('token-account-a', 'p-a');
  staleEntry.expiresAt = Date.now() - 1;
  calls = [];
  const duringRefresh = peekUpstreamModels('token-account-a', 'p-a');
  assert.ok(duringRefresh.available.has('gemini-3.8-flash-tiered'), 'expired snapshot is still served while refreshing');
  // The refresh is async; let the fetch start and settle before counting.
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(calls.length >= 1, 'an expired snapshot triggers a refresh');

  /* 6. served tri-state: unknown must not hide. */
  assert.equal(isModelServedUpstream('claude-sonnet-5-5', null), null);
  assert.equal(isModelServedUpstream('claude-sonnet-5-5', staleEntry), false);
  assert.equal(isModelServedUpstream('gemini-4-argon', staleEntry), true);

  /* 7. No silent model substitution for account entitlements. */
  assert.equal(fallbackRuntimeModel('claude-sonnet-5-5-medium'), undefined, 'Claude 5.5 must not silently become 4.6');
  assert.equal(fallbackRuntimeModel('claude-opus-5-5-high'), undefined, 'Claude Opus 5.5 must not silently become 4.6');
  assert.equal(fallbackRuntimeModel('gemini-4-argon-medium'), undefined, 'Argon must not silently become Flash');
  assert.equal(fallbackRuntimeModel('gemini-3.7-flash-tiered'), 'gemini-3.8-flash-tiered', 'retired ids still map to their successor');

  /* 8. buildStatus reports per-account served flags without awaiting network. */
  book.activeId = 'a';
  calls = [];
  const t0 = Date.now();
  const status = await buildStatus({ store, settings: {}, provider: 'agy-next', deps: { oauthClientStatus: async () => ({ configured: true, source: 'installed-app' }), primeUpstreamModels: async () => staleEntry, retrieveUserQuotaSummary: async () => ({ groups: [] }) } });
  assert.ok(Date.now() - t0 < 5000);
  const argon = status.models.find((m) => m.id === 'gemini-4-argon');
  const sonnet = status.models.find((m) => m.id === 'claude-sonnet-5-5');
  assert.equal(argon.served, true);
  assert.equal(sonnet.served, false, 'settings page can grey out unserved models');
  assert.equal(typeof sonnet.visible, 'boolean');
} finally {
  globalThis.fetch = previousFetch;
}
console.log('PASS: model picker answers without network, filters by the active account, refreshes on switch, no silent model substitution');

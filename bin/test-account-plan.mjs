#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CredentialStore } from '../lib/store.js';
import { resolveCredential } from '../lib/credential.js';
import { createAccountPlanReader, parseAccountPlan } from '../lib/account-plan.js';
import { oauthClientStatus } from '../lib/status.js';
import { buildStatus } from '../lib/web-api.js';

const fixture = (name = 'Google AI Pro', id = 'g1-pro-tier') => ({
  currentTier: { id: 'free-tier', name: 'Antigravity', privacyNotice: { private: true } },
  paidTier: { id, name, availableCredits: [{ secretField: 'not-for-browser' }] },
  allowedTiers: [{ id: 'g1-ultra-tier', name: 'Google AI Ultra' }],
});
const pro = parseAccountPlan(fixture(), '2026-10-23T06:20:00.000Z');
assert.equal(pro.tier, 'pro');
assert.equal(pro.label, 'Google AI Pro');
assert.equal(pro.source, 'loadCodeAssist.paidTier');
assert.deepEqual(pro.codeAssistTier, { id: 'free-tier', name: 'Antigravity' });
assert.deepEqual(pro.paidTier, { id: 'g1-pro-tier', name: 'Google AI Pro' });
assert.ok(!JSON.stringify(pro).includes('not-for-browser'));
assert.ok(!JSON.stringify(pro).includes('privacyNotice'));
// Plus/Ultra parser coverage uses synthetic upstream records.
for (const [kind, name] of [['plus','Google AI Plus'], ['ultra','Google AI Ultra (20x)']]) {
  const parsed = parseAccountPlan(fixture(name, `opaque-${kind}-id`));
  assert.equal(parsed.tier, kind);
  assert.equal(parsed.label, name, 'preserve the upstream label, including subtiers');
}
assert.equal(parseAccountPlan({ paidTier: { id: 'g1-pro-tier' } }).label, 'Google AI Pro');
for (const [error, reason] of [
  [Object.assign(new Error('safe'), { oauthError: 'invalid_grant', httpStatus: 400 }), 'reauth_required'],
  [Object.assign(new Error('safe'), { oauthError: 'unauthorized_client', httpStatus: 401 }), 'client_mismatch'],
  [Object.assign(new Error('safe'), { httpStatus: 403 }), 'access_denied'],
  [Object.assign(new Error('safe'), { httpStatus: 503 }), 'temporary_failure'],
  [Object.assign(new Error('synthetic local secret'), { code: 'ECONNRESET' }), 'temporary_failure'],
]) {
  const { classifyRefreshError } = await import('../lib/oauth.js');
  assert.equal(classifyRefreshError(error), reason);
}
const freeOnly = parseAccountPlan({ currentTier: { id: 'free-tier', name: 'Antigravity' },
  allowedTiers: [{ id: 'g1-ultra-tier', name: 'Google AI Ultra' }],
  upgradeSubscriptionUri: 'https://example.invalid/pro' });
assert.equal(freeOnly.status, 'unknown', 'Code Assist free tier is not a subscription verdict');
assert.equal(freeOnly.label, null, 'never infer Ultra from upgrade options');
assert.equal(parseAccountPlan({ paidTier: null }).status, 'unknown');
assert.equal(parseAccountPlan(null).tier, null);
assert.equal(parseAccountPlan({ currentTier: { id: 'opaque', name: 'Google AI Ultra' } }).tier, 'ultra');
assert.equal(parseAccountPlan({ paidTier: { id: 'future-plan', name: 'Future Plan' } }).tier, 'other');

let now = 1000, calls = [];
const read = createAccountPlanReader({ now: () => now, cacheTtlMs: 100, endpoints: ['https://example.invalid'],
  fetchImpl: async (url, options) => {
    calls.push({ url, token: options.headers.Authorization, body: JSON.parse(options.body) });
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(options.headers.Authorization.endsWith('account-a') ? fixture() : fixture('Google AI Ultra', 'other-id'));
  },
});
const [a1,a2] = await Promise.all([read('account-a'), read('account-a')]);
assert.equal(calls.length, 1, 'concurrent plan requests share one fetch');
assert.equal(a1.tier, 'pro');
a1.label = 'mutated';
assert.equal(a2.label, 'Google AI Pro');
assert.equal((await read('account-a')).label, 'Google AI Pro', 'caller mutation cannot poison cache');
assert.equal(calls.length, 1);
assert.equal((await read('account-b')).tier, 'ultra', 'plan cache must be account-isolated');
assert.equal(calls.length, 2);
now += 101;
await read('account-a');
assert.equal(calls.length, 3, 'expired evidence is fetched again');
assert.equal(calls[0].body.metadata.ideType, 'ANTIGRAVITY');
let fails = 0;
const unavailable = createAccountPlanReader({ endpoints: ['https://example.invalid'], fetchImpl: async () => { fails++; throw Error('offline'); } });
assert.equal((await unavailable(null)).status, 'unavailable');
assert.equal(fails, 0);
assert.equal((await unavailable('account-c')).status, 'unavailable');
assert.equal((await unavailable('account-c')).label, null);
assert.equal(fails, 2, 'failure does not get cached as a free plan');

// Integration: subscription status is independent of model-rollout data.
// All account records and network responses below are synthetic.
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ models: {} });
try {
  const events = [];
  const book = { version: 2, activeId: 'a0', visibleModels: null,
    autoSwitch: { enabled: false }, accounts: Array.from({ length: 3 }, (_, i) => ({
      id: `a${i}`, email: `account${i}@example.invalid`, access: `expired-plan-${i}`,
      refresh: `refresh-${i}`, expires: Date.now() - 1000,
    })),
  };
  let writes = 0;
  const status = await buildStatus({
    provider: 'agy-next', settings: { clientId: 'test-id', clientSecret: 'test-secret' },
    store: { readOrImport: async () => book.accounts[0], readBook: async () => book,
      modifyBook: async fn => { const updated = await fn(book); if (updated !== undefined) writes++; return book; },
      writeBook: async () => { throw new Error('status must not write a stale whole-book snapshot'); } },
    deps: {
      oauthClientStatus: async () => ({ configured: true, installed: true, source: 'installed-app', version: 'test', path: 'fixture' }),
      resolveOAuthClient: async () => ({ clientId: 'synthetic-client-id', clientSecret: 'synthetic-client-secret' }),
      refreshAccessToken: async refresh => {
        const id = refresh.split('-').at(-1); events.push(`refresh:${id}`);
        return { access_token: `fresh-plan-${id}`, expires_in: 3600 };
      },
      retrieveUserQuotaSummary: async token => ({ groups: token.endsWith('-0')
        ? [{ displayName: 'Gemini 4 Argon', buckets: [{ bucketId: 'gemini-argon-wtu-weekly', window: 'weekly', remainingFraction: 0.9 }] }]
        : [] }),
      readAccountPlan: async token => {
        assert.ok(token.startsWith('fresh-'), 'subscription is fetched after token refresh');
        events.push(`plan:${token.split('-').at(-1)}`); return parseAccountPlan(fixture());
      },
    },
  });
  assert.equal(writes, 3, 'each refreshed credential is saved via its serialized account mutation');
  assert.equal(status.accounts.length, 3);
  for (const account of status.accounts) {
    assert.equal(account.plan.tier, 'pro');
    assert.equal(account.plan.label, 'Google AI Pro');
  }
  assert.equal(status.accounts.filter(a => a.usage?.groups.some(g => g.id === 'argon')).length, 1);
  assert.equal(book.accounts.some(a => 'plan' in a), false, 'no subscription metadata persisted into OAuth book');
  assert.ok(events.indexOf('refresh:0') < events.indexOf('plan:0'));
  assert.ok(!JSON.stringify(status).includes('fresh-plan-'), 'browser payload does not expose tokens');
  assert.ok(!JSON.stringify(status).includes('synthetic-client-'), 'browser payload does not expose OAuth client values');
  assert.equal(status.client.source, 'installed-app');
} finally { globalThis.fetch = previousFetch; }

// File-backed race regression: same CredentialStore as production, but an isolated
// temporary file and synthetic credentials. Never reaches the network.
const raceRoot = await mkdtemp(join(tmpdir(), 'agy-status-race-'));
try {
  const fileStore = new CredentialStore(join(raceRoot, 'agy-next-oauth.json'));
  // CredentialStore's legacy migration source is the user's default DSH_HOME;
  // disable that one hook in this test to guarantee no account-file reads.
  const store = {
    readOrImport: fileStore.readOrImport.bind(fileStore),
    readBook: fileStore.readBook.bind(fileStore),
    writeBook: fileStore.writeBook.bind(fileStore),
    modifyBook: fileStore.modifyBook.bind(fileStore),
    modifyAccount: fileStore.modifyAccount.bind(fileStore),
    syncLegacyAccounts: async () => 0,
  };
  const oldAccess = 'synthetic-race-old-access';
  const freshAccess = 'synthetic-race-fresh-access';
  await store.writeBook({ version: 2, activeId: 'a', visibleModels: ['gemini-3.8-flash'], modelVisibilityVersion: 2,
    autoSwitch: { enabled: false, thresholdPct: 80 }, accounts: [{ id: 'a', email: 'a@example.invalid', access: oldAccess,
      refresh: 'synthetic-race-refresh', expires: Date.now() - 1000 }] });
  let markRefreshing, releaseRefresh;
  const refreshing = new Promise(resolve => { markRefreshing = resolve; });
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
  const oldFetchForRace = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes('fetchAvailableModels')
    ? Response.json({ models: { 'gemini-3.8-flash-tiered': { maxTokens: 1000000 } } })
    : Response.json({ groups: [] });
  try {
    const pendingStatus = buildStatus({ provider: 'agy-next', settings: {}, store, deps: {
      oauthClientStatus: async () => ({ configured: true, installed: true, source: 'installed-app', version: 'synthetic' }),
      resolveOAuthClient: async () => ({ clientId: 'synthetic', clientSecret: 'synthetic' }),
      primeUpstreamModels: async () => ({ entry: null, failed: true }),
      refreshAccessToken: async () => { markRefreshing(); await refreshGate; return { access_token: freshAccess, expires_in: 3600 }; },
      retrieveUserQuotaSummary: async () => ({ groups: [] }),
      readAccountPlan: async () => parseAccountPlan(fixture()),
    } });
    await refreshing;
    await store.modifyBook(book => {
      book.accounts.push({ id: 'b', email: 'b@example.invalid', access: 'synthetic-b-access', refresh: 'synthetic-b-refresh', expires: Date.now() + 3600000 });
      book.visibleModels.push('claude-opus-4-6');
      book.autoSwitch = { enabled: true, thresholdPct: 65 };
      return book;
    });
    releaseRefresh();
    const status = await pendingStatus;
    const saved = await store.readBook();
    assert.ok(saved.accounts.some(account => account.id === 'b'), 'status refresh must not drop a concurrently added account');
    assert.ok(saved.visibleModels.includes('claude-opus-4-6'), 'status refresh must not drop a concurrent visibility change');
    assert.equal(saved.autoSwitch.thresholdPct, 65, 'status refresh must not overwrite auto-switch preferences');
    assert.equal(saved.accounts.find(account => account.id === 'a').access, freshAccess, 'refreshed token for A must persist');
    assert.equal(status.credential.stale, false, 'top-level status reflects refreshed active credential');
    assert.equal(status.accounts.find(account => account.id === 'a').stale, false);
    assert.equal(status.accounts.length, 2);
    assert.equal(status.autoSwitch.thresholdPct, 65);

    // Switching accounts while A is awaiting refresh must not route A's token
    // into B. Use the real adapter and file store, with only refresh/network mocked.
    const switchingRoot = join(raceRoot, 'switch');
    const switchingFileStore = new CredentialStore(join(switchingRoot, 'agy-next-oauth.json'));
    const switchingStore = {
      readOrImport: switchingFileStore.readOrImport.bind(switchingFileStore),
      readBook: switchingFileStore.readBook.bind(switchingFileStore),
      writeBook: switchingFileStore.writeBook.bind(switchingFileStore),
      modifyBook: switchingFileStore.modifyBook.bind(switchingFileStore),
      modifyAccount: switchingFileStore.modifyAccount.bind(switchingFileStore),
      syncLegacyAccounts: async () => 0,
    };
    const aAccess = 'synthetic-switch-a-old', aFresh = 'synthetic-switch-a-fresh', bAccess = 'synthetic-switch-b';
    await switchingStore.writeBook({ version: 2, activeId: 'a', autoSwitch: { enabled: false, thresholdPct: 80 }, visibleModels: null,
      accounts: [
        { id: 'a', email: 'a@example.invalid', access: aAccess, refresh: 'synthetic-refresh-a', expires: Date.now() - 1000, projectId: 'pa' },
        { id: 'b', email: 'b@example.invalid', access: bAccess, refresh: 'synthetic-refresh-b', expires: Date.now() + 3600000, projectId: 'pb' },
      ] });
    let releaseA, markA;
    const startedA = new Promise(resolve => { markA = resolve; });
    const gateA = new Promise(resolve => { releaseA = resolve; });
    const oldFetchSwitch = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
      const target = String(url);
      if (target.includes('fetchAvailableModels')) return Response.json({ models: {} });
      if (target.includes('streamGenerateContent')) return new Response('data: {"candidates":[{"content":{"parts":[{"text":"OK"}]}}]}\\n\\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
      return Response.json({ groups: [] });
    };
    try {
      const request = resolveCredential(switchingStore, { config: {}, deps: {
        resolveOAuthClient: async () => ({ clientId: 'synthetic-client', clientSecret: 'synthetic-secret' }),
        refreshAccessToken: async refresh => {
          assert.equal(refresh, 'synthetic-refresh-a');
          markA();
          await gateA;
          return { access_token: aFresh, expires_in: 3600 };
        },
        loadCodeAssist: async () => undefined,
      } });
      await startedA;
      await switchingStore.modifyBook(book => { book.activeId = 'b'; return book; });
      releaseA();
      await request;
      const after = await switchingStore.readBook();
      assert.equal(after.activeId, 'b');
      assert.equal(after.accounts.find(a => a.id === 'a').access, aFresh, 'A refresh remains on A');
      assert.equal(after.accounts.find(a => a.id === 'b').access, bAccess, 'B credentials are not overwritten by A refresh');
    } finally {
      globalThis.fetch = oldFetchSwitch;
    }
  } finally { globalThis.fetch = oldFetchForRace; }
} finally {
  const resolved = await realpath(raceRoot);
  // macOS resolves /var through /private/var, so the canonical temp root is the
  // valid base for both checks; comparing bare tmpdir() would fail there.
  const tempRoot = await realpath(tmpdir());
  assert.equal(resolved.startsWith(tempRoot), true);
  assert.ok(resolved.startsWith(join(tempRoot, 'agy-status-race-')));
  await rm(resolved, { recursive: true, force: true });
}

// Opt-in integration check: refreshes one already-authorized account in memory,
// never writes tokens, and prints only safe tier fields. Run manually with
// AGY_PLAN_LIVE_PROBE=1; do not make this part of the offline default suite.
//
// The default `npm test` lane is strictly offline. Someone who exports the
// live-probe flag while a CI or release script runs that lane must get a loud
// refusal — not a silent touch of a real account.
if (process.env.AGY_PLAN_LIVE_PROBE === '1' && process.env.npm_lifecycle_event === 'test') {
  console.error('AGY_PLAN_LIVE_PROBE=1 must not run inside the default `npm test` lane (offline only).');
  console.error('To probe deliberately and in isolation, run `node bin/test-account-plan.mjs` directly.');
  process.exit(2);
}
if (process.env.AGY_PLAN_LIVE_PROBE === '1') {
  console.warn('WARNING: live probe against a real account; reads only, no tokens written.');
  const { CredentialStore } = await import('../lib/store.js');
  const { refreshAccessToken } = await import('../lib/oauth.js');
  const { readAccountPlan } = await import('../lib/account-plan.js');
  const { resolveOAuthClient } = await import('../lib/status.js');
  const book = await new CredentialStore().peek();
  assert.ok(book?.refresh, 'active account must have a refresh token');
  const clientStatus = await oauthClientStatus();
  assert.equal(clientStatus.configured, true, 'installed AGY OAuth client must resolve');
  const client = await resolveOAuthClient();
  const tokens = await refreshAccessToken(book.refresh, { client });
  const plan = await readAccountPlan(tokens.access_token);
  assert.equal(plan.status, 'reported', 'Google must report a recognizable plan');
  console.log(JSON.stringify({ status: plan.status, tier: plan.tier, label: plan.label, source: plan.source }));
}
console.log('PASS: paidTier precedence, Plus/Pro/Ultra labels, unknown/failed states, cache isolation/TTL/deduplication, subscription independent of model rollout, refresh ordering, no token leaks');

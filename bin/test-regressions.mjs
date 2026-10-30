#!/usr/bin/env node
/**
 * Release regressions: behaviors a first-time installer depends on.
 * Runs entirely offline with in-memory stores and a stubbed fetch.
 */
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CredentialStore } from "../lib/store.js";
import {
  invalidateUpstreamModels,
  isModelServedUpstream,
  peekUpstreamModels,
  refreshUpstreamModels,
} from "../lib/dynamic-models.js";
import { MODELS, ROUTING, clientConfigured, clientId, clientSecret } from "../lib/constants.js";
import { clearAllExhaustion, isFamilyExhausted, markFamilyExhausted, quotaFamilyAtThreshold, recoverExhaustedFamilies } from "../lib/model-family.js";

const results = [];
// AGY_TESTS_STRICT=1 (set by bin/test-peers.mjs for the peers lane) turns a
// peer-missed skip into an explicit failure: a release run must not quietly
// count "cannot find package" as a green test.
const strict = process.env.AGY_TESTS_STRICT === "1";
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    // A missing host bundle is an environment limit, not a product regression:
    // the adapter checks need @deepseek-ai/dsh-llm from an installed DSH.
    if (String(error?.message ?? "").includes("Cannot find package '@deepseek-ai/dsh-llm'")) {
      results.push({ name, ok: true, skipped: true, message: "host peers unavailable in this checkout" });
      return;
    }
    results.push({ name, ok: false, message: error?.message ?? String(error) });
  }
}

const tokens = { a: "acct-token-aaaaaaaaaaaa", b: "acct-token-bbbbbbbbbbbb" };
const STUB_MODELS = {
  a: ["gemini-3.8-flash-tiered", "claude-opus-4-6-thinking"],
  b: ["gemini-4-argon-medium", "claude-sonnet-5-5-medium", "gemini-3.8-flash-tiered"],
};
const stubFetch = (models, { fail = false } = {}) => async (url, init = {}) => {
  const target = String(url);
  const headers = init.headers ?? {};
  const auth = String(headers.Authorization ?? headers.authorization ?? "");
  if (target.includes("retrieveUserQuotaSummary")) return Response.json({ groups: [] });
  if (target.includes("fetchAvailableModels")) {
    if (fail) return new Response("upstream down", { status: 503 });
    const who = Object.entries(tokens).find(([, value]) => auth.includes(value))?.[0];
    const ids = models?.[who] ?? [];
    return Response.json({ models: Object.fromEntries(ids.map((id) => [id, { maxTokens: 1_000_000, maxOutputTokens: 65536 }])) });
  }
  return new Response("not stubbed", { status: 500 });
};
const realFetch = globalThis.fetch;

/* ---------------------------------------------------------------- storage */

await test("OAuth client must be configured; no official client is bundled", async () => {
  const original = {
    id: process.env.AGY_NEXT_CLIENT_ID,
    secret: process.env.AGY_NEXT_CLIENT_SECRET,
    aliasId: process.env.ANTIGRAVITY_CLIENT_ID,
    aliasSecret: process.env.ANTIGRAVITY_CLIENT_SECRET,
  };
  try {
    delete process.env.AGY_NEXT_CLIENT_ID;
    delete process.env.AGY_NEXT_CLIENT_SECRET;
    delete process.env.ANTIGRAVITY_CLIENT_ID;
    delete process.env.ANTIGRAVITY_CLIENT_SECRET;
    assert.equal(clientConfigured("", {}), false);
    assert.throws(() => clientId("", {}), { name: "MissingClientError" });
    assert.throws(() => clientSecret("", {}), { name: "MissingClientError" });
  } finally {
    for (const [key, value] of Object.entries({
      AGY_NEXT_CLIENT_ID: original.id,
      AGY_NEXT_CLIENT_SECRET: original.secret,
      ANTIGRAVITY_CLIENT_ID: original.aliasId,
      ANTIGRAVITY_CLIENT_SECRET: original.aliasSecret,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

await test("login replaces only the captured account when sign-in completes after an account switch", async () => {
  const root = await mkdtemp(join(tmpdir(), "agy-login-target-"));
  const store = new CredentialStore(join(root, "agy-next-oauth.json"));
  try {
    await store.writeBook({ version: 2, activeId: "a", autoSwitch: { enabled: false }, visibleModels: null, accounts: [
      { id: "a", email: "a@example.invalid", access: "a-old", refresh: "refresh-a" },
      { id: "b", email: "b@example.invalid", access: "b-original", refresh: "refresh-b" },
    ] });
    await store.addAccount({ email: "a-new@example.invalid", access: "a-new-login", refresh: "refresh-a-new" });
    const book = await store.readBook();
    assert.equal(book.accounts.length, 3, "new login must create a new account, not update whichever account is active");
    assert.equal(book.accounts.find(account => account.id === "a").access, "a-old");
    assert.equal(book.accounts.find(account => account.id === "b").access, "b-original");
    assert.equal(book.accounts.find(account => account.email === "a-new@example.invalid").access, "a-new-login");
  } finally {
    const resolved = await realpath(root);
    assert.ok(resolved.startsWith(join(tmpdir(), "agy-login-target-")));
    await rm(resolved, { recursive: true, force: true });
  }
});

await test("first CLI login persists a book", async () => {
  const store = new CredentialStore();
  const writes = [];
  store.readBook = async () => undefined;
  store.writeBook = async (book) => writes.push(book);
  await store.write({ email: "new@example.invalid", access: "a", refresh: "r" });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].accounts.length, 1);
  assert.equal(writes[0].activeId, writes[0].accounts[0].id);
});

await test("captured credential writes preserve account IDs and never retarget after a switch", async () => {
  const root = await mkdtemp(join(tmpdir(), "agy-write-target-"));
  const path = join(root, "agy-next-oauth.json");
  const store = new CredentialStore(path);
  try {
    await store.writeBook({
      version: 2, activeId: "a", autoSwitch: { enabled: false }, visibleModels: null,
      accounts: [
        { id: "a", email: "a@example.invalid", access: "a-old", refresh: "refresh-a" },
        { id: "b", email: "b@example.invalid", access: "b-original", refresh: "refresh-b" },
      ],
    });
    const captured = await store.read();
    assert.equal(captured.id, "a", "credential reads must retain the account identity");
    await store.modifyBook(book => { book.activeId = "b"; return book; });
    await store.write({ ...captured, access: "a-fresh", expires: Date.now() + 3_600_000 });
    let book = await store.readBook();
    assert.equal(book.activeId, "b");
    assert.equal(book.accounts.find(account => account.id === "a").access, "a-fresh");
    assert.equal(book.accounts.find(account => account.id === "b").access, "b-original");
    await store.modifyBook(state => { state.accounts = state.accounts.filter(account => account.id !== "a"); return state; });
    await store.write({ ...captured, access: "must-not-resurrect" });
    book = await store.readBook();
    assert.equal(book.accounts.some(account => account.id === "a"), false, "a concurrent logout must not resurrect a captured account");
    assert.equal(book.accounts.find(account => account.id === "b").access, "b-original");
  } finally {
    const resolved = await realpath(root);
    assert.equal(resolved, root);
    assert.ok(resolved.startsWith(join(tmpdir(), "agy-write-target-")));
    await rm(resolved, { recursive: true, force: true });
  }
});

await test("concurrent account additions lose nothing", async () => {
  const store = new CredentialStore();
  let book;
  store.readBook = async () => {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
    return book ? structuredClone(book) : undefined;
  };
  store.writeBook = async (next) => {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
    book = structuredClone(next);
  };
  await Promise.all(Array.from({ length: 12 }, (_, i) => store.addAccount({ email: `u${i}@example.invalid` })));
  assert.equal(book.accounts.length, 12);
});

/* ------------------------------------------------------------ model list */

const bookFor = (activeId, extra = {}) => ({
  version: 2,
  activeId,
  visibleModels: null,
  autoSwitch: { enabled: false, thresholdPct: 80 },
  accounts: [
    { id: "a", email: "a@example.invalid", access: tokens.a, projectId: "p", expires: Date.now() + 3_600_000 },
    { id: "b", email: "b@example.invalid", access: tokens.b, projectId: "p", expires: Date.now() + 3_600_000 },
  ],
  ...extra,
});

await test("discovery failure is reported, and the previous snapshot is kept", async () => {
  invalidateUpstreamModels(tokens.a);
  globalThis.fetch = stubFetch(STUB_MODELS);
  const first = await refreshUpstreamModels(tokens.a, "p");
  assert.equal(first.failed, false);
  assert.ok(first.entry?.available.has("gemini-3.8-flash-tiered"));

  globalThis.fetch = stubFetch(STUB_MODELS, { fail: true });
  const warm = peekUpstreamModels(tokens.a, "p");
  assert.ok(warm, "a cached snapshot survives before the failing refresh");
  const second = await refreshUpstreamModels(tokens.a, "p");
  assert.equal(second.failed, true);
  assert.ok(second.entry?.available.has("gemini-3.8-flash-tiered"), "failure keeps the same account's last snapshot");
});

await test("served detection is per account, never borrowed", async () => {
  globalThis.fetch = stubFetch(STUB_MODELS);
  invalidateUpstreamModels(tokens.a);
  const a = (await refreshUpstreamModels(tokens.a, "p")).entry;
  assert.equal(isModelServedUpstream("gemini-4-argon", a), false, "account A does not have Argon");
  assert.equal(isModelServedUpstream("claude-opus-4-6", a), true);

  const b = (await refreshUpstreamModels(tokens.b, "p")).entry;
  assert.equal(isModelServedUpstream("gemini-4-argon", b), true, "account B does");
  assert.equal(isModelServedUpstream("claude-opus-4-6", b), false);
});

await test("an empty visibility list hides everything instead of showing all", async () => {
  const { AntigravityAdapter } = await import("../lib/index.js");
  const store = { readBook: async () => bookFor("a", { visibleModels: [] }), writeBook: async () => {} };
  const adapter = new AntigravityAdapter(store);
  const models = await adapter.listModels("agy-next");
  assert.deepEqual(models, []);
});

await test("chat list is exactly checked models the active account serves", async () => {
  const { AntigravityAdapter } = await import("../lib/index.js");
  globalThis.fetch = stubFetch(STUB_MODELS);
  invalidateUpstreamModels(tokens.a);
  const visibleModels = ["gemini-3.8-flash", "gemini-4-argon", "claude-opus-4-6"];
  const store = { readBook: async () => bookFor("a", { visibleModels }), writeBook: async () => {} };
  const adapter = new AntigravityAdapter(store);
  const a = (await adapter.listModels("agy-next")).map((model) => model.id).sort();
  assert.deepEqual(a, ["claude-opus-4-6", "gemini-3.8-flash"], "Argon is checked but account A cannot serve it");

  invalidateUpstreamModels(tokens.b);
  const storeB = { readBook: async () => bookFor("b", { visibleModels }), writeBook: async () => {} };
  const b = (await new AntigravityAdapter(storeB).listModels("agy-next")).map((model) => model.id).sort();
  assert.deepEqual(b, ["gemini-3.8-flash", "gemini-4-argon"], "switching accounts changes the served subset");
});

await test("unknown discovery keeps the user's checked models visible", async () => {
  const { AntigravityAdapter } = await import("../lib/index.js");
  const checked = ["gemini-3.8-flash", "gemini-4-argon", "claude-opus-4-6"];
  globalThis.fetch = stubFetch(STUB_MODELS, { fail: true });
  // No prior snapshot for this account, so nothing can be confirmed.
  invalidateUpstreamModels(tokens.a);
  assert.equal(peekUpstreamModels(tokens.a, "p"), null, "precondition: no cached snapshot");
  const store = { readBook: async () => bookFor("a", { visibleModels: checked }), writeBook: async () => {} };
  const models = await new AntigravityAdapter(store).listModels("agy-next");
  assert.deepEqual(models.map((model) => model.id).sort(), [...checked].sort(), "a failed discovery keeps the user's ticks, nothing more");
});

/* ------------------------------------------------------------- quota locks */

await test("auto-switch treats missing quota as unknown, not available", async () => {
  assert.equal(quotaFamilyAtThreshold(undefined, "argon"), null);
  assert.equal(quotaFamilyAtThreshold({ groups: [] }, "argon"), null);
  assert.equal(quotaFamilyAtThreshold({ groups: [{ buckets: [{ bucketId: "gemini-weekly", remainingFraction: 0.9 }] }] }, "argon"), null);
  assert.equal(quotaFamilyAtThreshold({ groups: [{ buckets: [{ bucketId: "3p-weekly", remainingFraction: 0.9 }] }] }, "3p", 80), false);
  assert.equal(quotaFamilyAtThreshold({ groups: [{ buckets: [{ bucketId: "3p-weekly", remainingFraction: 0.1 }] }] }, "3p", 80), true);
});

await test("auto-switch skips accounts without the requested model rollout", async () => {
  const { AntigravityAdapter } = await import("../lib/index.js");
  const oldFetch = globalThis.fetch;
  const calls = [];
  const tokens = { a: "test-account-a-live", b: "test-account-b-live" };
  let book = {
    version: 2, activeId: "a", autoSwitch: { enabled: true, thresholdPct: 80 }, visibleModels: null,
    accounts: [
      { id: "a", email: "a@example.invalid", access: tokens.a, refresh: "r-a", expires: Date.now() + 3_600_000, projectId: "p" },
      { id: "b", email: "b@example.invalid", access: tokens.b, refresh: "r-b", expires: Date.now() + 3_600_000, projectId: "p" },
    ],
  };
  const generatedWith = [];
  const makeStore = () => ({
    readBook: async () => book,
    readOrImport: async () => book.accounts.find((account) => account.id === book.activeId),
    modifyBook: async (fn) => { const next = await fn(book); if (next !== undefined) book = next; return book; },
    writeBook: async (next) => { book = next; },
  });
  try {
    // Account A is out of Argon quota; account B does not have Argon rollout.
    globalThis.fetch = async (url, init = {}) => {
      const target = String(url);
      const auth = String(init.headers?.Authorization ?? "");
      const owner = auth.includes(tokens.a) ? "a" : auth.includes(tokens.b) ? "b" : "?";
      calls.push({ target, owner });
      if (target.includes("fetchAvailableModels")) {
        const models = owner === "b" ? { "gemini-3.8-flash-tiered": { maxTokens: 1_000_000 } } : { "gemini-4-argon-medium": { maxTokens: 1_000_000 } };
        return Response.json({ models });
      }
      if (target.includes("retrieveUserQuotaSummary")) {
        const remainingFraction = owner === "a" ? 0 : 1;
        return Response.json({ groups: [{ buckets: [{ bucketId: "gemini-argon-wtu-weekly", remainingFraction }] }] });
      }
      if (target.includes("streamGenerateContent")) {
        generatedWith.push(owner);
        return Response.json({ error: { message: "Individual quota reached" } }, { status: 429 });
      }
      return new Response("unexpected request", { status: 500 });
    };
    invalidateUpstreamModels(tokens.a);
    invalidateUpstreamModels(tokens.b);
    const adapter = new AntigravityAdapter(makeStore());
    await assert.rejects(async () => {
      for await (const _chunk of adapter.stream({ provider: "agy-next", model: "gemini-4-argon", messages: [{ role: "user", content: "hi" }], maxTokens: 64 })) {}
    });
    assert.deepEqual(generatedWith, ["a"], "the Argon-ineligible standby is never sent the request");
    assert.equal(book.activeId, "a", "unknown/ineligible standby does not change active account");
    assert.ok(book.accounts[0].exhaustedFamilies.includes("argon"), "only Argon is locked on the exhausted account");
  } finally {
    globalThis.fetch = oldFetch;
    invalidateUpstreamModels(tokens.a);
    invalidateUpstreamModels(tokens.b);
  }
});

await test("auto-switch selects a qualified account with remaining quota", async () => {
  const { AntigravityAdapter } = await import("../lib/index.js");
  const oldFetch = globalThis.fetch;
  const tokens = { a: "test-account-a-ok", b: "test-account-b-ok" };
  let book = {
    version: 2, activeId: "a", autoSwitch: { enabled: true, thresholdPct: 80 }, visibleModels: null,
    accounts: [
      { id: "a", email: "a@example.invalid", access: tokens.a, refresh: "r-a", expires: Date.now() + 3_600_000, projectId: "p" },
      { id: "b", email: "b@example.invalid", access: tokens.b, refresh: "r-b", expires: Date.now() + 3_600_000, projectId: "p" },
    ],
  };
  const generatedWith = [];
  const store = {
    readBook: async () => book,
    readOrImport: async () => book.accounts.find((account) => account.id === book.activeId),
    modifyBook: async (fn) => { const next = await fn(book); if (next !== undefined) book = next; return book; },
    writeBook: async (next) => { book = next; },
  };
  try {
    globalThis.fetch = async (url, init = {}) => {
      const target = String(url);
      const auth = String(init.headers?.Authorization ?? "");
      const owner = auth.includes(tokens.a) ? "a" : auth.includes(tokens.b) ? "b" : "?";
      if (target.includes("fetchAvailableModels")) return Response.json({ models: { "gemini-4-argon-medium": { maxTokens: 1_000_000, maxOutputTokens: 65536 } } });
      if (target.includes("retrieveUserQuotaSummary")) {
        const remainingFraction = owner === "a" ? 0 : 1;
        return Response.json({ groups: [{ buckets: [{ bucketId: "gemini-argon-wtu-weekly", remainingFraction }] }] });
      }
      if (target.includes("streamGenerateContent")) {
        generatedWith.push(owner);
        return new Response('data: {"response":{"candidates":[{"content":{"parts":[{"text":"OK"}]}}]}}\n\n', { status: 200, headers: { "content-type": "text/event-stream" } });
      }
      return new Response("unexpected request", { status: 500 });
    };
    invalidateUpstreamModels(tokens.a);
    invalidateUpstreamModels(tokens.b);
    const adapter = new AntigravityAdapter(store);
    let text = "";
    for await (const chunk of adapter.stream({ provider: "agy-next", model: "gemini-4-argon", messages: [{ role: "user", content: "hi" }], maxTokens: 64 })) {
      if (chunk.type === "text-delta") text += chunk.text ?? "";
    }
    assert.equal(text, "OK");
    assert.deepEqual(generatedWith, ["b"], "request is sent only through the qualified standby");
    assert.equal(book.activeId, "b");
  } finally {
    globalThis.fetch = oldFetch;
    invalidateUpstreamModels(tokens.a);
    invalidateUpstreamModels(tokens.b);
  }
});

await test("a family lock does not block other families", async () => {
  const account = {};
  markFamilyExhausted(account, "3p");
  assert.equal(isFamilyExhausted(account, "3p"), true);
  assert.equal(isFamilyExhausted(account, "gemini"), false);
  const groups = [
    { id: "3p", fiveHour: { remainingFraction: 0 }, weekly: { remainingFraction: 0.4 } },
    { id: "gemini", fiveHour: { remainingFraction: 1 }, weekly: { remainingFraction: 1 } },
  ];
  assert.equal(recoverExhaustedFamilies(account, groups), false, "a healthy family must not clear a spent one");
  groups[0].fiveHour.remainingFraction = 1;
  assert.equal(recoverExhaustedFamilies(account, groups), true);
  assert.equal(account.exhaustedFamilies, undefined);
});

await test("legacy global locks split per family", async () => {
  const legacy = { exhausted: true };
  recoverExhaustedFamilies(legacy, [{ id: "gemini", fiveHour: { remainingFraction: 1 }, weekly: { remainingFraction: 1 } }]);
  assert.ok(legacy.exhaustedFamilies.includes("3p"));
  assert.ok(!legacy.exhaustedFamilies.includes("gemini"));
  clearAllExhaustion(legacy);
  assert.equal(legacy.exhausted, undefined);
  assert.equal(legacy.exhaustedFamilies, undefined);
});

await test("sign-in sync never drops an existing account on a missing book", async () => {
  const store = new CredentialStore();
  let book;
  store.readBook = async () => (book ? structuredClone(book) : undefined);
  store.writeBook = async (next) => { book = structuredClone(next); };
  await store.write({ email: "first@example.invalid", access: "a" });
  // Mirrors web-api.js startLogin: write() on an existing book must update, and
  // on a missing one must create — never throw or silently skip.
  await store.write({ email: "second@example.invalid", access: "b" });
  assert.equal(book.accounts.length, 1, "sign-in replaces the active account, not duplicates it");
  assert.equal(book.accounts[0].access, "b");
});

/* ------------------------------------------------------------ chat rule */

const { pickChatModels } = await import("../lib/dynamic-models.js");
const cat = (...ids) => ids.map((id) => MODELS.find((model) => model.id === id));

await test("chat list: an empty visibility list stays empty", async () => {
  assert.deepEqual(pickChatModels([], { available: new Set(["gemini-3-flash"]) }).map((m) => m.id), []);
});

await test("chat list: confirmed discovery is exactly checked AND served", async () => {
  const entry = { available: new Set(["gemini-3-flash", "claude-opus-4-6-thinking"]) };
  const ids = pickChatModels(cat("gemini-3-flash", "gemini-4-argon", "claude-opus-4-6"), entry).map((m) => m.id).sort();
  assert.deepEqual(ids, ["claude-opus-4-6", "gemini-3-flash"], "a checked model the account cannot serve is excluded");
});

await test("chat list: two accounts yield different subsets", async () => {
  const a = { available: new Set(["gemini-3.8-flash-tiered"]) };
  const b = { available: new Set(["gemini-4-argon-medium", "gemini-3.8-flash-tiered"]) };
  const checked = cat("gemini-3.8-flash", "gemini-4-argon");
  assert.deepEqual(pickChatModels(checked, a).map((m) => m.id), ["gemini-3.8-flash"]);
  assert.deepEqual(pickChatModels(checked, b).map((m) => m.id).sort(), ["gemini-3.8-flash", "gemini-4-argon"]);
});

await test("chat list: unconfirmed discovery keeps the checked models", async () => {
  const checked = cat("gemini-3.8-flash", "gemini-4-argon");
  assert.deepEqual(pickChatModels(checked, null).map((m) => m.id), ["gemini-3.8-flash", "gemini-4-argon"]);
});

/* --------------------------------------------------------- stream errors */

await test("a retired-model notice inside SSE JSON throws instead of becoming a reply", async () => {
  const { createStreamState, processStreamLine } = await import("../lib/stream.js");
  const state = createStreamState();
  const payload = { response: { candidates: [{ content: { parts: [{ text: "Claude Sonnet 4.6 is no longer available. Please switch to Claude Sonnet 5.5." }] } }] } };
  assert.throws(
    () => processStreamLine(`data: ${JSON.stringify(payload)}`, state),
    (error) => error.code === "MODEL_RETIRED" && /no longer available/.test(error.message),
  );
  assert.equal(state.hasContent, false, "the retirement notice is never emitted as model output");
});

await test("a real SSE stream still streams text", async () => {
  const { createStreamState, streamResponseToChunks } = await import("../lib/stream.js");
  const body = 'data: {"candidates":[{"content":{"parts":[{"text":"OK"}],"role":"model"}}]}\n\n';
  const response = new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
  const state = createStreamState();
  let text = "";
  for await (const chunk of streamResponseToChunks(response, state, { modelId: "gemini-3.8-flash", runtimeModel: "gemini-3.8-flash-tiered" })) {
    if (chunk.type === "text-delta") text += chunk.text ?? "";
  }
  assert.equal(text.trim(), "OK");
});

/* --------------------------------------------------------------- catalog */

await test("catalog integrity: declared efforts route to live runtime ids", async () => {
  const { GONE_RUNTIME_MODELS } = await import("../lib/constants.js");
  const problems = [];
  for (const model of MODELS) {
    const route = ROUTING[model.id];
    // Models without a routing table are sent under their own id; that is the
    // documented pass-through, so only tables that DO exist must be complete.
    if (route) {
      for (const effort of model.efforts) {
        if (!route[effort]) problems.push(`${model.id}@${effort} has a routing table but no entry`);
      }
      for (const runtime of Object.values(route)) {
        if (GONE_RUNTIME_MODELS.has(runtime)) problems.push(`${model.id} routes to dead ${runtime}`);
      }
    }
    for (const effort of model.efforts) {
      const runtime = route?.[effort] ?? model.id;
      if (GONE_RUNTIME_MODELS.has(runtime)) problems.push(`${model.id}@${effort} sends dead ${runtime}`);
    }
  }
  assert.deepEqual(problems, []);
});

globalThis.fetch = realFetch;

const failed = results.filter((r) => !r.ok);
const skipped = results.filter((r) => r.skipped);
for (const result of results) {
  if (result.skipped) console.log(`SKIP  ${result.name} — ${result.message}`);
  else console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.ok ? "" : ` — ${result.message}`}`);
}
console.log(`\n${failed.length === 0 ? "ALL REGRESSIONS PASSED" : `${failed.length} REGRESSION(S) FAILED`}${skipped.length ? ` (${skipped.length} skipped)` : ""}`);
if (strict && skipped.length) {
  console.log(`STRICT MODE: ${skipped.length} skipped test(s) count as failures — run with AGY_PEER_ROOT pointing at the DSH peer packages.`);
  process.exit(1);
}
process.exit(failed.length === 0 ? 0 : 1);

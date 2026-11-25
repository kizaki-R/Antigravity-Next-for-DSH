#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { decodeGoKeyringSecret, parseAcpCredentialBlob, readAcpCredential } from "../lib/acp/keyring.js";
import { buildStatus } from "../lib/web-api.js";

// 1. Decode go-keyring secret prefixes (plain, base64, hex)
{
  assert.equal(decodeGoKeyringSecret('{"ok":true}'), '{"ok":true}');
  const b64 = Buffer.from('{"token":{"access_token":"tok-b64"}}', "utf8").toString("base64");
  assert.equal(decodeGoKeyringSecret(`go-keyring-base64:${b64}`), '{"token":{"access_token":"tok-b64"}}');
  const hex = Buffer.from('{"token":{"access_token":"tok-hex"}}', "utf8").toString("hex");
  assert.equal(decodeGoKeyringSecret(`go-keyring-encoded:${hex}`), '{"token":{"access_token":"tok-hex"}}');
}

// 2. Parse agy 1.5.x nested token blob + expiry check
{
  const now = () => Date.parse("2026-11-25T10:00:00Z");
  const valid = parseAcpCredentialBlob(
    JSON.stringify({
      token: {
        access_token: "access-123",
        refresh_token: "refresh-456",
        expiry: "2026-11-25T10:45:00.1234567+00:00",
      },
      auth_method: "consumer",
      id_token_email: "user@example.com",
    }),
    { now },
  );
  assert.equal(valid.accessToken, "access-123");
  assert.equal(valid.refreshToken, "refresh-456");
  assert.equal(valid.email, "user@example.com");
  assert.equal(valid.authMethod, "consumer");
  assert.equal(valid.expired, false);
  assert.equal(valid.hasRefresh, true);

  const expired = parseAcpCredentialBlob(
    JSON.stringify({
      token: {
        access_token: "access-old",
        refresh_token: "refresh-456",
        expiry: "2026-11-25T10:00:30Z",
      },
    }),
    { now },
  );
  assert.equal(expired.expired, true);
}

// 3. readAcpCredential: file storage takes precedence, OS keyring fallback works across platforms
{
  const expectedFile = path.resolve("/tmp/custom-gemini", "antigravity-acp", "antigravity-oauth-token");
  const fromFile = await readAcpCredential({
    env: { GEMINI_HOME: "/tmp/custom-gemini" },
    platform: "linux",
    readFile: async (filePath) => {
      if (path.resolve(filePath) === expectedFile) {
        return JSON.stringify({
          token: { access_token: "file-tok", expiry: "2099-01-01T00:00:00Z" },
          id_token_email: "file@example.com",
        });
      }
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    },
    execFile: async () => {
      throw new Error("should not call OS keyring when file token is present");
    },
  });
  assert.equal(fromFile.source, "file");
  assert.equal(fromFile.accessToken, "file-tok");
  assert.equal(fromFile.email, "file@example.com");

  const fromKeyring = await readAcpCredential({
    env: { HOME: "/tmp/no-files" },
    platform: "darwin",
    readFile: async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    },
    execFile: async (cmd, args) => {
      assert.equal(cmd, "security");
      assert.deepEqual(args, ["find-generic-password", "-s", "gemini", "-a", "antigravity", "-w"]);
      const payload = Buffer.from(
        JSON.stringify({
          token: { access_token: "mac-tok", refresh_token: "r1", expiry: "2099-01-01T00:00:00Z" },
          id_token_email: "mac@example.com",
        }),
      ).toString("base64");
      return { stdout: `go-keyring-base64:${payload}\n` };
    },
  });
  assert.equal(fromKeyring.source, "keyring");
  assert.equal(fromKeyring.accessToken, "mac-tok");
  assert.equal(fromKeyring.email, "mac@example.com");
}

// 4. buildStatus resolves ACP quota from keyring, upgrades placeholder email, and retries once on 401
{
  const book = {
    activeId: "acp-1",
    autoSwitch: { enabled: false, thresholdPct: 80 },
    accounts: [
      {
        id: "acp-1",
        email: "Antigravity ACP (Google AI Pro)",
        source: "acp",
        clientRecorded: true,
        addedAt: 1000,
      },
    ],
  };
  const store = {
    readBook: async () => structuredClone(book),
    readOrImport: async () => structuredClone(book.accounts[0]),
    modifyAccount: async (id, mutator) => {
      const target = book.accounts.find((a) => a.id === id);
      if (!target) return false;
      const res = mutator(target);
      return res !== false;
    },
  };
  let quotaCalls = 0;
  let refreshedCalled = 0;
  const status = await buildStatus({
    store,
    settings: { disabledModels: [] },
    deps: {
      describeAcpStatus: async () => ({
        reachable: true,
        authenticated: true,
        agentInfo: { name: "Antigravity CLI", version: "1.5.10" },
        protocolVersion: 1,
        authMethods: [{ id: "oauth-personal" }],
        mcpCapabilities: { http: false, sse: false },
        models: [{ id: "gemini-4-hydrogen", name: "Gemini 4 Hydrogen" }],
        tier: { id: "g1-pro-tier", name: "Google AI Pro" },
      }),
      readAcpCredential: async () => ({
        source: "keyring",
        accessToken: "stale-acp-tok",
        refreshToken: "acp-refresh",
        email: "acp-user@example.com",
        expired: false,
        hasRefresh: true,
      }),
      refreshAcpAuth: async () => {
        refreshedCalled++;
        return {
          source: "keyring",
          accessToken: "fresh-acp-tok",
          refreshToken: "acp-refresh",
          email: "acp-user@example.com",
          expired: false,
          hasRefresh: true,
        };
      },
      retrieveUserQuotaSummary: async (token) => {
        quotaCalls++;
        if (token === "stale-acp-tok") {
          const err = new Error("HTTP 401 UNAUTHENTICATED");
          err.status = 401;
          throw err;
        }
        assert.equal(token, "fresh-acp-tok");
        return {
          groups: [
            {
              displayName: "Gemini Models",
              buckets: [
                {
                  bucketId: "gemini-5h",
                  window: "5h",
                  remainingFraction: 0.75,
                  resetTime: "2026-11-25T15:00:00Z",
                },
                {
                  bucketId: "gemini-weekly",
                  window: "weekly",
                  remainingFraction: 0.9,
                  resetTime: "2026-12-01T15:00:00Z",
                },
              ],
            },
          ],
        };
      },
    },
  });

  assert.equal(refreshedCalled, 1);
  assert.equal(quotaCalls, 2);
  assert.equal(status.accounts.length, 1);
  assert.equal(status.accounts[0].email, "acp-user@example.com");
  assert.equal(status.accounts[0].plan.label, "Google AI Pro");
  assert.ok(status.accounts[0].usage?.groups?.length === 1);
  assert.equal(status.accounts[0].usage.groups[0].fiveHour.remainingFraction, 0.75);
  assert.equal(status.accounts[0].usage.groups[0].weekly.remainingFraction, 0.9);
  // Persisted placeholder upgrade + usage snapshot in store without writing tokens
  assert.equal(book.accounts[0].email, "acp-user@example.com");
  assert.equal(book.accounts[0].access, undefined);
  assert.equal(book.accounts[0].refresh, undefined);
}

console.log("acp quota offline: ok");

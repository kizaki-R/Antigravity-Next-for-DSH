#!/usr/bin/env node
/**
 * Live smoke test: credentials -> project discovery -> model list -> stream.
 *
 * Read-only with respect to the official plugin's credential file. Pass
 * --no-stream to stop after the model list.
 */

import { CredentialStore, needsRefresh } from "../lib/store.js";
import { refreshAccessToken } from "../lib/oauth.js";
import { resolveOAuthClient } from "../lib/status.js";
import {
  antigravityHeaders,
  fetchAvailableModels,
  loadCodeAssist,
  redactSecrets,
} from "../lib/client.js";
import { ENDPOINTS, MODELS } from "../lib/constants.js";
import { buildRequestBody } from "../lib/convert.js";
import { createStreamState, streamResponseToChunks } from "../lib/stream.js";

const flags = new Set(process.argv.slice(2));
const log = (m) => process.stdout.write(`${m}\n`);
const fail = (m) => {
  process.stderr.write(`${m}\n`);
  process.exitCode = 1;
};

async function main() {
  const client = await resolveOAuthClient();
  const store = new CredentialStore();

  log(`credential file: ${await store.path()}`);

  let credential = await store.read();
  let imported = false;
  if (!credential) {
    credential = await store.readLegacy();
    imported = !!credential;
    log(
      imported
        ? "using existing login imported read-only from the official plugin file"
        : "no credential found — run `node bin/login.mjs` first",
    );
  }
  if (!credential) return 1;

  if (imported) {
    // Persist our own copy so we stop depending on the other plugin's file.
    await store.write(credential);
    log(`imported into ${await store.path()}`);
  }

  log(`account: ${credential.email ?? "<unknown>"}`);
  log(`refresh token present: ${credential.refresh ? "yes" : "NO"}`);

  if (needsRefresh(credential)) {
    log("access token expired; refreshing...");
    if (!credential.refresh) return fail("no refresh token available");
    try {
      const tokens = await refreshAccessToken(credential.refresh, { client });
      credential = {
        ...credential,
        access: tokens.access_token,
        refresh: tokens.refresh_token || credential.refresh,
        expires: Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000,
      };
      await store.write(credential);
      log(`refresh OK (access token ${tokens.access_token.length} chars)`);
    } catch (error) {
      return fail(`refresh failed: ${redactSecrets(error.message)}`);
    }
  } else {
    log("access token still valid");
  }

  /* ---------------------------------------------------- project discovery */
  log("\n--- loadCodeAssist ---");
  let projectId = credential.projectId;
  try {
    const discovered = await loadCodeAssist(credential.access);
    log(`discovered projectId: ${discovered ?? "<none>"}`);
    if (discovered && discovered !== projectId) {
      credential = { ...credential, projectId: discovered };
      await store.write(credential);
      projectId = discovered;
    }
  } catch (error) {
    log(`loadCodeAssist failed: ${error.message}`);
  }
  if (!projectId) {
    projectId = "aicode-consumers";
    log(`falling back to projectId: ${projectId}`);
  }

  /* --------------------------------------------------------- model listing */
  log("\n--- fetchAvailableModels ---");
  try {
    const { models, defaultAgentModelId } = await fetchAvailableModels(credential.access, projectId);
    const ids = Object.keys(models);
    log(`backend exposes ${ids.length} entries; defaultAgentModelId=${defaultAgentModelId ?? "<none>"}`);
    for (const id of ids.slice(0, 40)) {
      const info = models[id];
      const name = info?.displayName ?? info?.label ?? "";
      log(`  ${id}${name ? `  (${name})` : ""}${info?.supportsThinking ? " [thinking]" : ""}`);
    }
    if (ids.length > 40) log(`  ... and ${ids.length - 40} more`);

    const missing = MODELS.filter((m) => !ids.includes(m.id)).map((m) => m.id);
    if (ids.length && missing.length) log(`catalog ids not currently offered: ${missing.join(", ")}`);
  } catch (error) {
    log(`fetchAvailableModels failed: ${redactSecrets(error.message)}`);
  }

  if (flags.has("--no-stream")) return 0;

  /* --------------------------------------------------------------- stream */
  const modelId = process.env.SMOKE_MODEL?.trim() || "gemini-2.5-flash";
  const runtimeModel = process.env.ANTIGRAVITY_RUNTIME_MODEL?.trim() || modelId;
  const effort = "low";

  log(`\n--- stream (${modelId} -> ${runtimeModel}) ---`);

  const body = JSON.stringify(
    buildRequestBody(
      {
        modelId,
        messages: [{ role: "user", content: "Reply with exactly: agy-next ok" }],
        maxTokens: 2048,
        temperature: 0,
      },
      projectId,
      runtimeModel,
      undefined,
    ),
  );

  let response;
  let lastText = "";
  for (const endpoint of ENDPOINTS) {
    log(`POST ${endpoint}/v1internal:streamGenerateContent?alt=sse`);
    response = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: await antigravityHeaders(credential.access),
      body,
    });
    if (response.ok) break;
    lastText = await response.text();
    log(`  -> HTTP ${response.status}: ${redactSecrets(lastText).slice(0, 300)}`);
  }

  if (!response?.ok) return fail(`stream request failed (HTTP ${response?.status})`);

  log(`  -> HTTP ${response.status}, content-type: ${response.headers.get("content-type")}`);

  const state = createStreamState();
  let chunkCount = 0;
  let text = "";
  let reasoning = "";
  const toolCalls = [];
  let finish;

  for await (const chunk of streamResponseToChunks(response, state, { modelId, runtimeModel })) {
    chunkCount++;
    if (chunk.type === "text-delta") text += chunk.text;
    else if (chunk.type === "reasoning-delta") reasoning += chunk.text;
    else if (chunk.type === "tool-call-delta") toolCalls.push(chunk);
    else if (chunk.type === "finish") finish = chunk;
    else if (chunk.type === "usage") log(`  usage: ${JSON.stringify(chunk.usage)}`);
  }

  log(`\nchunks: ${chunkCount}`);
  if (reasoning) log(`reasoning: ${JSON.stringify(reasoning.slice(0, 120))}`);
  log(`text: ${JSON.stringify(text.slice(0, 300))}`);
  if (toolCalls.length) log(`tool calls: ${toolCalls.length}`);
  log(`finish: ${JSON.stringify(finish?.reason)}`);
  log(`replay blocks: ${JSON.stringify(finish?.replayState?.blocks)}`);

  if (!text && !toolCalls.length) return fail("no visible content produced");
  log("\nSMOKE TEST PASSED");
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code ?? 0;
  },
  (error) => {
    fail(`unexpected failure: ${error?.stack ?? error}`);
  },
);

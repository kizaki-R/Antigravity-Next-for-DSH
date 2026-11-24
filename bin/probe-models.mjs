#!/usr/bin/env node
/**
 * Diagnostic: probe which runtime model ids the backend accepts right now.
 * Refreshes a locally unexpired token first, and uses the same endpoint order
 * as chat. Probing cloudcode-pa before the daily host reports 429s the plugin
 * itself does not hit first.
 */
import { CredentialStore } from "../lib/store.js";
import { antigravityHeaders, jsonHeaders, redactSecrets } from "../lib/client.js";
import { buildRequestBody } from "../lib/convert.js";
import { resolveCredential } from "../lib/credential.js";
import { ENDPOINTS } from "../lib/constants.js";

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "gemini-2.5-flash",
      "gemini-3.8-flash-tiered",
      "gemini-3.6-flash-medium",
      "gemini-3.6-flash-high",
      "gemini-3.5-flash-low",
      "gemini-3-flash-agent",
      "gemini-pro-agent",
      "gemini-3.1-pro-low",
      "claude-sonnet-4-6",
      "gpt-oss-120b-medium",
    ];

const store = new CredentialStore();
const before = await store.read();
if (!before) {
  console.error("no credential");
  process.exit(1);
}
let credential;
try {
  credential = await resolveCredential(store, { force: true });
} catch (error) {
  console.error(`refresh failed: ${error?.message ?? error}`);
  console.error("probe will not send the stored access token; sign in again if refresh is rejected.");
  process.exit(1);
}
console.log(`account: ${credential.email ?? "<unknown>"}`);
console.log(`token: ${credential.access === before.access ? "unchanged after refresh" : "refreshed before probe"}`);
// The settings page shows a fixed "quota exhausted" line whenever DSH sees a
// QUOTA code. It never shows what Google actually said, so this probe also
// prints the unmodified upstream body (with secrets stripped) to distinguish
// a real per-account quota from a rate-limit or a third-party-client cap.
const showBody = (prefix, response, text) => {
  const clean = redactSecrets(String(text ?? "").replace(/\s+/g, " ").trim()).slice(0, 300);
  console.log(`${prefix} HTTP ${response.status}  ${clean || "<empty body>"}`);
};

for (const endpoint of ENDPOINTS) {
  console.log(`\n================ ${endpoint}`);
  let quota;
  try {
    const response = await fetch(`${endpoint}/v1internal:retrieveUserQuotaSummary`, {
      method: "POST",
      headers: await jsonHeaders(credential.access),
      body: "{}",
    });
    const text = await response.text();
    showBody("quota-summary".padEnd(26), response, text);
  } catch (error) {
    console.log(`${"quota-summary".padEnd(26)} FETCH ERROR ${error.message}`);
  }
  for (const runtimeModel of ids) {
    const body = JSON.stringify(
      buildRequestBody(
        { modelId: runtimeModel, messages: [{ role: "user", content: "say ok" }], maxTokens: 1024 },
        credential.projectId,
        runtimeModel,
        undefined,
      ),
    );
    let response;
    try {
      response = await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: await antigravityHeaders(credential.access),
        body,
      });
    } catch (error) {
      console.log(`${runtimeModel.padEnd(26)} FETCH ERROR ${error.message}`);
      continue;
    }
    if (!response.ok) {
      showBody(runtimeModel.padEnd(26), response, await response.text());
      continue;
    }
    const text = await response.text();
    const first = text.match(/"text":\s*"([^"]{0,40})/);
    console.log(`${runtimeModel.padEnd(26)} HTTP 200  bytes=${text.length}  ${first ? first[1] : ""}`);
  }
}

#!/usr/bin/env node
/** Diagnostic: probe which runtime model ids the backend accepts right now. */
import { CredentialStore } from "../lib/store.js";
import { antigravityHeaders } from "../lib/client.js";
import { buildRequestBody } from "../lib/convert.js";

const SANDBOX = "https://daily-cloudcode-pa.sandbox.googleapis.com";
const PRIMARY = "https://cloudcode-pa.googleapis.com";

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
const credential = await store.read();
if (!credential) {
  console.error("no credential");
  process.exit(1);
}

for (const endpoint of [PRIMARY, SANDBOX]) {
  console.log(`\n================ ${endpoint}`);
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
      const text = (await response.text()).replace(/\s+/g, " ").slice(0, 110);
      console.log(`${runtimeModel.padEnd(26)} HTTP ${response.status}  ${text}`);
      continue;
    }
    const text = await response.text();
    const first = text.match(/"text":\s*"([^"]{0,40})/);
    console.log(`${runtimeModel.padEnd(26)} HTTP 200  bytes=${text.length}  ${first ? first[1] : ""}`);
  }
}

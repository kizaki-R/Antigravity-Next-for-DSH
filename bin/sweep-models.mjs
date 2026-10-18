#!/usr/bin/env node
/**
 * Sweep every runtime model id the backend advertises and report which ones
 * actually serve a request. Used to keep the catalog honest.
 */
import { CredentialStore } from "../lib/store.js";
import { antigravityHeaders, fetchAvailableModels } from "../lib/client.js";
import { buildRequestBody } from "../lib/convert.js";

const SANDBOX = "https://daily-cloudcode-pa.sandbox.googleapis.com";

const store = new CredentialStore();
const credential = await store.read();
if (!credential) {
  console.error("no credential");
  process.exit(1);
}

const { models } = await fetchAvailableModels(credential.access, credential.projectId);
const ids = Object.keys(models)
  .filter((id) => !id.startsWith("chat_") && !id.startsWith("tab_"))
  .sort();

console.log(`probing ${ids.length} advertised ids...\n`);

const results = { ok: [], deprecated: [], notFound: [], other: [] };

for (const runtimeModel of ids) {
  const body = JSON.stringify(
    buildRequestBody(
      { modelId: runtimeModel, messages: [{ role: "user", content: "say ok" }], maxTokens: 512 },
      credential.projectId,
      runtimeModel,
      undefined,
    ),
  );
  let response;
  try {
    response = await fetch(`${SANDBOX}/v1internal:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: await antigravityHeaders(credential.access),
      body,
    });
  } catch (error) {
    results.other.push([runtimeModel, `FETCH ERROR ${error.message}`]);
    console.log(`${runtimeModel.padEnd(28)} FETCH ERROR`);
    continue;
  }

  const text = await response.text();

  if (!response.ok) {
    const brief = text.replace(/\s+/g, " ").slice(0, 70);
    if (response.status === 404) results.notFound.push(runtimeModel);
    else results.other.push([runtimeModel, `HTTP ${response.status} ${brief}`]);
    console.log(`${runtimeModel.padEnd(28)} HTTP ${response.status}`);
    continue;
  }

  // Deprecation arrives as ordinary text at HTTP 200.
  const deprecated = /no longer available|is not available/i.test(text);
  const produced = (text.match(/"text":\s*"([^"]{0,30})/) || [])[1] ?? "";
  if (deprecated) {
    results.deprecated.push([runtimeModel, produced]);
    console.log(`${runtimeModel.padEnd(28)} 200 DEPRECATED  ${produced}`);
  } else {
    results.ok.push([runtimeModel, produced]);
    console.log(`${runtimeModel.padEnd(28)} 200 OK          ${produced}`);
  }
}

console.log("\n================ SUMMARY");
console.log(`\nWORKS (${results.ok.length}):`);
for (const [id, text] of results.ok) console.log(`  ${id.padEnd(28)} ${text}`);
console.log(`\nDEPRECATED (${results.deprecated.length}) — HTTP 200 but unusable:`);
for (const [id, text] of results.deprecated) console.log(`  ${id.padEnd(28)} ${text}`);
console.log(`\n404 (${results.notFound.length}):`);
console.log(`  ${results.notFound.join(", ")}`);
if (results.other.length) {
  console.log(`\nOTHER (${results.other.length}):`);
  for (const [id, note] of results.other) console.log(`  ${id.padEnd(28)} ${note}`);
}

#!/usr/bin/env node
/** Verify catalog -> runtime routing and live behaviour of each catalog entry. */
import { loadPlugin } from "./_load.mjs";
import { MODELS, PROVIDER } from "../lib/constants.js";
import { CredentialStore } from "../lib/store.js";

const { AntigravityAdapter, runtimeModelFor, fallbackRuntimeModel } = await loadPlugin();

console.log("=== routing table ===");
for (const model of MODELS) {
  const effort = model.efforts.includes("medium") ? "medium" : model.efforts[0];
  const runtime = runtimeModelFor(model.id, effort);
  console.log(`${model.id.padEnd(26)} @${effort.padEnd(7)} -> ${runtime.padEnd(26)} fallback=${fallbackRuntimeModel(runtime, effort) ?? "-"}`);
}

const store = new CredentialStore();
if (!(await store.read())) {
  console.log("\nno credential; skipping live check");
  process.exit(0);
}

console.log("\n=== live: adapter.stream() per catalog model ===");
const adapter = new AntigravityAdapter(store);

for (const model of MODELS) {
  const effort = model.efforts.includes("medium") ? "medium" : model.efforts[0];
  let text = "";
  let finish;
  let error;
  const started = Date.now();
  try {
    for await (const chunk of adapter.stream({
      provider: PROVIDER,
      model: model.id,
      messages: [{ role: "user", content: "Reply with exactly: ok" }],
      maxTokens: 4096,
      reasoningEffort: effort,
    })) {
      if (chunk.type === "text-delta") text += chunk.text;
      else if (chunk.type === "finish") finish = chunk.reason;
    }
  } catch (e) {
    error = e;
  }
  const ms = Date.now() - started;
  if (error) {
    console.log(`${model.id.padEnd(26)} ERROR ${error.code ?? ""} ${String(error.message).slice(0, 90)}`);
  } else {
    console.log(`${model.id.padEnd(26)} ${String(ms).padStart(6)}ms  finish=${JSON.stringify(finish)}  text=${JSON.stringify(text.slice(0, 40))}`);
  }
}

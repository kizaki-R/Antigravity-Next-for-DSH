#!/usr/bin/env node
/**
 * Tool-calling test: the path an agent plugin actually depends on.
 *
 * Verifies
 *   1. tools are declared to the backend and a call comes back
 *   2. the emitted tool-call block carries a usable id + JSON arguments
 *   3. a follow-up turn that replays the tool call and its result is accepted
 *   4. the model then answers with text
 */
import { CredentialStore } from "../lib/store.js";
import { loadPlugin } from "./_load.mjs";
import { PROVIDER } from "../lib/constants.js";

const { AntigravityAdapter } = await loadPlugin();

const MODEL = process.env.TOOL_MODEL ?? "gemini-3.8-flash";

const tools = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
        unit: { type: "string", enum: ["c", "f"], description: "Temperature unit" },
      },
      required: ["city"],
      additionalProperties: false,
    },
  },
];

const store = new CredentialStore();
if (!(await store.read())) {
  console.error("no credential");
  process.exit(1);
}
const adapter = new AntigravityAdapter(store);

/* ---- turn 1: expect a tool call ---------------------------------------- */

console.log(`=== turn 1 (tools declared, model=${MODEL}) ===`);
const turn1 = [{ role: "user", content: "What is the weather in Tokyo? Use the tool." }];

let toolCall;
let text1 = "";
let finish1;
let replayState1;
const emitted1 = []; // the real blocks, in order — the host keeps exactly these
for await (const chunk of adapter.stream({
  provider: PROVIDER,
  model: MODEL,
  messages: turn1,
  tools,
  toolChoice: "auto",
  maxTokens: 8192,
  reasoningEffort: "medium",
})) {
  if (chunk.type === "block-start" && chunk.blockType === "tool-call") {
    console.log(`  block-start tool-call index=${chunk.index}`);
  } else if (chunk.type === "block-end") {
    emitted1.push(chunk.block);
  } else if (chunk.type === "tool-call-delta") {
    if (!toolCall) toolCall = { id: chunk.id, name: chunk.name, arguments: "" };
    if (chunk.name) toolCall.name = chunk.name;
    if (chunk.argumentsDelta) toolCall.arguments += chunk.argumentsDelta;
  } else if (chunk.type === "text-delta") {
    text1 += chunk.text;
  } else if (chunk.type === "finish") {
    finish1 = chunk.reason;
    // The host stashes this envelope on message.source; nothing else carries it.
    replayState1 = chunk.replayState;
  }
}

console.log(`  finish: ${JSON.stringify(finish1)}`);
if (text1) console.log(`  text: ${JSON.stringify(text1.slice(0, 120))}`);
if (!toolCall) {
  console.log("  NO TOOL CALL returned");
  process.exit(1);
}
console.log(`  tool call: name=${toolCall.name} id=${toolCall.id}`);
console.log(`  arguments: ${toolCall.arguments}`);
console.log(`  emitted blocks: ${JSON.stringify(emitted1.map((b) => b.type))}`);
console.log(`  replayState: kind=${replayState1?.kind} provider=${replayState1?.provider}`);
console.log(`  replay blocks: ${JSON.stringify(replayState1?.blocks)}`);
if (replayState1?.provider !== PROVIDER) {
  console.log("  FAILED: replayState.provider is missing — the host will refuse to replay it");
  process.exit(1);
}
// The host pairs these by position and drops the envelope when lengths differ.
if ((replayState1?.blocks?.length ?? -1) !== emitted1.length) {
  console.log(
    `  FAILED: replayState.blocks (${replayState1?.blocks?.length}) must align 1:1 with emitted blocks (${emitted1.length})`,
  );
  process.exit(1);
}

let args;
try {
  args = JSON.parse(toolCall.arguments);
  console.log(`  parsed arguments: ${JSON.stringify(args)}`);
} catch (error) {
  console.log(`  ARGUMENTS ARE NOT VALID JSON: ${error.message}`);
  process.exit(1);
}
if (args.city !== "Tokyo") {
  console.log(`  WARNING: expected city=Tokyo, got ${JSON.stringify(args.city)}`);
}
if (finish1?.kind !== "tool-calls") {
  console.log(`  WARNING: expected finish kind tool-calls, got ${JSON.stringify(finish1)}`);
}

/* ---- turn 2: replay the call and its result ----------------------------- */

console.log("\n=== turn 2 (replay tool call + result) ===");
const turn2 = [
  ...turn1,
  {
    role: "assistant",
    // Replaying the emitted blocks verbatim is what makes the positional
    // replayState lookup line up.
    content: emitted1,
    // Exactly how the harness threads signatures back on the next request.
    source: { kind: "model", provider: PROVIDER, model: MODEL, replayState: replayState1 },
  },
  {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        content: "18 degrees celsius, partly cloudy",
      },
    ],
  },
];

let text2 = "";
let finish2;
for await (const chunk of adapter.stream({
  provider: PROVIDER,
  model: MODEL,
  messages: turn2,
  tools,
  maxTokens: 8192,
  reasoningEffort: "medium",
})) {
  if (chunk.type === "text-delta") text2 += chunk.text;
  else if (chunk.type === "finish") finish2 = chunk.reason;
}

console.log(`  finish: ${JSON.stringify(finish2)}`);
console.log(`  text: ${JSON.stringify(text2.slice(0, 400))}`);
if (!text2) {
  console.log("  FAILED: no text after the tool result");
  process.exit(1);
}
console.log("\nTOOL TEST PASSED");

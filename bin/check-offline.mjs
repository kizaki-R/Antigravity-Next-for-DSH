#!/usr/bin/env node
/** Offline checks: imports, catalog shape, routing, host contract conformance. */
import { loadPlugin } from "./_load.mjs";

// lib/index.js needs the host-provided peers, which only resolve inside an
// installed app; loadPlugin() reports that clearly instead of throwing a bare
// ERR_MODULE_NOT_FOUND stack.
const {
  AntigravityAdapter,
  Config,
  apply,
  inject,
  name: pluginName,
  runtimeModelFor,
  fallbackRuntimeModel,
  thinkingConfig,
} = await loadPlugin();
import { MODELS, GONE_RUNTIME_MODELS, ROUTING, RUNTIME_MAX_TOKENS, PROVIDER } from "../lib/constants.js";
import { convertMessages, buildRequestBody } from "../lib/convert.js";

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) console.log(`  PASS  ${label}`);
  else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failures++;
  }
};

console.log("=== module surface ===");
check("apply is a function", typeof apply === "function");
check("named export inject = ['llm']", JSON.stringify(inject) === JSON.stringify(["llm"]));
check("named export name = 'agy-next'", pluginName === "agy-next", String(pluginName));
check("named export Config is a schemastery schema", typeof Config === "function" && "~standard" in Config);
check("AntigravityAdapter is a class", typeof AntigravityAdapter === "function");

// Keep this catalog-only test isolated from a user's real saved visibility list.
const store = { readBook: async () => ({ visibleModels: null }) };
const adapter = new AntigravityAdapter(store);

console.log("\n=== host contract ===");
const info = adapter.providerInfo(PROVIDER);
check("providerInfo id", info.id === PROVIDER, JSON.stringify(info));
check("providerInfo name non-empty", typeof info.name === "string" && info.name.length > 0);

const models = await adapter.listModels(PROVIDER);
check("listModels returns array", Array.isArray(models));
check("listModels count matches catalog", models.length === MODELS.length, `${models.length} vs ${MODELS.length}`);
check("Argon is shown in the provider model list", models.some((model) => model.id === "gemini-4-argon"));
const badModalities = models.filter(
  (m) => !Array.isArray(m.inputModalities) || !m.inputModalities.includes("text"),
);
check("every model has inputModalities", badModalities.length === 0, JSON.stringify(badModalities.map((m) => m.id)));
const badReasoning = models.filter(
  (m) => !m.reasoning || !Array.isArray(m.reasoning.efforts) || m.reasoning.efforts.length === 0,
);
check("every model has reasoning.efforts", badReasoning.length === 0, badReasoning.map((m) => m.id).join(", "));

// The host rejects a defaultEffort that is not among the declared efforts.
const badDefault = models.filter(
  (m) => m.reasoning?.defaultEffort !== undefined &&
    !m.reasoning.efforts.some((e) => e.id === m.reasoning.defaultEffort),
);
check("defaultEffort is one of the declared efforts", badDefault.length === 0, badDefault.map((m) => m.id).join(", "));

// Each effort needs a non-empty id and name, with no duplicate ids.
const badEffortShape = models.filter((m) =>
  (m.reasoning?.efforts ?? []).some((e) => typeof e.id !== "string" || !e.id || typeof e.name !== "string" || !e.name) ||
  new Set((m.reasoning?.efforts ?? []).map((e) => e.id)).size !== (m.reasoning?.efforts ?? []).length,
);
check("effort ids unique and named", badEffortShape.length === 0, badEffortShape.map((m) => m.id).join(", "));

const badContext = models.filter((m) => !Number.isInteger(m.context?.contextWindow) || m.context.contextWindow <= 0);
check("contextWindow is a positive integer", badContext.length === 0, badContext.map((m) => m.id).join(", "));

const badMax = models.filter((m) => !Number.isSafeInteger(m.defaultMaxTokens) || m.defaultMaxTokens <= 0);
check("defaultMaxTokens is a positive integer", badMax.length === 0, badMax.map((m) => m.id).join(", "));

const resolved = await adapter.resolveModel(PROVIDER, MODELS[0].id);
check("resolveModel works", resolved === undefined || typeof resolved === "object");
check("resolveModel id matches request", resolved?.id === MODELS[0].id, JSON.stringify(resolved?.id));
check("resolveModel provider matches", resolved?.provider === PROVIDER);

console.log("\n=== catalog / routing integrity ===");
const routed = Object.keys(ROUTING).filter((id) => !MODELS.some((m) => m.id === id));
check("no ROUTING entry without a catalog model", routed.length === 0, routed.join(", "));

const deadInCatalog = MODELS.filter((m) => GONE_RUNTIME_MODELS.has(m.id));
check("no catalog model is denylisted", deadInCatalog.length === 0, deadInCatalog.map((m) => m.id).join(", "));

let routedToDead = [];
for (const model of MODELS) {
  for (const effort of model.efforts) {
    const runtime = runtimeModelFor(model.id, effort);
    if (GONE_RUNTIME_MODELS.has(runtime)) routedToDead.push(`${model.id}@${effort} -> ${runtime}`);
  }
}
check("no catalog model routes to a known-dead runtime id", routedToDead.length === 0, routedToDead.join(", "));

const uncoveredEfforts = [];
for (const model of MODELS) {
  if (!ROUTING[model.id]) continue;
  for (const effort of model.efforts) {
    if (!ROUTING[model.id][effort]) uncoveredEfforts.push(`${model.id}@${effort}`);
  }
}
check("every declared effort has a routing entry", uncoveredEfforts.length === 0, uncoveredEfforts.join(", "));

const argon = MODELS.find((model) => model.id === "gemini-4-argon");
check("Gemini 4 Argon is in the model catalog", Boolean(argon), MODELS.map((m) => m.id).join(", "));
check("Argon advertises selectable low/medium/high efforts", JSON.stringify(argon?.efforts) === JSON.stringify(["low", "medium", "high"]), JSON.stringify(argon?.efforts));
check("Argon effort routes to official runtime ids",
  ROUTING["gemini-4-argon"]?.low === "gemini-4-argon-low" &&
  ROUTING["gemini-4-argon"]?.medium === "gemini-4-argon-medium" &&
  ROUTING["gemini-4-argon"]?.high === "gemini-4-argon-high");
check("Argon default is medium", runtimeModelFor("gemini-4-argon", "medium") === "gemini-4-argon-medium");
check("Argon variants cap output at advertised 65,536 tokens",
  ["low", "medium", "high"].every((effort) => RUNTIME_MAX_TOKENS[`gemini-4-argon-${effort}`] === 65536));
check("Argon runtime id supplies effort without generic thinking budget",
  thinkingConfig("gemini-4-argon", "gemini-4-argon-medium", "medium", 4096) === undefined);
check("explicit Argon thinking-off disables thoughts",
  thinkingConfig("gemini-4-argon", "gemini-4-argon-low", "off", 4096)?.includeThoughts === false);

console.log("\n=== message conversion ===");
const contents = convertMessages(
  [
    { role: "user", content: "hi" },
    { role: "assistant", content: [{ type: "text", text: "hello" }] },
  ],
  "gemini-3-flash",
  "gemini-3-flash",
);
check("roles mapped to user/model", contents[0]?.role === "user" && contents[1]?.role === "model");

// Empty text parts must not create blocks; covered by stream.js, but verify the
// converter ignores empty assistant text rather than emitting an empty part.
const emptyAssistant = convertMessages(
  [{ role: "assistant", content: [{ type: "text", text: "  " }] }],
  "gemini-3-flash",
  "gemini-3-flash",
);
check("blank assistant text produces no parts", emptyAssistant.length === 0);

// A replayState whose provider mismatches must be ignored entirely.
const mismatched = convertMessages(
  [
    {
      role: "assistant",
      content: [{ type: "tool-call", id: "call_1", name: "f", arguments: "{}" }],
      source: { replayState: { kind: "antigravity", version: 1, provider: "other", blocks: [{ type: "tool-call", thoughtSignature: "SIG" }] } },
    },
  ],
  "gemini-3-flash",
  "gemini-3-flash",
);
const sig = mismatched[0]?.parts?.[0]?.thoughtSignature;
check("mismatched replayState.provider is ignored", sig === undefined, `got ${sig}`);

// A matching replayState must attach its signature.
const matched = convertMessages(
  [
    {
      role: "assistant",
      content: [{ type: "tool-call", id: "call_1", name: "f", arguments: "{}" }],
      source: { replayState: { kind: "antigravity", version: 1, provider: PROVIDER, blocks: [{ type: "tool-call", thoughtSignature: "SIG" }] } },
    },
  ],
  "gemini-3-flash",
  "gemini-3-flash",
);
check("matching replayState attaches thoughtSignature", matched[0]?.parts?.[0]?.thoughtSignature === "SIG");

// Tool-call ids are only for the backends that want them.
const geminiTool = convertMessages(
  [{ role: "assistant", content: [{ type: "tool-call", id: "call_1", name: "f", arguments: "{}" }] }],
  "gemini-3-flash",
  "gemini-3-flash",
);
check("gemini tool call omits id", geminiTool[0]?.parts?.[0]?.functionCall?.id === undefined);
const claudeTool = convertMessages(
  [{ role: "assistant", content: [{ type: "tool-call", id: "call_1", name: "f", arguments: "{}" }] }],
  "claude-sonnet-4-6",
  "claude-sonnet-4-6",
);
check("claude tool call includes id", claudeTool[0]?.parts?.[0]?.functionCall?.id !== undefined);

// A tool result must recover its name from the preceding tool call.
const withResult = convertMessages(
  [
    { role: "assistant", content: [{ type: "tool-call", id: "call_9", name: "get_weather", arguments: "{}" }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "call_9", content: "18C" }] },
  ],
  "gemini-3-flash",
  "gemini-3-flash",
);
const responsePart = withResult[1]?.parts?.[0]?.functionResponse;
check("tool result recovers its name", responsePart?.name === "get_weather", JSON.stringify(responsePart));
check("tool result carries output", responsePart?.response?.output === "18C");

console.log("\n=== request body ===");
const body = buildRequestBody(
  { messages: [{ role: "user", content: "hi" }], modelId: "gemini-3-flash", maxTokens: 4096 },
  "proj",
  "gemini-3-flash",
  undefined,
);
check("body has project", body.project === "proj");
check("body has contents", Array.isArray(body.request?.contents));
check("body has systemInstruction", Array.isArray(body.request?.systemInstruction?.parts));
check("maxOutputTokens set", body.request?.generationConfig?.maxOutputTokens === 4096);

console.log(`\n${failures === 0 ? "ALL OFFLINE CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

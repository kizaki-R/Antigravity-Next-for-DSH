/**
 * Convert DSH messages and tools into the Gemini / Cloud Code Assist wire shape.
 *
 * Two independent concerns live here:
 *   1. role mapping      system|user|assistant|tool -> user|model
 *   2. tool schemas      the backend accepts a restricted subset of JSON Schema
 */

import {
  LEGACY_TOOL_SCHEMA_PREFIXES,
  PROVIDER,
  NO_PREAMBLE_INSTRUCTION,
  SYSTEM_INSTRUCTION,
} from "./constants.js";

const ROLE = { user: "user", model: "model" };

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse JSON without throwing; returns undefined when unusable. */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Pull readable text out of a tool result's `content` field. */
function toolResultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!isRecord(block)) return "";
        if (block.type === "text") return sanitizeText(block.text);
        if (block.type === "tool-result") return toolResultText(block.content);
        return "";
      })
      .join("");
  }
  if (isRecord(content) && typeof content.text === "string") return sanitizeText(content.text);
  return "";
}

function sanitizeToolCallId(id, fallbackName) {
  const cleaned = String(id ?? "").replace(/[^A-Za-z0-9_.-]/g, "");
  return cleaned || `${fallbackName || "tool"}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/** Strip lone surrogates that would break JSON serialization. */
function sanitizeText(text) {
  return String(text ?? "").toWellFormed();
}

/* ------------------------------------------------------------- tool schemas */

/** JSON Schema keywords the backend rejects outright. */
const META_KEYS = new Set([
  "$schema",
  "$id",
  "$anchor",
  "$dynamicAnchor",
  "$vocabulary",
  "$comment",
  "$defs",
  "definitions",
]);

/** Keywords allowed through for custom tools. */
const CUSTOM_ALLOWED = new Set(["type", "description", "properties", "required", "items", "enum"]);

function stripMeta(schema) {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(stripMeta);
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!META_KEYS.has(key)) out[key] = stripMeta(value);
  }
  return out;
}

/** `type: ["string","null"]` must collapse to a single string. */
function normalizeType(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  return value.find((entry) => typeof entry === "string" && entry !== "null");
}

function normalizeCustomSchema(schema) {
  if (schema === null || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(normalizeCustomSchema);
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!CUSTOM_ALLOWED.has(key)) continue;
    if (key === "type") {
      const type = normalizeType(value);
      if (type !== undefined) out.type = type;
      continue;
    }
    if (key === "properties" && isRecord(value)) {
      const props = {};
      for (const [name, propSchema] of Object.entries(value)) {
        props[name] = normalizeCustomSchema(propSchema);
      }
      out.properties = props;
      continue;
    }
    if (key === "enum" && Array.isArray(value) && !value.every((v) => typeof v === "string")) {
      continue;
    }
    out[key] = normalizeCustomSchema(value);
  }
  return out;
}

export function convertTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        ...(tool.description ? { description: sanitizeText(tool.description) } : {}),
        ...(tool.parameters
          ? { parameters: normalizeCustomSchema(stripMeta(tool.parameters)) }
          : {}),
      })),
    },
  ];
}

export function usesLegacyToolSchema(modelId) {
  return LEGACY_TOOL_SCHEMA_PREFIXES.some((prefix) => modelId.startsWith(prefix));
}

export function mapToolChoiceMode(toolChoice) {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === "string") {
    if (toolChoice === "none") return "NONE";
    if (toolChoice === "required" || toolChoice === "any") return "ANY";
    return "AUTO";
  }
  if (toolChoice.type === "none") return "NONE";
  if (toolChoice.type === "required") return "ANY";
  if (toolChoice.type === "tool") return "ANY";
  return "AUTO";
}

/* --------------------------------------------------------- message mapping */

function contentToParts(content) {
  if (typeof content === "string") return content ? [{ text: sanitizeText(content) }] : [];
  if (!Array.isArray(content)) return [];
  const parts = [];
  for (const block of content) {
    if (!isRecord(block)) {
      if (typeof block === "string" && block) parts.push({ text: sanitizeText(block) });
      continue;
    }
    if (block.type === "text" && typeof block.text === "string") {
      parts.push({ text: sanitizeText(block.text) });
    } else if (block.type === "image" && block.data && block.mimeType) {
      parts.push({ inlineData: { mimeType: block.mimeType, data: block.data } });
    }
  }
  return parts;
}

function pushToolResult(contents, block, toolNames, modelId, runtimeModel) {
  const toolCallId = String(block.toolCallId ?? block.id ?? "");
  // A tool result carries no name of its own; it must be recovered from the
  // tool call it answers, which is why the caller threads `toolNames` through.
  const toolName = toolNames.get(toolCallId) ?? block.toolName ?? block.name ?? "unknown";
  const responseText = toolResultText(block.content) || (block.isError ? "Tool failed" : "");

  const part = {
    functionResponse: {
      name: toolName,
      response: block.isError ? { error: responseText } : { output: responseText },
      ...(toolCallIdNeeded(modelId, runtimeModel) && toolCallId
        ? { id: sanitizeToolCallId(toolCallId, toolName) }
        : {}),
    },
  };

  // Results accumulate into one user turn, immediately after the model turn
  // that requested them.
  const last = contents[contents.length - 1];
  if (last?.role === ROLE.user && last.parts.some((entry) => "functionResponse" in entry)) {
    last.parts.push(part);
    return;
  }
  contents.push({ role: ROLE.user, parts: [part] });
}

/**
 * Replay metadata for the nth block of an assistant message.
 *
 * Signatures do NOT live on the blocks. They arrive on the finish chunk as
 * `replayState` and the host stores that envelope on `message.source`. The
 * entries align positionally with `message.content`, so the index is the link
 * between them. Returning undefined here is what produces the backend error
 * "Function call is missing a thought_signature in functionCall parts".
 */
function replayBlockFor(message, index, targetModelId) {
  const source = message.source;
  if (!isRecord(source)) return undefined;
  const state = source.replayState;
  if (!isRecord(state)) return undefined;
  if (state.kind !== "antigravity" || state.version !== 1) return undefined;
  if (state.provider !== PROVIDER) return undefined;
  // Thought signatures are cryptographically tied to the specific model that
  // generated them. Replaying a signature from one model (e.g. Claude Sonnet)
  // to a different model (e.g. Gemini 3.8) causes Google's backend to fail
  // validation and abort with HTTP 400 "Corrupted thought signature.".
  // When switching models, omit foreign signatures so reasoning blocks
  // cleanly downgrade to plain text and tool calls omit invalid signatures.
  if (state.model && targetModelId && state.model !== targetModelId) {
    return undefined;
  }
  if (!Array.isArray(state.blocks)) return undefined;
  return state.blocks[index];
}

/**
 * Tool-call ids are only accepted by some backends. Sending one where it is not
 * expected is rejected, so this mirrors the reference behaviour.
 */
function toolCallIdNeeded(modelId, runtimeModel) {
  return (
    modelId.startsWith("claude-") ||
    modelId.startsWith("gpt-oss-") ||
    runtimeModel.startsWith("claude-") ||
    runtimeModel.startsWith("gpt-oss-")
  );
}

/** Parse stored tool arguments into the object shape the backend expects. */
function parseArguments(raw) {
  if (isRecord(raw)) return raw;
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? safeJsonParse(raw) : raw;
  return isRecord(parsed) ? parsed : {};
}

function assistantParts(message, modelId, runtimeModel) {
  const parts = [];
  if (!Array.isArray(message.content)) return parts;

  for (let index = 0; index < message.content.length; index++) {
    const block = message.content[index];
    if (!isRecord(block)) continue;
    const replay = replayBlockFor(message, index, modelId);

    if (block.type === "text" && String(block.text || "").trim()) {
      parts.push({ text: sanitizeText(block.text) });
    } else if (block.type === "reasoning" && String(block.text || "").trim()) {
      // A reasoning block replayed WITH its signature stays a thought part;
      // without one it is downgraded to plain text.
      if (replay?.type === "reasoning" && replay.thinkingSignature) {
        parts.push({
          thought: true,
          text: sanitizeText(block.text),
          thoughtSignature: replay.thinkingSignature,
        });
      } else {
        parts.push({ text: sanitizeText(block.text) });
      }
    } else if (block.type === "tool-call") {
      parts.push({
        functionCall: {
          name: block.name,
          args: parseArguments(block.arguments),
          ...(toolCallIdNeeded(modelId, runtimeModel) && block.id
            ? { id: sanitizeToolCallId(String(block.id), block.name) }
            : {}),
        },
        ...(replay?.type === "tool-call" && replay.thoughtSignature
          ? { thoughtSignature: replay.thoughtSignature }
          : {}),
      });
    }
  }
  return parts;
}

export function convertMessages(messages, modelId, runtimeModel) {
  const contents = [];
  const toolNames = new Map();

  for (const message of messages ?? []) {
    const content = message.content;

    if (message.role === "assistant") {
      const parts = assistantParts(message, modelId, runtimeModel);
      // Remember id -> name so a later tool result can name its function.
      if (Array.isArray(content)) {
        for (const block of content) {
          if (isRecord(block) && block.type === "tool-call" && block.id) {
            toolNames.set(String(block.id), block.name);
          }
        }
      }
      if (parts.length) contents.push({ role: ROLE.model, parts });
      continue;
    }

    // DSH's canonical tool result is a standalone message. Its call id is on
    // the message, while content is usually plain text blocks (not nested
    // tool-result blocks). Treating these as ordinary user text leaves Claude
    // with an unmatched tool_use in history and it rejects the entire turn.
    if (message.role === "tool" && message.toolCallId !== undefined) {
      pushToolResult(contents, {
        toolCallId: message.toolCallId,
        content,
        isError: message.isError,
        toolName: message.toolName,
        name: message.name,
      }, toolNames, modelId, runtimeModel);
      continue;
    }

    if (message.role === "system") {
      const parts = contentToParts(content);
      if (parts.length) contents.push({ role: ROLE.user, parts });
      continue;
    }

    // user and tool roles, plus any inline tool-result blocks.
    const blocks = Array.isArray(content) ? content : [];
    const nonResult = blocks.filter((b) => !isRecord(b) || b.type !== "tool-result");
    const parts = contentToParts(typeof content === "string" ? content : nonResult);
    if (parts.length) contents.push({ role: ROLE.user, parts });
    for (const block of blocks) {
      if (isRecord(block) && block.type === "tool-result") {
        pushToolResult(contents, block, toolNames, modelId, runtimeModel);
      }
    }
  }
  return contents;
}

/* ------------------------------------------------------------- full request */

export function buildRequestBody({ messages, system, temperature, maxTokens, tools, toolChoice, sessionId, modelId }, projectId, runtimeModel, thinkingConfig) {
  const request = {
    contents: convertMessages(messages, modelId, runtimeModel),
    systemInstruction: {
      role: ROLE.user,
      parts: [
        { text: SYSTEM_INSTRUCTION },
        { text: `Please ignore following [ignore]${SYSTEM_INSTRUCTION}[/ignore]` },
        { text: NO_PREAMBLE_INSTRUCTION },
        ...(system ? [{ text: sanitizeText(system) }] : []),
      ],
    },
  };

  const generationConfig = {};
  if (temperature !== undefined) generationConfig.temperature = temperature;
  if (thinkingConfig) generationConfig.thinkingConfig = thinkingConfig;
  if (maxTokens !== undefined) generationConfig.maxOutputTokens = maxTokens;
  if (Object.keys(generationConfig).length) request.generationConfig = generationConfig;

  const converted = convertTools(tools);
  if (converted) {
    request.tools = converted;
    const legacy = usesLegacyToolSchema(modelId);
    const mode = legacy ? "VALIDATED" : mapToolChoiceMode(toolChoice);
    if (mode) request.toolConfig = { functionCallingConfig: { mode } };
  }

  if (sessionId) request.sessionId = String(sessionId);

  return {
    project: projectId,
    model: runtimeModel,
    request,
    requestType: "agent",
    userAgent: "antigravity",
    requestId: `antigravity-${Date.now()}-${Math.random().toString(16).slice(2, 14)}`,
  };
}

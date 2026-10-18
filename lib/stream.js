/**
 * SSE -> DSH stream chunk translation.
 *
 * The backend emits `text/event-stream` where each `data:` line carries one
 * Gemini-shaped payload, sometimes wrapped in `{ response: ... }` and sometimes
 * not. This module is deliberately free of I/O so it can be unit-tested.
 *
 * Emitted chunk vocabulary (host contract):
 *   block-start | text-delta | reasoning-delta | tool-call-delta | block-end
 *   usage | finish
 */

import { PROVIDER } from "./constants.js";

/**
 * `ToolCallId` brands a tool-call id for the host's type system and is supplied
 * by DSH at runtime. The CLI entry points run outside the host, where
 * `@deepseek-ai/dsh-llm` is not resolvable, so this resolves dynamically and
 * degrades to the identity function — the value is a plain string either way.
 */
let ToolCallId = (id) => id;
try {
  const mod = await import("@deepseek-ai/dsh-llm");
  if (typeof mod.ToolCallId === "function") ToolCallId = mod.ToolCallId;
} catch {
  // Outside the host: identity is correct because the value is just a string.
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeText(text) {
  return String(text ?? "").toWellFormed();
}

let toolCallCounter = 0;

export function sanitizeToolCallId(id, fallbackName) {
  const cleaned = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return cleaned || `${fallbackName || "tool"}_${Date.now()}_${++toolCallCounter}`;
}

export function createStreamState() {
  return {
    blocks: [],
    replayBlocks: [],
    currentBlock: null,
    finishReason: undefined,
    usage: {},
    hasContent: false,
    hasToolCall: false,
    // Whether thought content was actually streamed to the host. This decides
    // whether thinking tokens belong in `outputTokens`; see mapUsage().
    sawReasoning: false,
  };
}

/**
 * Fold one SSE line into the stream state.
 * @returns chunks to emit (possibly empty)
 */
export function processStreamLine(line, state) {
  if (!line.startsWith("data:")) return [];
  const json = line.slice(5).trim();
  if (!json || json === "[DONE]") return [];

  let chunk;
  try {
    chunk = JSON.parse(json);
  } catch {
    return [];
  }
  if (!isRecord(chunk)) return [];

  if (isRecord(chunk.error)) {
    const message = chunk.error.message || JSON.stringify(chunk.error);
    throw new Error(String(message));
  }

  // Accept both `{response:{...}}` and a bare payload.
  const payload = isRecord(chunk.response) ? chunk.response : chunk;
  const candidate = Array.isArray(payload.candidates) ? payload.candidates[0] : undefined;
  const parts =
    isRecord(candidate?.content) && Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : [];

  const out = [];

  const closeCurrentBlock = () => {
    if (!state.currentBlock) return;
    const index = state.blocks.length - 1;
    out.push({
      type: "block-end",
      index,
      block:
        state.currentBlock.type === "text"
          ? { type: "text", text: state.currentBlock.text }
          : { type: "reasoning", text: state.currentBlock.text },
    });
    state.currentBlock = null;
  };

  for (const part of parts) {
    if (!isRecord(part)) continue;

    if (part.text !== undefined) {
      const isThinking = part.thought === true;
      const blockType = isThinking ? "reasoning" : "text";
      const delta = sanitizeText(part.text);
      const sameKindOpen = state.currentBlock?.type === blockType;

      // The backend pads a turn with empty text parts. An empty delta must not
      // open a block: the phantom block would desynchronise `replayState.blocks`
      // from the blocks the host assembles, and the host then discards the whole
      // replay envelope, which breaks tool calling on the following turn.
      // An empty part that still carries a signature is kept, since that
      // signature is exactly what the next request has to replay.
      const worthOpening = delta !== "" || Boolean(part.thoughtSignature) || sameKindOpen;
      if (worthOpening) {
        // Consecutive same-kind text parts extend one block; a kind switch closes it.
        if (!sameKindOpen) {
          closeCurrentBlock();
          state.currentBlock = { type: blockType, text: "" };
          state.blocks.push(state.currentBlock);
          state.replayBlocks.push({ type: blockType });
          out.push({ type: "block-start", index: state.blocks.length - 1, blockType });
        }

        if (delta !== "") {
          state.currentBlock.text += delta;
          state.hasContent = true;
          // Only a NON-EMPTY reasoning delta starts the host's clock (it tests
          // `chunk.text !== ""`), so only then was thinking inside the window.
          if (isThinking && delta !== "") state.sawReasoning = true;
          out.push({
            type: isThinking ? "reasoning-delta" : "text-delta",
            index: state.blocks.length - 1,
            text: delta,
          });
        }

        if (part.thoughtSignature) {
          const replay = state.replayBlocks[state.blocks.length - 1];
          if (isThinking) replay.thinkingSignature = part.thoughtSignature;
          else replay.textSignature = part.thoughtSignature;
        }
      }
    }

    if (isRecord(part.functionCall)) {
      closeCurrentBlock();
      const toolName = typeof part.functionCall.name === "string" ? part.functionCall.name : "";
      const toolId = sanitizeToolCallId(part.functionCall.id || "", toolName);
      const args = isRecord(part.functionCall.args) ? part.functionCall.args : {};
      const argsText = JSON.stringify(args);
      const index = state.blocks.length;
      const block = { type: "tool-call", id: ToolCallId(toolId), name: toolName, arguments: argsText };

      state.blocks.push(block);
      state.replayBlocks.push({
        type: "tool-call",
        ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
      });
      state.hasContent = true;
      state.hasToolCall = true;

      out.push({ type: "block-start", index, blockType: "tool-call" });
      out.push({
        type: "tool-call-delta",
        index,
        id: ToolCallId(toolId),
        ...(toolName ? { name: toolName } : {}),
        argumentsDelta: argsText,
      });
      out.push({ type: "block-end", index, block });
    }
  }

  if (candidate?.finishReason) state.finishReason = candidate.finishReason;
  if (isRecord(payload.usageMetadata)) state.usage = payload.usageMetadata;
  return out;
}

/**
 * Map the backend's `usageMetadata` onto the DSH `TokenUsage` contract.
 *
 * The host's measured rate is `sum(outputTokens) / sum(completedTime -
 * firstTokenTime)`, and the timer starts at the FIRST delta of any kind —
 * including `reasoning-delta`. So the numerator must cover the same span the
 * denominator timed.
 *
 * The Gemini wire reports thoughts as a DISJOINT sibling of the answer:
 *   totalTokenCount = promptTokenCount + candidatesTokenCount + thoughtsTokenCount
 * (verified frame by frame against the live endpoint; `candidates` stays at 0
 * while `thoughts` climbs to thousands). Reporting
 * `outputTokens = candidatesTokenCount` alone therefore drops every thinking
 * token out of the numerator while the denominator still pays for the whole
 * thinking phase, which deflates the displayed rate — measured at 5.9 tok/s
 * where the model actually produced ~145.
 *
 * DSH's own contract is that `reasoningTokens` is a SUBSET of `outputTokens`
 * (the client discards the whole usage disclosure when
 * `reasoningTokens > outputTokens`). Gemini's numbers are disjoint, so the two
 * are reconciled differently depending on whether thoughts were streamed:
 *
 *   streamed     -> fold thoughts into `outputTokens` (numerator == denominator)
 *   not streamed -> leave `outputTokens` alone and attach `reasoningTokens`
 *                   (they were generated before the first visible delta, so
 *                   their time is legitimately outside the measured window)
 */
export function mapUsage(usage, { sawReasoning = false } = {}) {
  const answerTokens = Math.max(0, usage.candidatesTokenCount || 0);
  const thoughtTokens = Math.max(0, usage.thoughtsTokenCount || 0);
  const inputTokens = Math.max(0, (usage.promptTokenCount || 0) - (usage.cachedContentTokenCount || 0));

  if (sawReasoning) {
    // Thinking is inside the measured span, so it belongs in the numerator.
    // Keep the breakdown as a subset so the disclosure still validates.
    return {
      inputTokens,
      outputTokens: answerTokens + thoughtTokens,
      ...(usage.cachedContentTokenCount > 0 ? { cacheReadTokens: usage.cachedContentTokenCount } : {}),
      ...(thoughtTokens > 0 ? { reasoningTokens: thoughtTokens } : {}),
    };
  }

  // Thoughts were not streamed, so they were produced entirely before the first
  // visible delta and their time is already outside the measured window. Putting
  // them in the numerator would inflate the rate; reporting them as
  // `reasoningTokens` would break the subset rule (they routinely exceed the
  // answer on this wire, and the host then discards the whole disclosure).
  // They are therefore left out of the disclosure, exactly as pi-ai does.
  return {
    inputTokens,
    outputTokens: answerTokens,
    ...(usage.cachedContentTokenCount > 0 ? { cacheReadTokens: usage.cachedContentTokenCount } : {}),
  };
}

/** Order matters: error, then empty, then tool-calls, then max-tokens, then stop. */
export function finishReasonOf(rawReason, hasToolCall, hasContent) {
  if (!hasContent) {
    return {
      kind: "error",
      failure: {
        message: "Antigravity returned a completed response with no content",
        code: "EMPTY_RESPONSE",
      },
    };
  }
  if (hasToolCall) return { kind: "tool-calls" };
  if (rawReason === "MAX_TOKENS") return { kind: "max-tokens" };
  if (!rawReason || rawReason === "STOP") return { kind: "stop" };
  return {
    kind: "error",
    failure: { message: `Antigravity finished with reason ${rawReason}`, code: "ANTIGRAVITY_FINISH_REASON" },
  };
}

/**
 * Consume an SSE response body and yield DSH chunks.
 * `state` is reused so the caller can inspect usage/finish after the loop.
 */
export async function* streamResponseToChunks(response, state, { modelId, runtimeModel }) {
  if (!response.body) throw new Error("Antigravity response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emit = (line) => processStreamLine(line.replace(/\r$/, ""), state);

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (!(result.value instanceof Uint8Array)) continue;
    buffer += decoder.decode(result.value, { stream: true });

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      for (const chunk of emit(line)) yield chunk;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const chunk of emit(buffer.trimEnd())) yield chunk;
  }

  // A stream that ends mid-block must still close it, or content is truncated.
  if (state.currentBlock) {
    const index = state.blocks.length - 1;
    yield {
      type: "block-end",
      index,
      block:
        state.currentBlock.type === "text"
          ? { type: "text", text: state.currentBlock.text }
          : { type: "reasoning", text: state.currentBlock.text },
    };
    state.currentBlock = null;
  }

  if (!state.hasContent) return;

  yield { type: "usage", usage: mapUsage(state.usage || {}, { sawReasoning: state.sawReasoning }) };
  yield {
    type: "finish",
    reason: finishReasonOf(state.finishReason, state.hasToolCall, state.hasContent),
    // Shape and positional alignment matter: the host pairs `blocks[n]` with
    // the nth emitted block, and silently drops the envelope when the lengths
    // disagree. `provider` is required or the host refuses to replay at all.
    replayState: {
      kind: "antigravity",
      version: 1,
      provider: PROVIDER,
      model: modelId,
      runtimeModel,
      blocks: state.replayBlocks,
    },
  };
}

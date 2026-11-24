/**
 * DSH adapter for the official ACP route. Registered as provider `agy-next`.
 * Does not read Antigravity's token store and does not carry a client id.
 *
 * Tools are exposed to the official agent through a per-request loopback MCP
 * bridge and executed through DSH's ToolRuntime. This is intentionally the
 * opposite direction from emitting provider-side tool-call chunks: the host
 * agent loop only executes assembled tool calls after the adapter stream ends,
 * which would deadlock an ACP prompt that is waiting on its MCP tool result.
 */

import {
  LlmAdapter,
  LlmError,
  ToolCallId,
  createAssistantMessage,
  createToolResultMessage,
} from "@deepseek-ai/dsh-llm";

import { AcpError, DshTextMapper } from "./connection.js";
import { listAcpModels, promptAcp, transcriptText } from "./service.js";

// Mirrors @deepseek-ai/dsh-tools' exported code, inlined so this plugin does not
// take a hard dependency on a package the desktop profile does not expose.
const TOOL_ABORTED_BEFORE_DISPATCH = "ABORTED_BEFORE_DISPATCH";

export const ACP_PICKER_CONTEXT = 1_048_576;
export const ACP_PICKER_MAX_TOKENS = 65_536;

/**
 * Select the single safe `allow_once` option advertised by an ACP
 * `session/request_permission` payload. Never falls back to `allow_always`.
 *
 * Production `AntigravityAcpAdapter` stays fail-closed (cancels all ACP-native
 * permission requests) because ACP v1 provides no cryptographic or protocol-level
 * correlation proving that a `session/request_permission` event comes from this
 * turn's DSH MCP bridge rather than an ACP-native operation spoofing a tool name.
 */
export function selectSafeAllowOnceOption(optionsList) {
  if (!Array.isArray(optionsList)) return undefined;
  const allowOnce = optionsList.find(
    (option) =>
      option &&
      typeof option === "object" &&
      option.kind === "allow_once" &&
      typeof option.optionId === "string" &&
      option.optionId.length > 0,
  );
  return allowOnce ? allowOnce.optionId : undefined;
}

/**
 * Resolve the open `{ turn, step }` boundary of a live DSH Session.
 * Returns `undefined` when the session log has no currently open `step/start`
 * inside an open `turn/start`.
 */
export function resolveOpenTurnStep(session) {
  if (!session || typeof session.snapshotEvents !== "function" || typeof session.append !== "function") {
    return undefined;
  }
  const events = session.snapshotEvents();
  if (!Array.isArray(events)) return undefined;
  let openStep;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event || typeof event !== "object") continue;
    if (event.type === "turn/end") {
      return undefined;
    }
    if (event.type === "step/end") {
      if (!openStep) return undefined;
      if (event.data?.turn === openStep.turn && event.data?.step === openStep.step) {
        return undefined;
      }
      continue;
    }
    if (event.type === "step/start") {
      if (!openStep) {
        const turn = event.data?.turn;
        const step = event.data?.step;
        if (!Number.isSafeInteger(turn) || turn <= 0 || !Number.isSafeInteger(step) || step <= 0) {
          return undefined;
        }
        openStep = { turn, step };
      }
      continue;
    }
    if (event.type === "turn/start") {
      if (openStep && event.data?.turn === openStep.turn) return openStep;
      return undefined;
    }
  }
  return undefined;
}

function getContextService(ctx, name) {
  if (!ctx || typeof ctx !== "object") return undefined;
  if (typeof ctx.get === "function") {
    try {
      const resolved = ctx.get(name);
      if (resolved !== undefined) return resolved;
    } catch {}
  }
  try {
    return ctx[name];
  } catch {
    return undefined;
  }
}

/**
 * Flush buffered session events through DSH's `SessionStore.flush(session)`
 * durability checkpoint when the session is live in a mounted `SessionStore`.
 * When no persistence listener is registered, `SessionStore.flush()` resolves
 * to `false` (a safe no-op). When a durability listener rejects, this throws
 * so the caller fails closed.
 */
async function flushDurableSession(session, agent, hostCtx) {
  const store = getContextService(agent?.ctx, "sessions") ?? getContextService(hostCtx, "sessions");
  if (!store || typeof store.flush !== "function" || typeof store.get !== "function") {
    return false;
  }
  if (store.get(session.id) !== session) {
    return false;
  }
  return await store.flush(session);
}

export class AntigravityAcpAdapter extends LlmAdapter {
  constructor(ctx) {
    super();
    this.ctx = ctx;
  }

  providerInfo(provider) {
    return { id: provider, name: "Antigravity Next" };
  }

  async listModels(provider) {
    const discovered = await listAcpModels().catch(() => ({ models: [] }));
    return discovered.models.map((model) => ({
      provider,
      id: model.id,
      name: model.name,
      inputModalities: ["text"],
      context: { contextWindow: ACP_PICKER_CONTEXT },
      defaultMaxTokens: ACP_PICKER_MAX_TOKENS,
    }));
  }

  async resolveModel(provider, modelId) {
    return {
      provider,
      id: modelId,
      name: modelId,
      inputModalities: ["text"],
      context: { contextWindow: ACP_PICKER_CONTEXT },
      defaultMaxTokens: ACP_PICKER_MAX_TOKENS,
    };
  }

  /** Resolve the exact live agent that owns this model request. */
  resolveAgent(options) {
    const agents = getContextService(this.ctx, "agents");
    if (!agents) return undefined;
    const byId = options.sessionId && typeof agents.get === "function"
      ? agents.get(options.sessionId)
      : undefined;
    const initiator = typeof agents.currentInitiator === "function" ? agents.currentInitiator() : undefined;
    // If both explicit session identity and process-local attribution exist,
    // they must identify the exact same live Agent. A stale or mismatched id is
    // never repaired by falling back to whichever Agent happens to be ambient.
    if (options.sessionId && (!byId || (initiator && initiator !== byId))) return undefined;
    return byId ?? initiator;
  }

  resolveCwd(options) {
    const agent = this.resolveAgent(options);
    const headerCwd = agent?.session?.header?.cwd;
    const explicitCwd = options.cwd;
    const cwd = typeof explicitCwd === "string" && explicitCwd ? explicitCwd : headerCwd;
    if (typeof cwd !== "string" || !cwd || !isAbsolutePath(cwd)) {
      throw new LlmError("ACP requires the live DSH session to provide an absolute workspace path", "INVALID_REQUEST");
    }
    if (headerCwd && explicitCwd && headerCwd !== explicitCwd) {
      throw new LlmError("ACP working directory does not match the live DSH session", "INVALID_REQUEST");
    }
    return cwd;
  }

  /**
   * Execute one MCP tool call through DSH's public ToolRuntime pipeline
   * (pre-policy, approval, guards, body, post-policy, events) and durably
   * record the paired `assistant/message` (tool-call), `tool/call`, and
   * `tool/result` events when the agent owns an event-sourced DSH Session.
   */
  async executeTool({ id, name, arguments: args, signal }, agent, outerSignal, allowedToolNames, route) {
    const scopedTools = getContextService(agent?.ctx, "tools") ?? getContextService(this.ctx, "tools");
    const agentsRegistry = getContextService(this.ctx, "agents");
    if (!agent || agentsRegistry?.get?.(agent.id) !== agent) {
      throw new LlmError("No exact live DSH Agent is available for this ACP tool call", "UPSTREAM_ERROR");
    }
    if (!(allowedToolNames instanceof Set) || !allowedToolNames.has(name)) {
      throw new LlmError(`ACP requested a DSH tool not declared for this live turn: ${name}`, "UPSTREAM_ERROR");
    }
    if (!scopedTools || typeof scopedTools.execute !== "function") {
      throw new LlmError("DSH agent-scoped tool runtime is unavailable", "UPSTREAM_ERROR");
    }
    const fused = fuseSignals(signal, outerSignal);
    const callId = ToolCallId(String(id));
    const session = agent.session;
    const isDurableSession = Boolean(
      session &&
      typeof session.append === "function" &&
      typeof session.snapshotEvents === "function",
    );

    if (!isDurableSession) {
      return scopedTools.execute({
        callId,
        name,
        arguments: args,
        ...(agent ? { agent } : {}),
        signal: fused,
      });
    }

    const pos = resolveOpenTurnStep(session);
    if (!pos) {
      throw new LlmError(
        "DSH session has no open turn/step boundary for durable tool recording",
        "UPSTREAM_ERROR",
      );
    }

    let serializedArgs;
    try {
      serializedArgs = JSON.stringify(args ?? {});
    } catch (cause) {
      throw new LlmError("ACP tool arguments are not JSON-serializable", "INVALID_REQUEST", { cause });
    }

    const provider = typeof route?.provider === "string" && route.provider ? route.provider : "agy-next";
    const model = typeof route?.model === "string" && route.model ? route.model : "acp-current";

    // 1. Pre-record the assistant tool-call message and started tool/call event
    // BEFORE invoking the tool body. If either append throws, the call fails
    // closed and the tool body never runs.
    session.append(
      "assistant/message",
      {
        turn: pos.turn,
        step: pos.step,
        message: createAssistantMessage({
          content: [
            {
              type: "tool-call",
              id: callId,
              name,
              arguments: serializedArgs,
            },
          ],
          source: {
            provider,
            model,
          },
        }),
        stream: [],
      },
      { surfaceOp: "append" },
    );

    const callSeq = session.append("tool/call", {
      turn: pos.turn,
      step: pos.step,
      callId,
      name,
      arguments: serializedArgs,
    }).seq;

    // Await the SessionStore durability checkpoint before invoking the tool
    // body so pre-execution audit events reach any mounted persistence backend
    // first. A flush failure throws and fails closed before the tool body runs;
    // an in-memory session with no flush listeners returns `false` (safe no-op).
    await flushDurableSession(session, agent, this.ctx);

    let result;
    try {
      if (fused.aborted) {
        result = {
          content: [{ type: "text", text: "Error: tool call aborted before dispatch" }],
          isError: true,
          error: {
            message: "tool call aborted before dispatch",
            info: { name: "AbortError", code: TOOL_ABORTED_BEFORE_DISPATCH },
          },
        };
      } else {
        result = await scopedTools.execute({
          callId,
          name,
          arguments: args,
          agent,
          signal: fused,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
        error: {
          message,
          info: {
            name: error instanceof Error ? error.name : "Error",
            code: typeof error?.code === "string" ? error.code : "TOOL_EXECUTION_FAILED",
          },
        },
      };
    }

    // 2. Durably record the matched tool/result linked to callSeq via sourceEventSeqs.
    session.append(
      "tool/result",
      {
        turn: pos.turn,
        step: pos.step,
        message: createToolResultMessage({
          callId,
          content: Array.isArray(result?.content) && result.content.length > 0
            ? result.content
            : [{ type: "text", text: result?.isError ? "Error: tool execution failed" : "Tool completed." }],
          isError: result?.isError === true,
        }),
        ...(result?.error?.info ? { error: result.error.info } : {}),
        ...(result?.meta !== undefined ? { meta: result.meta } : {}),
      },
      {
        surfaceOp: "append",
        sourceEventSeqs: [callSeq],
      },
    );

    if (typeof agent.inject === "function" && Array.isArray(result?.additionalContexts)) {
      for (const contextMsg of result.additionalContexts) {
        try {
          agent.inject(contextMsg);
        } catch {}
      }
    }

    await flushDurableSession(session, agent, this.ctx);

    return result;
  }

  async *stream(options) {
    const prompt = transcriptText(options);
    if (!prompt.trim()) throw new LlmError("ACP prompt is empty", "INVALID_REQUEST");
    const sessionCwd = this.resolveCwd(options);

    const mapper = new DshTextMapper();
    const queue = [];
    let wake;
    let result;
    let completed = false;
    const streamController = new AbortController();
    const streamSignal = fuseSignals(options.signal, streamController.signal);
    const agent = this.resolveAgent(options);
    if (toolsWereProvided(options) && !agent) {
      throw new LlmError("No exact live DSH Agent is available for this ACP tool-enabled request", "UPSTREAM_ERROR");
    }
    const tools = Array.isArray(options.tools) ? options.tools : [];
    const allowedToolNames = new Set(tools.map((tool) => tool?.name).filter((name) => typeof name === "string"));
    const route = {
      provider: options.provider || "agy-next",
      model: options.model || "acp-current",
    };

    const pending = promptAcp({
      model: options.model,
      text: prompt,
      cwd: sessionCwd,
      tools,
      onCall: (call) => this.executeTool(call, agent, streamSignal, allowedToolNames, route),
      // P0 Security Boundary: ACP-native `session/request_permission` carries
      // only server-reported `toolCallId` / `name` metadata and has no protocol
      // proof linking it to this turn's DSH MCP bridge. Auto-approving by tool
      // name or falling back to `allow_always` would let an ACP-native operation
      // spoof a DSH tool name and bypass DSH ToolRuntime approval. Production
      // therefore remains strictly fail-closed (`cancelled`).
      onPermission: () => Promise.resolve({ outcome: { outcome: "cancelled" } }),
      signal: streamSignal,
      onUpdate: (params) => {
        queue.push(...mapper.push(params));
        wake?.();
        wake = undefined;
      },
    });

    try {
      while (result === undefined || queue.length > 0) {
        if (queue.length > 0) {
          yield queue.shift();
          continue;
        }
        result = await Promise.race([
          pending,
          new Promise((resolve) => {
            wake = () => resolve(undefined);
          }),
        ]);
      }
      if (result?.usage) yield { type: "usage", usage: result.usage };
      yield* mapper.finish(result?.stopReason, {
        provider: options.provider || "agy-next",
        model: result?.model || options.model || "acp-current",
      });
      completed = true;
    } catch (error) {
      throw toLlmError(error);
    } finally {
      if (!completed && !streamController.signal.aborted) {
        streamController.abort(new Error("DSH stopped consuming the ACP stream"));
      }
      if (!completed) {
        try { await pending; } catch {}
      }
    }
  }
}

/** Cancel when either the MCP request or the owning turn is cancelled. */
function toolsWereProvided(options) {
  return Array.isArray(options?.tools) && options.tools.length > 0;
}

function isAbsolutePath(value) {
  return typeof value === "string" && (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\"));
}

function fuseSignals(a, b) {
  if (!a && !b) return new AbortController().signal;
  if (a && !b) return a;
  if (!a && b) return b;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([a, b]);
  const controller = new AbortController();
  const onA = () => controller.abort(a.reason);
  const onB = () => controller.abort(b.reason);
  a.addEventListener("abort", onA, { once: true });
  b.addEventListener("abort", onB, { once: true });
  return controller.signal;
}

function toLlmError(error) {
  if (error instanceof LlmError) return error;
  if (error instanceof AcpError) {
    const code = error.phase === "timeout"
      ? "TIMEOUT"
      : error.phase === "aborted"
        ? "ABORTED"
        : error.phase === "auth"
          ? "UNAUTHENTICATED"
          : "UPSTREAM_ERROR";
    const hint = error.phase === "auth" ? " Sign in from Antigravity Next settings; credentials remain managed by the official ACP server." : "";
    return new LlmError(`${error.message}${hint}`, code, { cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new LlmError(message, "UPSTREAM_ERROR", { cause: error });
}

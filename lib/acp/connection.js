/**
 * ACP protocol v1 over stdio: initialize, optional authenticate, session/new,
 * session/prompt. NDJSON JSON-RPC. No client id is sent.
 */

import path from "node:path";

import { isCompatibilityNoise, redact } from "./runtime.js";

export const ACP_PROTOCOL_VERSION = 1;
export const ACP_CLIENT_NAME = "agy-next";
export const ACP_CLIENT_TITLE = "Antigravity Next for DSH";
export const ACP_CLIENT_VERSION = "2.0.0-acp.1";
export const PREFERRED_AUTH_METHOD = "oauth-personal";

const FRAME_LIMIT = 8 * 1024 * 1024;

export class AcpError extends Error {
  constructor(phase, message, options) {
    super(message, options);
    this.name = "AcpError";
    this.phase = phase;
  }
}

export function pickAuthMethod(methods, preferred = PREFERRED_AUTH_METHOD) {
  const usable = (methods ?? []).filter((method) => typeof method?.id === "string" && method.id.length > 0);
  const exact = usable.find((method) => method.id === preferred);
  if (exact) return exact;
  const label = (method) => `${method.id} ${method.name ?? ""}`;
  return (
    usable.find((method) => /google|oauth/i.test(label(method)) && !/api[-_ ]?key/i.test(label(method))) ??
    usable.find((method) => !/api[-_ ]?key/i.test(label(method))) ??
    usable[0]
  );
}

export function sessionConfigParams(cwd, mcpServers = []) {
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) {
    throw new AcpError("protocol", "ACP session/new requires an absolute working directory");
  }
  if (!Array.isArray(mcpServers)) throw new TypeError("ACP mcpServers must be an array");
  for (const server of mcpServers) {
    if (!isRecord(server) || typeof server.name !== "string" || !server.name) {
      throw new AcpError("protocol", "ACP MCP server requires a name");
    }
    if (server.type === "http") {
      if (typeof server.url !== "string" || !server.url || !Array.isArray(server.headers)) {
        throw new AcpError("protocol", "ACP HTTP MCP server requires url and headers");
      }
    } else if (server.type === undefined) {
      if (typeof server.command !== "string" || !path.isAbsolute(server.command) || !Array.isArray(server.args)) {
        throw new AcpError("protocol", "ACP stdio MCP server requires an absolute command and args array");
      }
    } else {
      throw new AcpError("protocol", `Unsupported ACP MCP transport: ${String(server.type)}`);
    }
  }
  return { cwd, mcpServers };
}

export function validateRequestedModel(session, modelId) {
  if (!modelId) return;
  if (!session.models.some((model) => model.id === modelId)) {
    throw new AcpError("model", `Requested ACP model is not advertised by this session: ${modelId}`);
  }
}

export function modelsFromSession(response) {
  if (!isRecord(response)) return { models: [] };
  const selector = selectOptions(response.configOptions).find(
    (option) => option.category === "model" || option.id === "model",
  );
  if (selector) {
    const models = flattenSelect(selector)
      .filter((option) => typeof option.value === "string" && option.value.length > 0)
      .map((option) => ({
        id: option.value,
        name: typeof option.name === "string" && option.name ? option.name : option.value,
      }));
    if (models.length > 0) {
      return {
        models,
        ...(typeof selector.currentValue === "string" ? { currentModelId: selector.currentValue } : {}),
        modelSelectorId: typeof selector.id === "string" ? selector.id : undefined,
      };
    }
  }
  const legacy = isRecord(response.models) ? response.models.availableModels : undefined;
  if (!Array.isArray(legacy)) return { models: [] };
  const models = legacy
    .filter((item) => isRecord(item) && typeof item.modelId === "string")
    .map((item) => ({ id: item.modelId, name: typeof item.name === "string" && item.name ? item.name : item.modelId }));
  const current = isRecord(response.models) && typeof response.models.currentModelId === "string"
    ? response.models.currentModelId
    : undefined;
  return { models, ...(current ? { currentModelId: current } : {}) };
}

export class DshTextMapper {
  constructor() {
    this.blocks = [];
    this.open = null;
  }

  push(params) {
    const extracted = extractUpdateText(params);
    if (!extracted || extracted.text === "") return [];
    const out = [];
    if (this.open !== extracted.kind) {
      out.push(...this.closeOpen());
      this.blocks.push({ type: extracted.kind, text: "" });
      this.open = extracted.kind;
      out.push({ type: "block-start", index: this.blocks.length - 1, blockType: extracted.kind });
    }
    const index = this.blocks.length - 1;
    const block = this.blocks[index];
    block.text += extracted.text;
    out.push({
      type: extracted.kind === "reasoning" ? "reasoning-delta" : "text-delta",
      index,
      text: extracted.text,
    });
    return out;
  }

  finish(stopReason, meta) {
    const out = this.closeOpen();
    const hasContent = this.blocks.some((block) => block.text.length > 0);
    if (!hasContent) {
      out.push({
        type: "finish",
        reason: {
          kind: "error",
          failure: { message: "ACP session/prompt completed with no text", code: "EMPTY_RESPONSE" },
        },
      });
      return out;
    }
    out.push({
      type: "finish",
      reason: finishReason(stopReason),
      replayState: {
        kind: "antigravity-acp",
        version: 1,
        provider: meta.provider,
        model: meta.model,
        blocks: this.blocks.map((block) => ({ type: block.type })),
      },
    });
    return out;
  }

  closeOpen() {
    if (this.open === null) return [];
    const index = this.blocks.length - 1;
    const block = this.blocks[index];
    this.open = null;
    if (!block) return [];
    return [{ type: "block-end", index, block: { type: block.type, text: block.text } }];
  }
}

export class AcpConnection {
  constructor(runtime) {
    this.runtime = runtime;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = "";
    this.noiseLines = 0;
    this.closed = false;
    this.agentCapabilities = {};
    this.onUpdate = new Set();
    this.onPermission = undefined;
    this.permissionTimers = new Set();
    this.runtime.stdout.setEncoding("utf8");
    this.runtime.stdout.on("data", (chunk) => this.onStdout(chunk));
    void this.runtime.exited.then((exit) => {
      if (this.closed) return;
      const status = exit.signal ? `signal ${exit.signal}` : `code ${String(exit.code)}`;
      const detail = exit.stderrTail.trim() ? `: ${exit.stderrTail.trim()}` : "";
      this.failAll(new AcpError("process_exit", `ACP server exited with ${status}${detail}`));
    });
  }

  get ignoredStdoutNoiseLines() {
    return this.noiseLines;
  }

  subscribeUpdates(listener) {
    this.onUpdate.add(listener);
    return () => this.onUpdate.delete(listener);
  }

  setPermissionHandler(handler) {
    this.onPermission = typeof handler === "function" ? handler : undefined;
  }

  async initialize(timeoutMs = 30_000, signal) {
    const result = await this.request("initialize", {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
        session: { configOptions: { boolean: {} } },
      },
      clientInfo: {
        name: ACP_CLIENT_NAME,
        title: ACP_CLIENT_TITLE,
        version: ACP_CLIENT_VERSION,
      },
    }, timeoutMs, signal);
    if (!isRecord(result) || result.protocolVersion !== ACP_PROTOCOL_VERSION) {
      await this.close();
      throw new AcpError(
        "protocol",
        `Unsupported ACP protocol version ${isRecord(result) ? String(result.protocolVersion) : "missing"}`,
      );
    }
    const agentCapabilities = isRecord(result.agentCapabilities) ? result.agentCapabilities : {};
    const mcpCapabilities = isRecord(agentCapabilities.mcpCapabilities) ? agentCapabilities.mcpCapabilities : {};
    this.agentCapabilities = agentCapabilities;
    return {
      protocolVersion: ACP_PROTOCOL_VERSION,
      authMethods: authMethodsOf(result.authMethods),
      mcpCapabilities: {
        http: mcpCapabilities.http === true,
        sse: mcpCapabilities.sse === true,
      },
      ...(isRecord(result.agentInfo)
        ? {
            agentInfo: {
              ...(typeof result.agentInfo.name === "string" ? { name: result.agentInfo.name } : {}),
              ...(typeof result.agentInfo.version === "string" ? { version: result.agentInfo.version } : {}),
              ...(typeof result.agentInfo.title === "string" ? { title: result.agentInfo.title } : {}),
            },
          }
        : {}),
    };
  }

  async authenticate(methodId, timeoutMs = 180_000, signal) {
    if (!methodId) throw new AcpError("auth", "ACP authenticate requires a method id advertised by the server");
    await this.request("authenticate", { methodId }, timeoutMs, signal);
  }

  async logout(timeoutMs = 10_000, signal) {
    await this.request("logout", {}, timeoutMs, signal);
  }

  async newSession(cwd, timeoutMs = 120_000, mcpServers = [], signal) {
    if (!Array.isArray(mcpServers)) throw new TypeError("ACP mcpServers must be an array");
    const result = await this.request("session/new", sessionConfigParams(cwd, mcpServers), timeoutMs, signal);
    if (!isRecord(result) || typeof result.sessionId !== "string" || !result.sessionId) {
      throw new AcpError("protocol", "ACP session/new did not return a sessionId");
    }
    const rawTier = isRecord(result._meta) && isRecord(result._meta.antigravity) && isRecord(result._meta.antigravity.tier)
      ? {
          ...(typeof result._meta.antigravity.tier.id === "string" ? { id: result._meta.antigravity.tier.id } : {}),
          ...(typeof result._meta.antigravity.tier.name === "string" ? { name: result._meta.antigravity.tier.name } : {}),
        }
      : null;
    const tier = rawTier && (rawTier.id || rawTier.name) ? rawTier : null;
    return { sessionId: result.sessionId, ...modelsFromSession(result), tier, raw: result };
  }

  async setModel(session, modelId, timeoutMs = 30_000, signal) {
    validateRequestedModel(session, modelId);
    if (!modelId) return session;
    if (session.modelSelectorId) {
      const result = await this.request("session/set_config_option", {
        sessionId: session.sessionId,
        configId: session.modelSelectorId,
        value: modelId,
      }, timeoutMs, signal);
      const updated = { sessionId: session.sessionId, ...modelsFromSession(result), raw: result };
      if (updated.currentModelId === modelId) return updated;
      throw new AcpError("model", `ACP session/set_config_option did not return configOptions confirming ${modelId}`);
    }
    throw new AcpError("model", `ACP session does not expose a model config selector for ${modelId}`);
  }

  async prompt(sessionId, text, timeoutMs = 120_000, signal) {
    if (signal?.aborted) throw new AcpError("aborted", "ACP prompt aborted");
    const requestController = new AbortController();
    let timedOut = false;
    let timer;
    let abortListener;
    if (signal) {
      abortListener = () => {
        try { this.notify("session/cancel", { sessionId }); } catch {}
        requestController.abort(new AcpError("aborted", "ACP prompt aborted"));
      };
      signal.addEventListener("abort", abortListener, { once: true });
      if (signal.aborted) {
        abortListener();
      }
    }
    timer = setTimeout(() => {
      timedOut = true;
      try { this.notify("session/cancel", { sessionId }); } catch {}
      requestController.abort(new AcpError("timeout", `ACP session/prompt timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    if (signal) timer.unref?.();

    const pending = this.request(
      "session/prompt",
      {
        sessionId,
        prompt: [{ type: "text", text }],
      },
      timeoutMs + 1_000,
      requestController.signal,
    );

    try {
      return promptResult(await pending);
    } catch (error) {
      if (timedOut) {
        const detail = this.runtime.stderrTail.trim() ? `: ${this.runtime.stderrTail.trim()}` : "";
        throw new AcpError("timeout", `ACP session/prompt timed out after ${timeoutMs}ms${detail}`);
      }
      if (signal?.aborted || (error instanceof AcpError && error.phase === "aborted")) {
        throw new AcpError("aborted", "ACP prompt aborted");
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      if (abortListener && signal) signal.removeEventListener("abort", abortListener);
      void pending.catch(() => undefined);
    }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    for (const timer of this.permissionTimers) clearTimeout(timer);
    this.permissionTimers.clear();
    this.failAll(new AcpError("closed", "ACP connection closed"));
    await this.runtime.close();
  }

  request(method, params, timeoutMs, signal) {
    if (this.closed) return Promise.reject(new AcpError("closed", "ACP connection is closed"));
    if (signal?.aborted) return Promise.reject(new AcpError("aborted", `ACP ${method} aborted`));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      let onAbort;
    let cleanup;
    const timer = setTimeout(() => {
      this.pending.delete(id);
      cleanup?.();
      const detail = this.runtime.stderrTail.trim() ? `: ${this.runtime.stderrTail.trim()}` : "";
      reject(new AcpError("timeout", `ACP ${method} timed out after ${timeoutMs}ms${detail}`));
    }, timeoutMs);
    if (!signal) timer.unref?.();
    cleanup = () => {
      clearTimeout(timer);
      if (onAbort && signal) signal.removeEventListener("abort", onAbort);
    };
      if (signal) {
        onAbort = () => {
          this.pending.delete(id);
          cleanup();
          reject(new AcpError("aborted", `ACP ${method} aborted`));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) {
          onAbort();
          return;
        }
      }
      this.pending.set(id, {
        resolve: (value) => {
          cleanup();
          resolve(value);
        },
        reject: (error) => {
          cleanup();
          reject(error);
        },
      });
      try {
        this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      } catch (cause) {
        this.pending.delete(id);
        cleanup();
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
  }

  notify(method, params) {
    this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  onStdout(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > FRAME_LIMIT) {
      this.failAll(new AcpError("protocol", "ACP stdout frame exceeded 8 MiB"));
      void this.close();
      return;
    }
    let newline = this.buffer.indexOf("\n");
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      this.onLine(line);
      newline = this.buffer.indexOf("\n");
    }
  }

  onLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (isCompatibilityNoise(trimmed)) {
      this.noiseLines += 1;
      return;
    }
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      this.failAll(new AcpError("protocol", `ACP stdout is not JSON: ${redact(trimmed).slice(0, 200)}`));
      void this.close();
      return;
    }
    if (!isRecord(message)) return;
    if (typeof message.method === "string" && message.id !== undefined) {
      this.onServerRequest(message.id, message.method, message.params);
      return;
    }
    if (typeof message.method === "string") {
      if (message.method === "session/update") {
        for (const listener of this.onUpdate) listener(message.params);
      }
      return;
    }
    if (message.id === undefined) return;
    const id = typeof message.id === "number" ? message.id : Number(message.id);
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    if (message.error !== undefined) pending.reject(errorFromRpc(message.error));
    else pending.resolve(message.result);
  }

  onServerRequest(id, method, params) {
    if (method === "session/request_permission") {
      this.handlePermissionRequest(id, params);
      return;
    }
    this.replyError(id, -32601, `agy-next ACP client does not implement ${method}`);
  }

  async handlePermissionRequest(id, params) {
    const handler = this.onPermission;
    if (!handler || this.closed) {
      this.reply(id, { outcome: { outcome: "cancelled" } });
      return;
    }
    let timer;
    let timeout;
    const timeoutPromise = new Promise((resolve) => {
      timeout = resolve;
      timer = setTimeout(() => resolve(undefined), 120_000);
      timer.unref?.();
      this.permissionTimers.add(timer);
    });
    try {
      const response = await Promise.race([Promise.resolve().then(() => handler(params)), timeoutPromise]);
      if (timer) clearTimeout(timer);
      this.permissionTimers.delete(timer);
      if (!response || !isRecord(response) || !isRecord(response.outcome)) {
        this.reply(id, { outcome: { outcome: "cancelled" } });
        return;
      }
      this.reply(id, response);
    } catch {
      if (timer) clearTimeout(timer);
      this.permissionTimers.delete(timer);
      this.reply(id, { outcome: { outcome: "cancelled" } });
    } finally {
      if (timer) this.permissionTimers.delete(timer);
      void timeout;
    }
  }

  reply(id, result) {
    if (this.closed) return;
    try {
      this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
    } catch {}
  }

  replyError(id, code, message) {
    if (this.closed) return;
    try {
      this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
    } catch {}
  }

  failAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

function authMethodsOf(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id) return [];
    return [{
      id: item.id,
      ...(typeof item.name === "string" ? { name: item.name } : {}),
      ...(typeof item.description === "string" ? { description: item.description } : {}),
    }];
  });
}

function promptResult(result) {
  if (!isRecord(result)) return {};
  return {
    ...(typeof result.stopReason === "string" ? { stopReason: result.stopReason } : {}),
    ...(isRecord(result.usage) ? { usage: result.usage } : {}),
  };
}

function extractUpdateText(params) {
  if (!isRecord(params) || !isRecord(params.update)) return undefined;
  const update = params.update;
  if (update.sessionUpdate !== "agent_message_chunk" && update.sessionUpdate !== "agent_thought_chunk") return undefined;
  if (!isRecord(update.content) || update.content.type !== "text" || typeof update.content.text !== "string") return undefined;
  return {
    kind: update.sessionUpdate === "agent_thought_chunk" ? "reasoning" : "text",
    text: update.content.text,
  };
}

function finishReason(stopReason) {
  if (!stopReason || stopReason === "end_turn" || stopReason === "stop") return { kind: "stop" };
  if (stopReason === "max_tokens") return { kind: "max-tokens" };
  return {
    kind: "error",
    failure: { message: `ACP session/prompt finished with ${stopReason}`, code: "ACP_STOP_REASON" },
  };
}

function errorFromRpc(error) {
  if (!isRecord(error)) return new AcpError("protocol", "ACP server returned an unreadable error");
  const code = typeof error.code === "number" ? error.code : 0;
  const message = typeof error.message === "string" ? redact(error.message) : "ACP error";
  if (code === -32000) return new AcpError("auth", `Antigravity authentication required: ${message}`);
  return new AcpError("protocol", `ACP error ${code}: ${message}`);
}

function selectOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => isRecord(item) && item.type === "select");
}

function flattenSelect(selector) {
  if (!Array.isArray(selector.options)) return [];
  return selector.options.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    if (Array.isArray(entry.options)) return entry.options.filter((option) => isRecord(option) && typeof option.value === "string");
    return typeof entry.value === "string" ? [entry] : [];
  });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

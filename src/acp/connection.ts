/**
 * Minimal ACP protocol v1 client over the runtime's stdio.
 *
 * Order: initialize → authenticate → session/new → session/prompt.
 * Framing is newline-delimited JSON-RPC 2.0, matching the official server
 * transport used by pi-antigravity-acp-provider. No client id is sent.
 * Authenticate only forwards a method id the server itself advertised.
 */

import { AcpRuntime, isCompatibilityNoise, redact } from "./runtime.ts";

export const ACP_PROTOCOL_VERSION = 1;
export const ACP_CLIENT_NAME = "agy-next";
export const ACP_CLIENT_TITLE = "Antigravity Next for DSH";
export const ACP_CLIENT_VERSION = "1.1.0-acp";

const FRAME_LIMIT = 8 * 1024 * 1024;

export class AcpError extends Error {
  readonly phase: string;

  constructor(phase: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AcpError";
    this.phase = phase;
  }
}

export interface AuthMethod {
  id: string;
  name?: string;
  description?: string;
}

export interface InitializeResult {
  protocolVersion: number;
  authMethods: AuthMethod[];
  agentInfo?: { name?: string; version?: string; title?: string };
}

export interface AcpModel {
  id: string;
  name: string;
}

export interface NewSessionResult {
  sessionId: string;
  models: AcpModel[];
  currentModelId?: string;
  raw: unknown;
}

export interface PromptResult {
  stopReason?: string;
  usage?: Record<string, unknown>;
}

export interface DshChunk {
  type: string;
  index?: number;
  blockType?: string;
  text?: string;
  block?: { type: string; text: string };
  reason?: unknown;
  usage?: unknown;
  replayState?: unknown;
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export function pickAuthMethod(methods: AuthMethod[]): AuthMethod | undefined {
  const usable = methods.filter((method) => typeof method?.id === "string" && method.id.length > 0);
  const label = (method: AuthMethod) => `${method.id} ${method.name ?? ""}`;
  const google = usable.find((method) => /google|oauth/i.test(label(method)) && !/api[-_ ]?key/i.test(label(method)));
  if (google) return google;
  return usable.find((method) => !/api[-_ ]?key/i.test(label(method))) ?? usable[0];
}

export function modelsFromSession(response: unknown): { models: AcpModel[]; currentModelId?: string } {
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
      };
    }
  }

  const legacy = isRecord(response.models) ? response.models.availableModels : undefined;
  if (!Array.isArray(legacy)) return { models: [] };
  const models = legacy
    .filter((item): item is { modelId: string; name?: string } => isRecord(item) && typeof item.modelId === "string")
    .map((item) => ({ id: item.modelId, name: typeof item.name === "string" && item.name ? item.name : item.modelId }));
  const current = isRecord(response.models) && typeof response.models.currentModelId === "string"
    ? response.models.currentModelId
    : undefined;
  return { models, ...(current ? { currentModelId: current } : {}) };
}

/** Turn `session/update` text into the DSH block stream used by `lib/stream.js`. */
export class DshTextMapper {
  private readonly blocks: { type: "text" | "reasoning"; text: string }[] = [];
  private open: "text" | "reasoning" | null = null;

  push(params: unknown): DshChunk[] {
    const extracted = extractUpdateText(params);
    if (!extracted || extracted.text === "") return [];
    const out: DshChunk[] = [];
    if (this.open !== extracted.kind) {
      out.push(...this.closeOpen());
      this.blocks.push({ type: extracted.kind, text: "" });
      this.open = extracted.kind;
      out.push({ type: "block-start", index: this.blocks.length - 1, blockType: extracted.kind });
    }
    const index = this.blocks.length - 1;
    const block = this.blocks[index];
    if (!block) return out;
    block.text += extracted.text;
    out.push({
      type: extracted.kind === "reasoning" ? "reasoning-delta" : "text-delta",
      index,
      text: extracted.text,
    });
    return out;
  }

  finish(stopReason: string | undefined, meta: { provider: string; model: string }): DshChunk[] {
    const out = this.closeOpen();
    const hasContent = this.blocks.some((block) => block.text.length > 0);
    if (!hasContent) {
      out.push({
        type: "finish",
        reason: {
          kind: "error",
          failure: {
            message: "ACP session/prompt completed with no text",
            code: "EMPTY_RESPONSE",
          },
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

  private closeOpen(): DshChunk[] {
    if (this.open === null) return [];
    const index = this.blocks.length - 1;
    const block = this.blocks[index];
    this.open = null;
    if (!block) return [];
    return [{
      type: "block-end",
      index,
      block: { type: block.type, text: block.text },
    }];
  }
}

export class AcpConnection {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private buffer = "";
  private noiseLines = 0;
  private closed = false;
  private readonly onUpdate = new Set<(params: unknown) => void>();
  private readonly runtime: AcpRuntime;

  constructor(runtime: AcpRuntime) {
    this.runtime = runtime;
    this.runtime.stdout.setEncoding("utf8");
    this.runtime.stdout.on("data", (chunk: string) => this.onStdout(chunk));
    void this.runtime.exited.then((exit) => {
      if (this.closed) return;
      const status = exit.signal ? `signal ${exit.signal}` : `code ${String(exit.code)}`;
      const detail = exit.stderrTail.trim() ? `: ${exit.stderrTail.trim()}` : "";
      this.failAll(new AcpError("process_exit", `ACP server exited with ${status}${detail}`));
    });
  }

  get ignoredStdoutNoiseLines(): number {
    return this.noiseLines;
  }

  subscribeUpdates(listener: (params: unknown) => void): () => void {
    this.onUpdate.add(listener);
    return () => this.onUpdate.delete(listener);
  }

  async initialize(timeoutMs = 30_000): Promise<InitializeResult> {
    const result = await this.request("initialize", {
      protocolVersion: ACP_PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: {
        name: ACP_CLIENT_NAME,
        title: ACP_CLIENT_TITLE,
        version: ACP_CLIENT_VERSION,
      },
    }, timeoutMs);
    if (!isRecord(result) || result.protocolVersion !== ACP_PROTOCOL_VERSION) {
      await this.close();
      throw new AcpError(
        "protocol",
        `Unsupported ACP protocol version ${isRecord(result) ? String(result.protocolVersion) : "missing"}`,
      );
    }
    return {
      protocolVersion: ACP_PROTOCOL_VERSION,
      authMethods: authMethodsOf(result.authMethods),
      ...(isRecord(result.agentInfo) ? { agentInfo: {
        ...(typeof result.agentInfo.name === "string" ? { name: result.agentInfo.name } : {}),
        ...(typeof result.agentInfo.version === "string" ? { version: result.agentInfo.version } : {}),
        ...(typeof result.agentInfo.title === "string" ? { title: result.agentInfo.title } : {}),
      } } : {}),
    };
  }

  /**
   * Ask the official server to run its own Google login.
   * `methodId` must come from `initialize.authMethods`. Tokens are not handled here.
   */
  async authenticate(methodId: string, timeoutMs = 180_000): Promise<void> {
    if (!methodId) throw new AcpError("auth", "ACP authenticate requires a method id advertised by the server");
    await this.request("authenticate", { methodId }, timeoutMs);
  }

  async newSession(cwd: string, timeoutMs = 120_000): Promise<NewSessionResult> {
    const result = await this.request("session/new", { cwd, mcpServers: [] }, timeoutMs);
    if (!isRecord(result) || typeof result.sessionId !== "string" || !result.sessionId) {
      throw new AcpError("protocol", "ACP session/new did not return a sessionId");
    }
    const discovered = modelsFromSession(result);
    return { sessionId: result.sessionId, ...discovered, raw: result };
  }

  async prompt(
    sessionId: string,
    text: string,
    timeoutMs = 120_000,
    signal?: AbortSignal,
  ): Promise<PromptResult> {
    if (signal?.aborted) throw new AcpError("aborted", "ACP prompt aborted");
    const pending = this.request("session/prompt", {
      sessionId,
      prompt: [{ type: "text", text }],
    }, timeoutMs);
    if (!signal) return promptResult(await pending);

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        this.notify("session/cancel", { sessionId });
        reject(new AcpError("aborted", "ACP prompt aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      pending.then(
        (result) => {
          signal.removeEventListener("abort", onAbort);
          resolve(promptResult(result));
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.failAll(new AcpError("closed", "ACP connection closed"));
    await this.runtime.close();
  }

  private request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    if (this.closed) return Promise.reject(new AcpError("closed", "ACP connection is closed"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const detail = this.runtime.stderrTail.trim() ? `: ${this.runtime.stderrTail.trim()}` : "";
        reject(new AcpError("timeout", `ACP ${method} timed out after ${timeoutMs}ms${detail}`));
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try {
        this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      } catch (cause) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
  }

  private notify(method: string, params: unknown): void {
    this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  private onStdout(chunk: string): void {
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

  private onLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (isCompatibilityNoise(trimmed)) {
      this.noiseLines += 1;
      return;
    }
    let message: unknown;
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
    if (message.error !== undefined) {
      pending.reject(errorFromRpc(message.error));
      return;
    }
    pending.resolve(message.result);
  }

  private onServerRequest(id: unknown, method: string, params: unknown): void {
    if (method === "session/request_permission") {
      this.reply(id, { outcome: { outcome: "cancelled" } });
      return;
    }
    this.replyError(id, -32601, `agy-next ACP skeleton does not implement ${method}`);
    void params;
  }

  private reply(id: unknown, result: unknown): void {
    this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  private replyError(id: unknown, code: number, message: string): void {
    this.runtime.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

function authMethodsOf(value: unknown): AuthMethod[] {
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

function promptResult(result: unknown): PromptResult {
  if (!isRecord(result)) return {};
  const usage = isRecord(result.usage) ? result.usage : undefined;
  return {
    ...(typeof result.stopReason === "string" ? { stopReason: result.stopReason } : {}),
    ...(usage ? { usage } : {}),
  };
}

function extractUpdateText(params: unknown): { kind: "text" | "reasoning"; text: string } | undefined {
  if (!isRecord(params) || !isRecord(params.update)) return undefined;
  const update = params.update;
  const sessionUpdate = update.sessionUpdate;
  if (sessionUpdate !== "agent_message_chunk" && sessionUpdate !== "agent_thought_chunk") return undefined;
  if (!isRecord(update.content) || update.content.type !== "text" || typeof update.content.text !== "string") {
    return undefined;
  }
  return {
    kind: sessionUpdate === "agent_thought_chunk" ? "reasoning" : "text",
    text: update.content.text,
  };
}

function finishReason(stopReason: string | undefined): unknown {
  if (!stopReason || stopReason === "end_turn" || stopReason === "stop") return { kind: "stop" };
  if (stopReason === "max_tokens") return { kind: "max-tokens" };
  return {
    kind: "error",
    failure: {
      message: `ACP session/prompt finished with ${stopReason}`,
      code: "ACP_STOP_REASON",
    },
  };
}

function errorFromRpc(error: unknown): AcpError {
  if (!isRecord(error)) return new AcpError("protocol", "ACP server returned an unreadable error");
  const code = typeof error.code === "number" ? error.code : 0;
  const message = typeof error.message === "string" ? redact(error.message) : "ACP error";
  if (code === -32000) return new AcpError("auth", `Antigravity authentication required: ${message}`);
  return new AcpError("protocol", `ACP error ${code}: ${message}`);
}

function selectOptions(value: unknown): { id?: string; category?: string; currentValue?: string; options?: unknown }[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { type: string; id?: string; category?: string; currentValue?: string; options?: unknown } =>
    isRecord(item) && item.type === "select",
  );
}

function flattenSelect(selector: { options?: unknown }): { value: string; name?: string }[] {
  if (!Array.isArray(selector.options)) return [];
  return selector.options.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    if (Array.isArray(entry.options)) {
      return entry.options.filter((option): option is { value: string; name?: string } =>
        isRecord(option) && typeof option.value === "string",
      );
    }
    return typeof entry.value === "string" ? [entry as { value: string; name?: string }] : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

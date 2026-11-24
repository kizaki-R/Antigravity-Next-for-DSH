/**
 * Request-scoped ACP sessions for the official Antigravity ACP provider.
 *
 * Every operation owns its own short-lived server process and connection.
 * Nothing here reads Antigravity's token files: authentication state is
 * observed only through `session/new`, which the official server answers after
 * it has loaded its own credentials.
 */

import os from "node:os";

import { AcpConnection, AcpError, pickAuthMethod, PREFERRED_AUTH_METHOD, validateRequestedModel } from "./connection.js";
import { AcpRuntime } from "./runtime.js";
import { AcpMcpBridge } from "./mcp-bridge.js";

const INIT_TIMEOUT_MS = 30_000;
const SESSION_TIMEOUT_MS = 120_000;
const PROMPT_TIMEOUT_MS = 10 * 60_000;
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;
let runtimeFactory = (options) => new AcpRuntime(options);
let cachedModels = null;
let inflightModels = null;

function rememberModels(session) {
  if (Array.isArray(session?.models) && session.models.length > 0) {
    cachedModels = {
      models: session.models,
      currentModelId: session.currentModelId ?? null,
      fetchedAt: Date.now(),
    };
  }
}

/** Test seam; restore the returned disposer before another test starts. */
export function setAcpRuntimeFactoryForTests(factory) {
  const previous = runtimeFactory;
  runtimeFactory = typeof factory === "function" ? factory : previous;
  return () => { runtimeFactory = previous; };
}

/** Run one bounded ACP process and always dispose it, including on failure. */
async function withConnection(options, fn) {
  if (options?.signal?.aborted) throw new AcpError("aborted", "ACP request aborted before process start");
  let connection;
  try {
    const runtime = runtimeFactory({ cwd: options.cwd ?? os.tmpdir() });
    connection = new AcpConnection(runtime);
    const initialized = await connection.initialize(options.initTimeoutMs ?? INIT_TIMEOUT_MS, options.signal);
    if (options.onPermission) connection.setPermissionHandler(options.onPermission);
    return await fn({ connection, initialized, runtime });
  } finally {
    await connection?.close().catch(() => undefined);
  }
}

/** Classify failures so the settings page can tell "not signed in" from a broken install. */
export function classifyAcpError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof AcpError) {
    if (error.phase === "auth") return { code: "auth", message };
    if (error.phase === "timeout") return { code: "timeout", message };
    if (error.phase === "aborted") return { code: "aborted", message };
    if (error.phase === "spawn" || error.phase === "process_exit") return { code: "spawn", message };
    return { code: "protocol", message };
  }
  if (/not found on PATH|spawn failed/i.test(message)) return { code: "spawn", message };
  return { code: "protocol", message };
}

/** Start a fresh process, open one session, and report the observed state. */
export async function probeAcpStatus(options = {}) {
  return withConnection(options, async ({ connection, initialized, runtime }) => {
    const session = await connection.newSession(options.cwd ?? os.tmpdir(), options.sessionTimeoutMs ?? SESSION_TIMEOUT_MS, options.mcpServers ?? []);
    rememberModels(session);
    return {
      authenticated: true,
      launch: runtime.launch,
      agentInfo: initialized.agentInfo ?? null,
      protocolVersion: initialized.protocolVersion,
      mcpCapabilities: initialized.mcpCapabilities,
      models: session.models,
      currentModelId: session.currentModelId ?? null,
      modelSelectorId: session.modelSelectorId ?? null,
      tier: session.tier ?? null,
    };
  });
}

/**
 * Structured status probe for the settings page.
 *
 * `initialize` succeeding means the official ACP server is reachable even when
 * the user has not signed in. Only `session/new` proves authentication. Keeping
 * these separate lets the login button stay enabled on a fresh install.
 */
export async function describeAcpStatus(options = {}) {
  let connection;
  try {
    const runtime = runtimeFactory({ cwd: options.cwd ?? os.tmpdir() });
    connection = new AcpConnection(runtime);
    const initialized = await connection.initialize(options.initTimeoutMs ?? INIT_TIMEOUT_MS);
    const base = {
      reachable: true,
      launch: runtime.launch,
      agentInfo: initialized.agentInfo ?? null,
      protocolVersion: initialized.protocolVersion,
      authMethods: initialized.authMethods ?? [],
      mcpCapabilities: initialized.mcpCapabilities ?? { http: false, sse: false },
    };
    try {
      const session = await connection.newSession(
        options.cwd ?? os.tmpdir(),
        options.sessionTimeoutMs ?? SESSION_TIMEOUT_MS,
        options.mcpServers ?? [],
      );
      rememberModels(session);
      return {
        ...base,
        authenticated: true,
        models: session.models,
        currentModelId: session.currentModelId ?? null,
        modelSelectorId: session.modelSelectorId ?? null,
        tier: session.tier ?? null,
        detail: null,
      };
    } catch (error) {
      const classified = classifyAcpError(error);
      if (classified.code === "auth") cachedModels = null;
      return {
        ...base,
        authenticated: false,
        models: [],
        currentModelId: null,
        modelSelectorId: null,
        detail: classified,
      };
    }
  } catch (error) {
    return {
      reachable: false,
      authenticated: false,
      models: [],
      currentModelId: null,
      agentInfo: null,
      launch: null,
      detail: classifyAcpError(error),
    };
  } finally {
    await connection?.close().catch(() => undefined);
  }
}

/** Explicit Google OAuth login, driven entirely by the official ACP server. */
export async function loginAcp({ methodId, timeoutMs = 300_000, cwd, force = false } = {}) {
  return withConnection({ cwd }, async ({ connection, initialized, runtime }) => {
    const method = pickAuthMethod(initialized.authMethods, methodId ?? PREFERRED_AUTH_METHOD);
    if (!method) throw new AcpError("auth", "ACP server advertised no authentication method");
    if (force) {
      await connection.logout().catch(() => undefined);
    }
    await connection.authenticate(method.id, timeoutMs);
    const session = await connection.newSession(cwd ?? os.tmpdir());
    rememberModels(session);
    return {
      authenticated: true,
      methodId: method.id,
      models: session.models,
      currentModelId: session.currentModelId ?? null,
      tier: session.tier ?? null,
      launch: runtime.launch,
    };
  });
}

/** Clear the official ACP server's active authentication state. */
export async function logoutAcp({ cwd } = {}) {
  cachedModels = null;
  return withConnection({ cwd }, async ({ connection }) => {
    await connection.logout().catch(() => undefined);
    return { loggedOut: true };
  });
}

/** Model discovery uses the cached session roster when fresh, otherwise probes once. */
export async function listAcpModels(options = {}) {
  if (cachedModels && Date.now() - cachedModels.fetchedAt < MODELS_CACHE_TTL_MS) {
    return { models: cachedModels.models, currentModelId: cachedModels.currentModelId };
  }
  if (!inflightModels) {
    inflightModels = probeAcpStatus(options)
      .then((status) => ({ models: status.models, currentModelId: status.currentModelId }))
      .finally(() => { inflightModels = null; });
  }
  return inflightModels;
}

/**
 * One ACP prompt in its own process and session. When DSH tools are available,
 * an authenticated loopback MCP bridge exposes them to the official agent and
 * forwards calls to DSH's ToolRuntime (including its approval pipeline).
 */
async function startToolBridge(tools, onCall, signal) {
  if (!Array.isArray(tools) || tools.length === 0 || typeof onCall !== "function") {
    return { bridge: undefined, mcpServers: [] };
  }
  const bridge = new AcpMcpBridge({ tools, onCall });
  try {
    const server = await bridge.start(signal);
    return { bridge, mcpServers: server ? [server] : [] };
  } catch (error) {
    await bridge.close().catch(() => undefined);
    if (signal?.aborted) throw new AcpError("aborted", "ACP prompt aborted during MCP bridge startup", { cause: error });
    throw error;
  }
}

/** No-model live diagnostic: initialize and create a session with MCP servers, but never send prompt. */
export async function probeAcpToolSession({ tools, onCall, cwd = process.cwd(), waitMs = 1500, signal } = {}) {
  const { bridge, mcpServers } = await startToolBridge(tools, onCall, signal);
  try {
    const session = await withConnection({ cwd, mcpServers, signal }, async ({ connection, initialized }) => {
      const created = await connection.newSession(cwd, SESSION_TIMEOUT_MS, mcpServers, signal);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      return { sessionId: created.sessionId, modelCount: created.models.length, currentModelId: created.currentModelId ?? null, agentInfo: initialized.agentInfo ?? null, mcpCapabilities: initialized.mcpCapabilities ?? null };
    });
    return { ...session, mcp: bridge ? { requests: bridge.stats.requests, byMethod: { ...bridge.stats.byMethod } } : { requests: 0, byMethod: {} } };
  } finally {
    await bridge?.close().catch(() => undefined);
  }
}

export async function promptAcp({ model, text, tools, onCall, onUpdate, onPermission, onMcpStats, cwd, signal, timeoutMs, initTimeoutMs, sessionTimeoutMs } = {}) {
  if (signal?.aborted) throw new AcpError("aborted", "ACP prompt aborted before bridge start");
  const { bridge, mcpServers } = await startToolBridge(tools, onCall, signal);
  try {
    return await withConnection({ cwd, mcpServers, onPermission, signal, initTimeoutMs }, async ({ connection }) => {
      const unsubscribe = onUpdate ? connection.subscribeUpdates(onUpdate) : () => undefined;
      try {
        const sessionCwd = cwd ?? process.cwd();
        let session = await connection.newSession(sessionCwd, sessionTimeoutMs ?? SESSION_TIMEOUT_MS, mcpServers, signal);
        validateRequestedModel(session, model);
        if (model && model !== session.currentModelId) {
          session = await connection.setModel(session, model, initTimeoutMs ?? INIT_TIMEOUT_MS, signal);
        }
        if (signal?.aborted) throw new AcpError("aborted", "ACP prompt aborted before dispatch");
        const result = await connection.prompt(session.sessionId, text, timeoutMs ?? PROMPT_TIMEOUT_MS, signal);
        if (typeof onMcpStats === "function" && bridge) onMcpStats({ requests: bridge.stats.requests, byMethod: { ...bridge.stats.byMethod } });
        return {
          ...result,
          model: session.currentModelId ?? model ?? null,
          modelSelectorId: session.modelSelectorId ?? null,
        };
      } finally {
        unsubscribe();
      }
    });
  } finally {
    await bridge?.close().catch(() => undefined);
  }
}

/** Backward-compatible seam used by the offline parser test. */
export function resetAcpForTests() {
  return Promise.resolve();
}

export function transcriptText(options = {}) {
  const parts = [];
  const system = textOf(options.system);
  if (system) parts.push(system);
  if (Array.isArray(options.messages)) {
    for (const message of options.messages) {
      if (!message || typeof message !== "object") continue;
      const role = typeof message.role === "string" ? message.role : "user";
      const text = textOf(message.content);
      if (!text) continue;
      if (role === "tool") {
        const callId = typeof message.toolCallId === "string" && message.toolCallId ? ` id=${message.toolCallId}` : "";
        const status = message.isError === true ? " status=error" : " status=ok";
        parts.push(`[tool${callId}${status}]\n${text}`);
      } else {
        parts.push(`[${role}]\n${text}`);
      }
    }
  }
  return parts.join("\n\n");
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (!block || typeof block !== "object") return "";
      if (block.type === "text" && typeof block.text === "string") return block.text;
      if (block.type === "tool-call" && typeof block.name === "string" && block.name) {
        const id = typeof block.id === "string" && block.id ? ` id=${block.id}` : "";
        const args = typeof block.arguments === "string" ? block.arguments : "{}";
        return `[tool-call${id} name=${block.name}]\n${args}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

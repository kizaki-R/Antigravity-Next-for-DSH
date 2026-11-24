import { createServer } from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const BODY_LIMIT = 1024 * 1024;
const TOOL_NAME_LIMIT = 64;
const PROTOCOL_VERSION = "2025-03-26";
const MCP_STDIO_SHIM = fileURLToPath(new URL("../../bin/acp-mcp-stdio.mjs", import.meta.url));
const NODE_EXECUTABLE = process.execPath;

/**
 * Per-ACP-request MCP Streamable HTTP bridge.
 * The bridge is loopback-only, bearer-authenticated, bounded, and closes with
 * the owning ACP session. Tool execution is delegated to DSH's ToolRuntime.
 */
export class AcpMcpBridge {
  constructor({ tools = [], onCall, onClose } = {}) {
    this.tools = projectTools(tools);
    this.toolsByMcpName = new Map(this.tools.map((tool) => [tool.mcpName, tool]));
    this.onCall = onCall;
    this.onClose = onClose;
    this.token = randomBytes(32).toString("hex");
    this.server = undefined;
    this.url = undefined;
    this.closed = false;
    this.inflight = new Map();
    this.toolQueue = Promise.resolve();
    this.stats = { requests: 0, byMethod: Object.create(null) };
  }

  get empty() {
    return this.tools.length === 0;
  }

  async start(signal) {
    if (this.closed) throw new Error("ACP MCP bridge is closed");
    if (signal?.aborted) {
      await this.close();
      throw new Error("ACP MCP bridge startup aborted");
    }
    if (this.empty) return undefined;
    if (this.server && this.url) return this.descriptor();

    this.server = createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "MCP bridge failure" } }));
      });
    });
    this.server.maxConnections = 64;
    let onAbort;
    try {
      await new Promise((resolve, reject) => {
        if (signal) {
          onAbort = () => reject(new Error("ACP MCP bridge startup aborted"));
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) {
            onAbort();
            return;
          }
        }
        this.server.once("error", reject);
        this.server.listen(0, "127.0.0.1", resolve);
      });
    } catch (error) {
      if (onAbort && signal) signal.removeEventListener("abort", onAbort);
      await this.close();
      throw error;
    }
    if (onAbort && signal) signal.removeEventListener("abort", onAbort);
    if (signal?.aborted) {
      await this.close();
      throw new Error("ACP MCP bridge startup aborted");
    }
    const address = this.server.address();
    if (!address || typeof address === "string") {
      await this.close();
      throw new Error("Could not bind ACP MCP bridge to loopback");
    }
    this.url = `http://127.0.0.1:${address.port}/mcp`;
    return this.descriptor();
  }

  descriptor() {
    if (!this.url) throw new Error("ACP MCP bridge is not listening");
    return {
      name: "agy-next-dsh-tools",
      command: NODE_EXECUTABLE,
      args: [MCP_STDIO_SHIM],
      env: [
        { name: "AGY_NEXT_MCP_BRIDGE_URL", value: this.url },
        { name: "AGY_NEXT_MCP_BRIDGE_TOKEN", value: this.token },
        { name: "ELECTRON_RUN_AS_NODE", value: "1" },
      ],
    };
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    for (const entry of this.inflight.values()) entry.controller.abort(new Error("ACP MCP bridge closed"));
    const server = this.server;
    this.server = undefined;
    this.url = undefined;
    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
      });
    }
    // Do not await in-flight tool bodies here: a body that ignores its abort
    // signal would otherwise keep close() pending forever. Aborting plus
    // closeAllConnections is the fail-closed boundary; results are discarded
    // once closed.
    this.inflight.clear();
    await this.onClose?.();
  }

  async handle(request, response) {
    if (this.closed) return jsonRpcError(response, null, -32000, "MCP bridge is closed");
    if (request.method !== "POST" || request.url !== "/mcp") {
      response.writeHead(405, { allow: "POST" }).end();
      return;
    }
    if (!validBearer(request.headers.authorization, this.token)) {
      response.writeHead(401, { "cache-control": "no-store" }).end();
      return;
    }

    let message;
    try {
      message = await readJson(request, BODY_LIMIT);
    } catch (error) {
      return jsonRpcError(response, null, -32700, error.message);
    }
    if (!isRecord(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return jsonRpcError(response, isRecord(message) ? message.id ?? null : null, -32600, "Invalid JSON-RPC request");
    }
    this.stats.requests++;
    this.stats.byMethod[message.method] = (this.stats.byMethod[message.method] ?? 0) + 1;

    const id = message.id;
    if (id === undefined) {
      if (message.method === "notifications/initialized") {
        response.writeHead(202, { "cache-control": "no-store" }).end();
      } else if (message.method === "notifications/cancelled") {
        const cancelId = message.params?.requestId;
        if (cancelId !== undefined && cancelId !== null) {
          const entry = this.inflight.get(idKey(cancelId));
          entry?.controller.abort(new Error("MCP request cancelled"));
        }
        response.writeHead(202, { "cache-control": "no-store" }).end();
      } else {
        response.writeHead(202, { "cache-control": "no-store" }).end();
      }
      return;
    }

    switch (message.method) {
      case "initialize": {
        const requested = message.params?.protocolVersion;
        responseJson(response, id, {
          protocolVersion: typeof requested === "string" ? requested : PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "agy-next-dsh-bridge", version: "2.0.0" },
        });
        return;
      }
      case "ping":
        responseJson(response, id, {});
        return;
      case "tools/list":
        responseJson(response, id, {
          tools: this.tools.map((tool) => ({
            name: tool.mcpName,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
        return;
      case "tools/call":
        await this.callTool(id, message.params, request, response);
        return;
      default:
        jsonRpcError(response, id, -32601, `Method not found: ${message.method}`);
    }
  }

  async callTool(id, params, request, response) {
    if (!isRecord(params) || typeof params.name !== "string") {
      jsonRpcError(response, id, -32602, "tools/call requires a tool name");
      return;
    }
    const tool = this.toolsByMcpName.get(params.name);
    if (!tool) {
      responseJson(response, id, toolFailure(`Unknown DSH tool: ${params.name}`));
      return;
    }
    const args = params.arguments === undefined ? {} : params.arguments;
    if (!isRecord(args)) {
      responseJson(response, id, toolFailure("Tool arguments must be a JSON object"));
      return;
    }
    if (typeof this.onCall !== "function") {
      responseJson(response, id, toolFailure("DSH tool executor is unavailable"));
      return;
    }

    const controller = new AbortController();
    const key = idKey(id);
    if (this.inflight.has(key)) {
      jsonRpcError(response, id, -32600, "Duplicate in-flight JSON-RPC id");
      return;
    }
    const entry = { controller, done: Promise.resolve() };
    this.inflight.set(key, entry);
    const abortOnDisconnect = () => {
      if (!response.writableEnded) controller.abort(new Error("MCP client disconnected"));
    };
    response.once("close", abortOnDisconnect);
    request.once("aborted", () => controller.abort(new Error("MCP request aborted")));

    const call = async () => {
      if (this.closed) throw new Error("MCP bridge closed before tool dispatch");
      controller.signal.throwIfAborted();
      return this.onCall({ id: randomUUID(), name: tool.dshName, arguments: args, signal: controller.signal });
    };
    const pending = this.toolQueue.then(call, call);
    this.toolQueue = pending.then(() => undefined, () => undefined);
    entry.done = pending.then(
      (result) => {
        if (!this.closed && !response.destroyed) responseJson(response, id, controller.signal.aborted ? toolFailure("MCP request was cancelled") : toMcpResult(result));
      },
      (error) => {
        if (!this.closed && !response.destroyed) responseJson(response, id, toolFailure(controller.signal.aborted ? "MCP request was cancelled" : safeError(error)));
      },
    ).finally(() => {
      response.removeListener("close", abortOnDisconnect);
      this.inflight.delete(key);
    });
    await entry.done;
  }
}

export function projectTools(tools) {
  if (!Array.isArray(tools)) return [];
  const projected = [];
  const names = new Set();
  for (const source of tools) {
    if (!isRecord(source) || typeof source.name !== "string" || !source.name) continue;
    const mcpName = `dsh_${source.name}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, TOOL_NAME_LIMIT);
    if (names.has(mcpName)) throw new Error(`DSH tools collide after MCP name projection: ${source.name}`);
    names.add(mcpName);
    const inputSchema = projectSchema(source.parameters);
    if (inputSchema.type !== "object") throw new Error(`DSH tool ${source.name} must have an object parameter schema`);
    projected.push({
      dshName: source.name,
      mcpName,
      description: typeof source.description === "string" ? source.description.slice(0, 4096) : "",
      inputSchema,
    });
  }
  return projected;
}

function projectSchema(schema) {
  if (!isRecord(schema)) return { type: "object", properties: {} };
  const type = typeof schema.type === "string" ? schema.type : undefined;
  if (type && !["object", "array", "string", "number", "integer", "boolean", "null"].includes(type)) {
    throw new Error(`Unsupported DSH tool schema type: ${type}`);
  }
  const supported = new Set([
    "$schema",
    "$id",
    "$defs",
    "definitions",
    "$ref",
    "$comment",
    "type",
    "oneOf",
    "anyOf",
    "allOf",
    "not",
    "if",
    "then",
    "else",
    "description",
    "title",
    "default",
    "examples",
    "required",
    "additionalProperties",
    "unevaluatedProperties",
    "propertyNames",
    "patternProperties",
    "dependentRequired",
    "dependentSchemas",
    "minProperties",
    "maxProperties",
    "enum",
    "const",
    "properties",
    "items",
    "prefixItems",
    "contains",
    "unevaluatedItems",
    "format",
    "contentMediaType",
    "contentEncoding",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
    "uniqueItems",
    "nullable",
    "readOnly",
    "writeOnly",
    "deprecated",
  ]);
  const unsupported = Object.keys(schema).filter((key) => !supported.has(key));
  if (unsupported.length) throw new Error(`Unsupported DSH tool schema keywords: ${unsupported.join(", ")}`);
  const out = {};
  if (typeof schema.$id === "string") out.$id = schema.$id;
  if (typeof schema.$ref === "string") out.$ref = schema.$ref;
  if (type) out.type = type;
  if (schema.oneOf !== undefined) {
    if (!Array.isArray(schema.oneOf) || schema.oneOf.length < 2) throw new Error("DSH tool oneOf requires at least two schema branches");
    out.oneOf = schema.oneOf.map(projectSchema);
  }
  for (const branchKey of ["anyOf", "allOf", "prefixItems"]) {
    if (Array.isArray(schema[branchKey])) out[branchKey] = schema[branchKey].map(projectSchema);
  }
  for (const subKey of ["not", "if", "then", "else", "contains", "propertyNames"]) {
    if (isRecord(schema[subKey])) out[subKey] = projectSchema(schema[subKey]);
  }
  if (Object.hasOwn(schema, "default")) out.default = schema.default;
  if (Object.hasOwn(schema, "examples")) out.examples = schema.examples;
  for (const key of ["description", "title"]) if (typeof schema[key] === "string") out[key] = schema[key].slice(0, 2048);
  for (const strKey of ["format", "contentMediaType", "contentEncoding"]) {
    if (typeof schema[strKey] === "string") out[strKey] = schema[strKey];
  }
  for (const numKey of ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "minItems", "maxItems", "minProperties", "maxProperties"]) {
    if (typeof schema[numKey] === "number" && Number.isFinite(schema[numKey])) out[numKey] = schema[numKey];
  }
  for (const boolKey of ["additionalProperties", "unevaluatedProperties", "unevaluatedItems", "uniqueItems", "nullable", "readOnly", "writeOnly", "deprecated"]) {
    if (typeof schema[boolKey] === "boolean") out[boolKey] = schema[boolKey];
  }
  if (isRecord(schema.additionalProperties)) out.additionalProperties = projectSchema(schema.additionalProperties);
  if (Array.isArray(schema.required)) out.required = schema.required.filter((value) => typeof value === "string");
  if (isRecord(schema.dependentRequired)) out.dependentRequired = schema.dependentRequired;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (Object.hasOwn(schema, "const")) out.const = schema.const;
  for (const mapKey of ["$defs", "definitions", "properties", "patternProperties", "dependentSchemas"]) {
    if (isRecord(schema[mapKey])) {
      out[mapKey] = {};
      for (const [key, child] of Object.entries(schema[mapKey])) {
        out[mapKey][key] = projectSchema(child);
      }
    }
  }
  if (isRecord(schema.items)) out.items = projectSchema(schema.items);
  else if (typeof schema.items === "boolean") out.items = schema.items;
  return out;
}

function toMcpResult(result) {
  const content = [];
  if (Array.isArray(result?.content)) {
    for (const block of result.content) {
      if (block?.type === "text" && typeof block.text === "string") content.push({ type: "text", text: block.text });
      else if (block?.type === "image") content.push({ type: "text", text: "[DSH tool returned an image; Antigravity MCP bridge exposes text results only.]" });
    }
  }
  if (content.length === 0) {
    const value = result?.value;
    const text = typeof value === "string" ? value : value === undefined ? "Tool completed without textual output." : safeJson(value);
    content.push({ type: "text", text });
  }
  return { content, isError: result?.isError === true };
}

function toolFailure(text) {
  return { content: [{ type: "text", text }], isError: true };
}

function responseJson(response, id, result) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

function jsonRpcError(response, id, code, message) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

async function readJson(request, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > limit) throw new Error("MCP request body exceeds 1 MiB");
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("MCP request body is not valid JSON");
  }
}

function validBearer(header, token) {
  if (typeof header !== "string") return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function idKey(id) {
  return `${typeof id}:${String(id)}`;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "Tool completed.";
  }
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export { BODY_LIMIT as MCP_BODY_LIMIT };

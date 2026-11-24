#!/usr/bin/env node
/**
 * ACP v1-required stdio MCP transport shim.
 * Relays MCP JSON-RPC to the owning plugin's loopback-only HTTP bridge.
 * Configuration is supplied via the ACP session's per-server env; stdout is
 * reserved for MCP frames and this helper never logs credentials.
 */
import readline from "node:readline";

const bridgeUrl = process.env.AGY_NEXT_MCP_BRIDGE_URL;
const bridgeToken = process.env.AGY_NEXT_MCP_BRIDGE_TOKEN;
const MAX_FRAME = 1024 * 1024;
const active = new Set();
let closed = false;
let initialized = false;

if (!validUrl(bridgeUrl) || typeof bridgeToken !== "string" || bridgeToken.length < 40) {
  process.stderr.write("agy-next MCP bridge configuration is invalid\n");
  process.exit(2);
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
input.on("line", (line) => {
  if (closed) return;
  if (Buffer.byteLength(line, "utf8") > MAX_FRAME) {
    process.stderr.write("agy-next MCP frame exceeds 1 MiB\n");
    process.exitCode = 2;
    return;
  }
  let request;
  try { request = JSON.parse(line); } catch {
    writeFrame({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON" } });
    return;
  }
  const task = forward(request).catch((error) => {
    const code = typeof error?.cause?.code === "string" ? ` (${error.cause.code})` : "";
    if (request?.id !== undefined) writeFrame({ jsonrpc: "2.0", id: request.id, error: { code: -32000, message: `DSH MCP bridge unavailable${code}` } });
  }).finally(() => active.delete(task));
  active.add(task);
});
input.on("close", async () => {
  closed = true;
  await Promise.allSettled([...active]);
});

async function forward(message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    writeFrame({ jsonrpc: "2.0", id: message?.id ?? null, error: { code: -32600, message: "Invalid JSON-RPC request" } });
    return;
  }
  if (message.method === "initialize" && message.id !== undefined) {
    initialized = true;
    writeFrame({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: message.params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "agy-next-mcp-stdio-shim", version: "2.0.0-acp.1" },
      },
    });
    return;
  }
  if (!initialized && message.method !== "notifications/initialized") {
    if (message.id !== undefined) writeFrame({ jsonrpc: "2.0", id: message.id, error: { code: -32002, message: "MCP initialize is required" } });
    return;
  }
  if (message.method === "ping" && message.id !== undefined) {
    writeFrame({ jsonrpc: "2.0", id: message.id, result: {} });
    return;
  }
  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${bridgeToken}` },
    body: JSON.stringify(message),
    signal: message.method === "tools/call" ? AbortSignal.timeout(15 * 60_000) : undefined,
  });
  if (message.id === undefined) return;
  if (!response.ok) {
    writeFrame({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: `DSH MCP bridge HTTP ${response.status}` } });
    return;
  }
  const result = await response.json();
  writeFrame(result);
}

function writeFrame(message) {
  if (closed || process.stdout.destroyed) return;
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function validUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" && parsed.hostname === "127.0.0.1" && parsed.pathname === "/mcp";
  } catch {
    return false;
  }
}

#!/usr/bin/env node
/** Offline checks for the loopback MCP bridge. No ACP server, no tokens. */
import assert from "node:assert/strict";

import { AcpMcpBridge, projectTools } from "../lib/acp/mcp-bridge.js";
import { classifyAcpError } from "../lib/acp/service.js";
import { AcpError } from "../lib/acp/connection.js";
import { sessionConfigParams } from "../lib/acp/connection.js";
import { spawn } from "node:child_process";
import readline from "node:readline";

const rawTools = [
  {
    name: "read_file",
    description: "Read a file",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "path" } },
      additionalProperties: false,
      required: ["path"],
    },
  },
];
const tools = projectTools(rawTools);
assert.equal(tools.length, 1);
assert.equal(tools[0].mcpName, "dsh_read_file");
assert.equal(tools[0].inputSchema.required[0], "path");
const union = { type: "object", properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } }, additionalProperties: false };
assert.deepEqual(projectTools([{ name: "union", parameters: union }])[0].inputSchema, union);
assert.deepEqual(projectTools([{ name: "zod_tool", parameters: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: { q: { type: "string" } }, additionalProperties: false } }])[0].inputSchema, { type: "object", properties: { q: { type: "string" } }, additionalProperties: false });
assert.throws(() => projectTools([{ name: "bounded", parameters: { type: "object", properties: { value: { type: "string", pattern: "^x$" } } } }]), /Unsupported DSH tool schema keywords: pattern/);

const calls = [];
const bridge = new AcpMcpBridge({
  tools: rawTools,
  onCall: async (call) => {
    calls.push(call);
    if (call.arguments.path === "deny") {
      return { isError: true, content: [{ type: "text", text: "Error: denied by policy" }] };
    }
    if (call.arguments.path === "cancel") {
      await new Promise((resolve) => call.signal.addEventListener("abort", resolve, { once: true }));
      return { isError: false, content: [{ type: "text", text: "late success must not escape" }] };
    }
    return { isError: false, content: [{ type: "text", text: `read:${call.arguments.path}` }] };
  },
});

const descriptor = await bridge.start();
assert.equal(descriptor.name, "agy-next-dsh-tools");
assert.ok(descriptor.command);
assert.ok(Array.isArray(descriptor.args));
assert.match(descriptor.env[0].value, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
assert.equal(descriptor.env.find((item) => item.name === "ELECTRON_RUN_AS_NODE")?.value, "1");
const url = descriptor.env.find((item) => item.name === "AGY_NEXT_MCP_BRIDGE_URL").value;
const auth = `Bearer ${descriptor.env.find((item) => item.name === "AGY_NEXT_MCP_BRIDGE_TOKEN").value}`;

async function rpc(message, bearer = auth) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: bearer },
    body: JSON.stringify({ jsonrpc: "2.0", ...message }),
  });
  return res.json();
}

const child = spawn(descriptor.command, descriptor.args, {
  env: { ...process.env, ...Object.fromEntries(descriptor.env.map((item) => [item.name, item.value])) },
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity, terminal: false });
let nextId = 1;
const pending = new Map();
lines.on("line", (line) => {
  const message = JSON.parse(line);
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message);
});
const stdioRpc = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
});
const stdioNotify = (method, params = {}) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
try {
  const init = await stdioRpc("initialize", { protocolVersion: "2025-03-26", capabilities: {} });
  assert.equal(init.result.serverInfo.name, "agy-next-mcp-stdio-shim");
  stdioNotify("notifications/initialized", {});

  const list = await stdioRpc("tools/list");
  assert.equal(list.result.tools[0].name, "dsh_read_file");

  const ok = await stdioRpc("tools/call", { name: "dsh_read_file", arguments: { path: "a.txt" } });
  assert.equal(ok.result.isError, false);
  assert.equal(ok.result.content[0].text, "read:a.txt");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "read_file");

  const denied = await stdioRpc("tools/call", { name: "dsh_read_file", arguments: { path: "deny" } });
  assert.equal(denied.result.isError, true);
  assert.match(denied.result.content[0].text, /denied by policy/);

  const unknown = await stdioRpc("tools/call", { name: "nope", arguments: {} });
  assert.equal(unknown.result.isError, true);

  const cancelId = nextId;
  const cancellation = stdioRpc("tools/call", { name: "dsh_read_file", arguments: { path: "cancel" } });
  const deadline = Date.now() + 3000;
  while (!calls.some((call) => call.arguments.path === "cancel")) {
    if (Date.now() > deadline) throw new Error("cancel test tool did not start");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  stdioNotify("notifications/cancelled", { requestId: cancelId });
  const cancelled = await Promise.race([cancellation, new Promise((_, reject) => setTimeout(() => reject(new Error("cancelled request did not settle")), 3000))]);
  assert.equal(cancelled.result.isError, true);
  assert.match(cancelled.result.content[0].text, /cancelled/i);
} finally {
  child.stdin.end();
  lines.close();
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", resolve);
    setTimeout(() => { child.kill(); resolve(); }, 2_000).unref?.();
  });
}

const unauth = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer wrong" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 6, method: "ping" }),
});
assert.equal(unauth.status, 401);

await bridge.close();

// Non-cooperative tool body (ignores AbortSignal): bridge.close() must not hang,
// must close the server promptly, and must discard any late completion after close.
{
  let nonCooperativeStarted = false;
  let nonCooperativeFinishedAfterClose = false;
  let resolveNonCooperative;
  const nonCooperativePromise = new Promise((resolve) => {
    resolveNonCooperative = resolve;
  });
  const closeBridge = new AcpMcpBridge({
    tools: rawTools,
    onCall: async () => {
      nonCooperativeStarted = true;
      // Intentionally ignore call.signal to verify bridge close boundary.
      const value = await nonCooperativePromise;
      nonCooperativeFinishedAfterClose = true;
      return { isError: false, content: [{ type: "text", text: value }] };
    },
  });
  const desc = await closeBridge.start();
  const bridgeUrl = desc.env.find((item) => item.name === "AGY_NEXT_MCP_BRIDGE_URL").value;
  const bridgeAuth = `Bearer ${desc.env.find((item) => item.name === "AGY_NEXT_MCP_BRIDGE_TOKEN").value}`;
  const inFlightFetch = fetch(bridgeUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: bridgeAuth },
    body: JSON.stringify({ jsonrpc: "2.0", id: 99, method: "tools/call", params: { name: "dsh_read_file", arguments: { path: "hang.txt" } } }),
  }).catch((error) => ({ abortedByClose: true, error }));

  const waitStart = Date.now();
  while (!nonCooperativeStarted) {
    if (Date.now() - waitStart > 2_000) throw new Error("non-cooperative tool did not start");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const closeStart = Date.now();
  await closeBridge.close();
  assert.ok(Date.now() - closeStart < 1_000, "bridge.close() must not wait for a tool body that ignores AbortSignal");
  const fetchOutcome = await inFlightFetch;
  assert.equal(fetchOutcome.abortedByClose, true, "closing bridge must terminate in-flight HTTP connection");
  resolveNonCooperative("late-side-effect");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(nonCooperativeFinishedAfterClose, true, "a tool body ignoring AbortSignal can still run its own JS continuation in-process, though its result cannot escape the closed bridge");
}

assert.equal(classifyAcpError(new AcpError("auth", "need login")).code, "auth");
assert.equal(classifyAcpError(new AcpError("timeout", "slow")).code, "timeout");
assert.equal(classifyAcpError(new Error("spawn failed")).code, "spawn");
const params = sessionConfigParams("C:/tmp", [descriptor]);
assert.equal(params.mcpServers[0].name, "agy-next-dsh-tools");
assert.equal(params.mcpServers[0].command, descriptor.command);
assert.ok(params.mcpServers[0].env.every((item) => typeof item.value === "string"));

console.log("acp mcp bridge offline: ok");

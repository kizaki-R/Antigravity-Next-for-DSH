#!/usr/bin/env node
/** Optional live ACP stdio MCP smoke test using a harmless local DSH tool. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Context } from "@deepseek-ai/cordis";
import { ToolCallId } from "@deepseek-ai/dsh-llm";
import ToolRuntime, { defineTool } from "@deepseek-ai/dsh-tools";
import { SystemPrompt } from "@deepseek-ai/dsh-system-prompt";
import { createScope } from "@deepseek-ai/dsh-scope";
import { promptAcp } from "../lib/acp/service.js";
import { projectTools } from "../lib/acp/mcp-bridge.js";
import { resolveAcpLaunch } from "../lib/acp/runtime.js";
import { selectSafeAllowOnceOption } from "../lib/acp/adapter.js";

const expected = "ACP_STDIO_TOOL_OK";
let executed = 0;
let approvalCount = 0;
let acpPermissionCount = 0;
const root = new Context();
new SystemPrompt(root, {});
const agent = { id: `agy-next-live-test-${randomUUID()}`, session: { header: { cwd: process.cwd() } } };
const scope = createScope(root, agent);
agent.ctx = scope.ctx;
const tools = new ToolRuntime(agent.ctx);
const tool = defineTool({
  name: "agy_next_live_probe",
  description: "Return the provided value unchanged; safe, read-only integration probe.",
  parameters: { value: { type: "string", description: "value to echo", required: true } },
  output: {
    schema: { type: "object", properties: { value: { type: "string", required: true } }, additionalProperties: false },
    render: (_args, value) => [{ type: "text", text: value.value }],
  },
  async execute(args) {
    executed++;
    return { value: args.value };
  },
});
const disposeTool = tools.register(tool);
const disposeAsk = agent.ctx.on("tools/pre-execute", (exec, next) =>
  exec.name === tool.name ? Promise.resolve({ kind: "ask", reason: "Live ACP stdio MCP smoke test" }) : next(),
);
const disposeApproval = agent.ctx.provide("approval", {
  async request(request) {
    approvalCount++;
    assert.equal(request.agent, agent);
    assert.equal(request.toolName, tool.name);
    return "allowed-once";
  },
});

let streamed = "";
try {
  const launch = resolveAcpLaunch();
  const mcpName = projectTools(tools.schemas(agent))[0]?.mcpName;
  assert.equal(mcpName, "dsh_agy_next_live_probe");
  let mcpStats = null;
  const result = await promptAcp({
    model: "gemini-4-neon",
    cwd: process.cwd(),
    text: `Call ${mcpName} exactly once with {"value":"${expected}"}. The tool returns this fixed string without side effects. Do not answer until the tool has returned; then reply with only the returned value.`,
    tools: tools.schemas(agent),
    signal: AbortSignal.timeout(120_000),
    onUpdate(params) {
      const text = params?.update?.content?.text;
      if (params?.update?.sessionUpdate === "agent_message_chunk" && typeof text === "string") streamed += text;
    },
    onCall(call) {
      if (call.name !== tool.name || call.arguments?.value !== expected) {
        return Promise.resolve({ isError: true, content: [{ type: "text", text: "Live smoke only permits the fixed no-op echo tool and value." }] });
      }
      return tools.execute({ callId: ToolCallId(String(call.id)), name: call.name, arguments: call.arguments, agent, signal: call.signal });
    },
    onMcpStats(stats) { mcpStats = stats; },
    // TEST-ONLY OPT-IN SEAM: Production AntigravityAcpAdapter cancels all
    // ACP-native `session/request_permission` requests (fail-closed) because
    // ACP v1 provides no cryptographic proof tying a permission prompt to the
    // DSH MCP bridge. In this standalone probe only, if the official ACP server
    // prompts for the fixed no-op echo tool and advertises an `allow_once`
    // option, select that advertised `optionId` (never `allow_always`).
    // Passing this script does NOT prove the production fail-closed adapter path.
    onPermission(params) {
      const name = params?.toolCall?.name;
      acpPermissionCount++;
      const allow = name === mcpName || name === tool.name;
      const optionId = allow ? selectSafeAllowOnceOption(params?.options) : undefined;
      return Promise.resolve({
        outcome: optionId ? { outcome: "selected", optionId } : { outcome: "cancelled" },
      });
    },
  });
  assert.equal(executed, 1, `expected one harmless DSH tool execution; executed=${executed}; approvalRequests=${approvalCount}; mcp=${JSON.stringify(mcpStats)}; stopReason=${result.stopReason}; output=${streamed}`);
  assert.equal(approvalCount, 1, `expected one DSH approval seam request; approvalRequests=${approvalCount}; mcp=${JSON.stringify(mcpStats)}; output=${streamed}`);
  assert.ok(mcpStats?.byMethod?.["tools/list"] >= 1, "expected DSH tools/list request");
  assert.ok(mcpStats?.byMethod?.["tools/call"] >= 1, "expected DSH tools/call request");
  assert.equal(result.stopReason, "end_turn");
  assert.match(streamed, new RegExp(expected));
  console.log(JSON.stringify({
    launch: launch.source,
    server: "official ACP v1",
    transport: "stdio MCP shim",
    model: result.model,
    stopReason: result.stopReason,
    toolExecutions: executed,
    approvalRequests: approvalCount,
    acpPermissionRequests: acpPermissionCount,
    mcpStats,
    output: streamed.trim(),
  }, null, 2));
} finally {
  disposeAsk();
  disposeTool();
  await disposeApproval();
  await scope.dispose();
}

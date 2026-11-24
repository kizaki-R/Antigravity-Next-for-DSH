#!/usr/bin/env node
/**
 * Mock ACP stdio ↔ loopback MCP ↔ real DSH ToolRuntime integration checks.
 * Uses the installed public host peers in AGY_PEER_ROOT; no desktop/profile writes.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { register } from "node:module";
import readline from "node:readline";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

if (!process.env.AGY_PEER_ROOT) {
  const defaultPeers = fileURLToPath(new URL("../peer-rc5/node_modules", import.meta.url));
  if (existsSync(defaultPeers)) process.env.AGY_PEER_ROOT = defaultPeers;
}
if (process.env.AGY_PEER_ROOT) {
  register("./peer-resolve.mjs", import.meta.url);
}

const { AcpError } = await import("../lib/acp/connection.js");
const { projectTools } = await import("../lib/acp/mcp-bridge.js");
const { promptAcp, setAcpRuntimeFactoryForTests, transcriptText } = await import("../lib/acp/service.js");
const { AntigravityAcpAdapter, resolveOpenTurnStep, selectSafeAllowOnceOption } = await import("../lib/acp/adapter.js");
const { ToolCallId, createUserMessage } = await import("@deepseek-ai/dsh-llm");
const { default: ToolRuntime, assertSupportedJsonSchema, defineTool } = await import("@deepseek-ai/dsh-tools");
const { Context } = await import("@deepseek-ai/cordis");
const { SystemPrompt } = await import("@deepseek-ai/dsh-system-prompt");
const { createScope } = await import("@deepseek-ai/dsh-scope");
const { Session, SessionStore, foldSurface, interruptedTurnClosers } = await import("@deepseek-ai/dsh-session");
const { ApprovalService } = await import("@deepseek-ai/dsh-user-approval");

const MODEL = "gemini-test";

class StdioMcpClient {
  constructor(server) {
    this.child = spawn(server.command, server.args, { env: { ...process.env, ...Object.fromEntries(server.env.map((item) => [item.name, item.value])) }, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.lines = readline.createInterface({ input: this.child.stdout, crlfDelay: Infinity, terminal: false });
    this.pending = new Map();
    this.nextId = 1;
    this.lines.on("line", (line) => {
      const message = JSON.parse(line);
      const item = this.pending.get(message.id);
      if (!item) return;
      this.pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message);
    });
  }
  request(method, params) {
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return promise;
  }
  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }
  async close() {
    this.child.stdin.end();
    this.lines.close();
    await new Promise((resolve) => {
      if (this.child.exitCode !== null) return resolve();
      this.child.once("exit", resolve);
      setTimeout(() => { this.child.kill(); resolve(); }, 2_000).unref?.();
    });
  }
}

class FakeAcpRuntime {
  constructor({
    toolDecision = "allow",
    hangPrompt = false,
    toolArgs = {},
    promptText = "[user]\nrun probe",
    permissionName = "dsh_probe",
    requestPermission = false,
    permissionIdOnly = false,
    permissionOptions = [
      { optionId: "allow-once", name: "Allow once", kind: "allow_once" },
      { optionId: "reject-once", name: "Reject", kind: "reject_once" },
    ],
    skipMcpCall = false,
    multiCalls = undefined,
  } = {}) {
    this.options = {
      toolDecision,
      hangPrompt,
      toolArgs,
      promptText,
      permissionName,
      requestPermission,
      permissionIdOnly,
      permissionOptions,
      skipMcpCall,
      multiCalls,
    };
    this.stdout = new PassThrough();
    this.stderrTail = "";
    this.alive = true;
    this.launch = { command: "fake-agy", args: ["acp"], source: "agy-acp" };
    this.exited = new Promise((resolve) => { this.resolveExit = resolve; });
    this.writes = [];
    this.closed = false;
    this.cancelled = false;
    this.toolResultArrived = false;
    this.permissionResponses = [];
    this.mcpDescriptor = undefined;
  }

  write(frame) {
    this.writes.push(frame);
    const message = JSON.parse(frame);
    if (message.method === "session/cancel") { this.cancelled = true; return; }
    if (this.permissionWaiters?.has(message.id)) {
      this.permissionResponses.push(message.result);
      const waiter = this.permissionWaiters.get(message.id);
      this.permissionWaiters.delete(message.id);
      waiter();
      return;
    }
    if (!message.method || message.id === undefined) return;
    void this.respond(message).catch((error) => {
      if (this.alive) this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32603, message: error.message } })}\n`);
    });
  }

  async respond(message) {
    const { id, method, params } = message;
    if (method === "initialize") {
      this.reply(id, { protocolVersion: 1, authMethods: [{ id: "oauth-personal" }], agentCapabilities: { mcpCapabilities: { http: false, sse: false } }, agentInfo: { name: "fake-acp", version: "test" } });
      return;
    }
    if (method === "session/new") {
      assert.ok(params.cwd, "session/new must carry workspace cwd");
      this.mcpDescriptor = params.mcpServers?.[0];
      assert.ok(this.mcpDescriptor, "session/new must include the MCP stdio shim");
      assert.equal(this.mcpDescriptor.type, undefined, "ACP-required stdio transport is used");
      assert.ok(this.mcpDescriptor.command);
      assert.ok(Array.isArray(this.mcpDescriptor.args));
      assert.ok(Array.isArray(this.mcpDescriptor.env));
      this.config = [{ type: "select", id: "model", category: "model", currentValue: "default-model", options: [{ value: "default-model" }, { value: MODEL }] }];
      this.reply(id, { sessionId: "acp-session-1", configOptions: this.config });
      return;
    }
    if (method === "session/set_config_option") {
      this.config = [{ type: "select", id: "model", category: "model", currentValue: params.value, options: [{ value: "default-model" }, { value: MODEL }] }];
      this.reply(id, { configOptions: this.config });
      return;
    }
    if (method === "session/prompt") {
      if (this.options.promptText !== null) {
        assert.equal(params.prompt[0].text, this.options.promptText);
      }
      if (this.options.requestPermission) {
        const permissionId = 900 + this.permissionResponses.length;
        const replied = new Promise((resolve) => { this.permissionWaiters ??= new Map(); this.permissionWaiters.set(permissionId, resolve); });
        if (!this.options.permissionIdOnly && this.options.permissionName) {
          this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "acp-session-1", update: { sessionUpdate: "tool_call", toolCallId: "call_1", name: this.options.permissionName, title: "probe" } } })}\n`);
        }
        const toolCallPayload = this.options.permissionIdOnly
          ? { toolCallId: "call_1" }
          : { toolCallId: "call_1", ...(this.options.permissionName ? { name: this.options.permissionName } : {}) };
        this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: permissionId, method: "session/request_permission", params: { sessionId: "acp-session-1", toolCall: toolCallPayload, options: this.options.permissionOptions } })}\n`);
        await replied;
      }
      if (this.mcpDescriptor && !this.options.skipMcpCall) {
        const mcp = new StdioMcpClient(this.mcpDescriptor);
        try {
          const init = await mcp.request("initialize", { protocolVersion: "2025-03-26", capabilities: {} });
          assert.equal(init.result.serverInfo.name, "agy-next-mcp-stdio-shim");
          mcp.notify("notifications/initialized", {});
          const list = await mcp.request("tools/list", {});
          assert.equal(list.result.tools[0].name, "dsh_probe");
          const callsToRun = Array.isArray(this.options.multiCalls)
            ? this.options.multiCalls
            : [{ name: "dsh_probe", arguments: this.options.toolArgs }];
          for (const callSpec of callsToRun) {
            const result = await mcp.request("tools/call", callSpec);
            this.toolResultArrived = true;
            if (this.options.toolDecision === "deny") assert.equal(result.result.isError, true);
            else assert.equal(result.result.isError, false, `unexpected DSH tool result: ${JSON.stringify(result.result)}`);
          }
        } finally {
          await mcp.close();
        }
      }
      if (this.options.hangPrompt) {
        const started = Date.now();
        while (!this.cancelled && Date.now() - started < 2_000) await new Promise((resolve) => setTimeout(resolve, 5));
        if (this.cancelled) { this.reply(id, { stopReason: "cancelled" }); return; }
        throw new Error("cancel notification was not sent");
      }
      if (!this.options.skipMcpCall) {
        assert.equal(this.toolResultArrived, Boolean(this.mcpDescriptor), "ACP prompt must await MCP tool response");
      }
      this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "acp-session-1", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "done" } } } })}\n`);
      this.reply(id, { stopReason: "end_turn" });
    }
  }

  reply(id, result) { if (this.alive) this.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`); }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this.alive = false;
    this.stdout.destroy();
    this.resolveExit({ code: 0, signal: null, stderrTail: "" });
  }
}

const runtimes = [];
let nextRuntimeOptions = {};
const restoreRuntime = setAcpRuntimeFactoryForTests(() => {
  const runtime = new FakeAcpRuntime(nextRuntimeOptions);
  runtimes.push(runtime);
  return runtime;
});

const ctx = new Context();
const root = ctx;
const systemPrompt = new SystemPrompt(root, {});
const agent = { id: "dsh-agent-1", session: { header: { cwd: process.cwd() } } };
const scopeHandle = createScope(root, agent);
const agentCtx = scopeHandle.ctx;
agent.ctx = agentCtx;
const tools = new ToolRuntime(root);
let bodyCalls = 0;
const approvalOutcomes = [];
const approvalRequests = [];
const approval = {
  async request(event) {
    approvalRequests.push(event);
    return approvalOutcomes.shift() ?? "unavailable";
  },
};
const disposeApproval = root.provide("approval", approval);
const toolDefinition = defineTool({
  name: "probe",
  description: "Side-effect-free approval integration test",
  parameters: { mode: { type: "string", description: "decision scenario", required: true } },
  output: { schema: { type: "object", properties: { ok: { type: "boolean", required: true } }, additionalProperties: false }, render: (_args, value) => [{ type: "text", text: value.ok ? "approved" : "not-approved" }] },
  async execute(args) {
    bodyCalls++;
    if (args?.mode === "throw-error") throw new Error("probe body intentional error");
    return { ok: true };
  },
  isConcurrencySafe: () => false,
});
const disposeTool = tools.register(toolDefinition);
const disposeAskPolicy = root.on("tools/pre-execute", (execution, next) =>
  execution.name === "probe" ? Promise.resolve({ kind: "ask", reason: "integration approval test" }) : next(),
);
const liveAgents = new Map([[agent.id, agent]]);
let ambientAgent;
const adapter = new AntigravityAcpAdapter({
  agents: { get: (id) => liveAgents.get(id), currentInitiator: () => ambientAgent },
  tools,
});

const promptOptions = {
  provider: "agy-next",
  model: MODEL,
  sessionId: agent.id,
  system: undefined,
  messages: [{ role: "user", content: "run probe" }],
  cwd: process.cwd(),
  tools: tools.schemas(agent),
};

for (const tool of projectTools(promptOptions.tools)) {
  assertSupportedJsonSchema(tool.inputSchema, `MCP ${tool.mcpName} inputSchema must be legal DSH JSON Schema`);
}

try {
  // The MCP result is returned only after real ctx.tools.execute() completes.
  ambientAgent = agent;
  nextRuntimeOptions = { toolDecision: "allow", toolArgs: { mode: "allow" } };
  approvalOutcomes.push("allowed-once");
  const approved = [];
  for await (const chunk of adapter.stream(promptOptions)) approved.push(chunk);
  assert.equal(bodyCalls, 1);
  assert.equal(approvalRequests.length, 1, `approval request count=${approvalRequests.length}, DSH result=${JSON.stringify(runtimes.at(-1).toolResultArrived)}`);
  assert.equal(approvalRequests[0].agent, agent);
  assert.equal(approvalRequests[0].toolName, "probe");
  assert.equal(approvalRequests[0].callId, ToolCallId(approvalRequests[0].callId));
  assert.equal(approved.at(-1).type, "finish");
  assert.equal(runtimes.at(-1).toolResultArrived, true);
  assert.equal(runtimes.at(-1).closed, true);

  // Explicit rejection must return an MCP error and must not run the tool body.
  nextRuntimeOptions = { toolDecision: "deny", toolArgs: { mode: "deny" } };
  approvalOutcomes.push("rejected");
  const beforeReject = bodyCalls;
  const rejected = [];
  for await (const chunk of adapter.stream(promptOptions)) rejected.push(chunk);
  assert.equal(bodyCalls, beforeReject);
  assert.equal(approvalRequests.length, 2);
  assert.equal(runtimes.at(-1).toolResultArrived, true);

  // Approval cancellation is a fail-closed denial and does not execute body.
  nextRuntimeOptions = { toolDecision: "deny", toolArgs: { mode: "cancel" } };
  approvalOutcomes.push("cancelled");
  const beforeCancelApproval = bodyCalls;
  for await (const _chunk of adapter.stream(promptOptions)) {}
  assert.equal(bodyCalls, beforeCancelApproval);
  assert.equal(approvalRequests.length, 3);

  // P0 Security Boundary Negative Tests:
  // 1. selectSafeAllowOnceOption unit verification (only allow_once, never allow_always).
  assert.equal(
    selectSafeAllowOnceOption([{ optionId: "always-1", kind: "allow_always" }, { optionId: "once-1", kind: "allow_once" }]),
    "once-1",
  );
  assert.equal(
    selectSafeAllowOnceOption([{ optionId: "always-1", kind: "allow_always" }, { optionId: "reject-1", kind: "reject_once" }]),
    undefined,
  );
  assert.equal(selectSafeAllowOnceOption([]), undefined);

  // 2. Spoofed declared tool name on ACP-native permission (without MCP bridge invocation):
  // Production adapter must fail closed (`cancelled`) and never auto-approve.
  nextRuntimeOptions = {
    toolDecision: "allow",
    toolArgs: { mode: "acp-permission-spoofed" },
    requestPermission: true,
    permissionName: "dsh_probe",
    skipMcpCall: true,
  };
  const beforeSpoof = bodyCalls;
  for await (const _chunk of adapter.stream(promptOptions)) {}
  assert.equal(bodyCalls, beforeSpoof);
  assert.deepEqual(runtimes.at(-1).permissionResponses.at(-1), { outcome: { outcome: "cancelled" } });

  // 3. Undeclared tool must be cancelled by ACP-native permission and never reach DSH body.
  nextRuntimeOptions = {
    toolDecision: "deny",
    toolArgs: { mode: "acp-permission-deny" },
    requestPermission: true,
    permissionName: "dsh_other",
    skipMcpCall: true,
  };
  const beforeAcpDeny = bodyCalls;
  for await (const _chunk of adapter.stream(promptOptions)) {}
  assert.equal(bodyCalls, beforeAcpDeny);
  assert.deepEqual(runtimes.at(-1).permissionResponses.at(-1), { outcome: { outcome: "cancelled" } });

  // 4. Permission request with only toolCallId and no verifiable tool origin -> cancelled.
  nextRuntimeOptions = {
    toolDecision: "deny",
    requestPermission: true,
    permissionIdOnly: true,
    skipMcpCall: true,
  };
  for await (const _chunk of adapter.stream(promptOptions)) {}
  assert.equal(bodyCalls, beforeAcpDeny);
  assert.deepEqual(runtimes.at(-1).permissionResponses.at(-1), { outcome: { outcome: "cancelled" } });

  // 5. Permission request offering ONLY allow_always (no allow_once) -> cancelled.
  nextRuntimeOptions = {
    toolDecision: "deny",
    requestPermission: true,
    permissionName: "dsh_probe",
    permissionOptions: [{ optionId: "always-only", name: "Allow always", kind: "allow_always" }],
    skipMcpCall: true,
  };
  for await (const _chunk of adapter.stream(promptOptions)) {}
  assert.equal(bodyCalls, beforeAcpDeny);
  assert.deepEqual(runtimes.at(-1).permissionResponses.at(-1), { outcome: { outcome: "cancelled" } });

  // The live server's HTTP MCP capability is false; the stdio MCP shim remains usable.
  nextRuntimeOptions = { toolDecision: "allow", toolArgs: { mode: "stdio-only" } };
  approvalOutcomes.push("allowed-once");
  const beforeStdio = bodyCalls;
  for await (const _chunk of adapter.stream(promptOptions)) {}
  assert.equal(bodyCalls, beforeStdio + 1);
  assert.equal(runtimes.at(-1).toolResultArrived, true);
  assert.equal(approvalRequests.length, 4);
  liveAgents.delete(agent.id);
  const beforeNoAgent = runtimes.length;
  await assert.rejects(
    async () => { for await (const _chunk of adapter.stream(promptOptions)) {} },
    /No exact live DSH Agent/,
  );
  assert.equal(runtimes.length, beforeNoAgent);
  assert.equal(approvalRequests.length, 4);
  liveAgents.set(agent.id, agent);

  // Agent cancellation propagates through the DSH approval request and ACP session/cancel.
  nextRuntimeOptions = { toolDecision: "allow", hangPrompt: true, toolArgs: { mode: "cancel-turn" } };
  let resolveApproval;
  const approvalWait = new Promise((resolve) => { resolveApproval = resolve; });
  const cancelApproval = { request: async (event) => { approvalRequests.push(event); return approvalWait; } };
  await disposeApproval();
  const disposeCancelApproval = root.provide("approval", cancelApproval);
  const controller = new AbortController();
  ambientAgent = agent;
  const cancelOptions = { ...promptOptions, signal: controller.signal };
  const consuming = (async () => { for await (const _chunk of adapter.stream(cancelOptions)) {} })();
  await new Promise((resolve) => setTimeout(resolve, 30));
  controller.abort(new Error("integration cancel"));
  resolveApproval("cancelled");
  await assert.rejects(consuming, (error) => error instanceof Error);
  assert.equal(runtimes.at(-1).cancelled, true);
  assert.equal(runtimes.at(-1).closed, true);
  await disposeCancelApproval();

  // P1 Durable DSH Session Recording, Multi-Turn Context, Reload, Fail-Closed & Recovery Tests
  // Uses real @deepseek-ai/dsh-session@0.2.1-rc.5 Session/SessionStore and @deepseek-ai/dsh-user-approval@0.2.1-rc.5 ApprovalService.
  {
    const sessionStore = new SessionStore(root);
    const durableSession = sessionStore.create("dsh-durable-agent", {
      meta: { cwd: process.cwd() },
    });
    const durableAgent = { id: durableSession.id, session: durableSession };
    const durableScope = createScope(root, durableAgent);
    durableAgent.ctx = durableScope.ctx;
    const approvalService = new ApprovalService(root, { policy: "ask" });
    let nextApprovalDecision = "allowed-once";
    const disposeApprovalAnswerer = root.on("approval/request", () => Promise.resolve(nextApprovalDecision));
    liveAgents.set(durableAgent.id, durableAgent);
    ambientAgent = durableAgent;

    try {
      // Fail-closed check: if a durable Session has no open turn/step boundary, executeTool
      // must fail closed before invoking the tool body.
      const beforeNoOpenStep = bodyCalls;
      await assert.rejects(
        () =>
          adapter.executeTool(
            { id: "no-step-call", name: "probe", arguments: { mode: "no-step" }, signal: new AbortController().signal },
            durableAgent,
            new AbortController().signal,
            new Set(["probe"]),
            { provider: "agy-next", model: MODEL },
          ),
        /no open turn\/step boundary/,
      );
      assert.equal(bodyCalls, beforeNoOpenStep, "Tool body must not run when session has no open turn/step");

      // Pure in-memory SessionStore.flush without listeners resolves to false (safe no-op).
      assert.equal(await sessionStore.flush(durableSession), false, "pure in-memory flush must resolve to false");

      // Turn 1: Open turn=1, step=1 -> close step=1 -> open step=2 (verifies multi-step resolution),
      // record user message, run stream with one approved tool call.
      durableSession.append("turn/start", { turn: 1 });
      durableSession.append("step/start", { turn: 1, step: 1 });
      durableSession.append("step/end", { turn: 1, step: 1 });
      assert.equal(resolveOpenTurnStep(durableSession), undefined);
      durableSession.append("step/start", { turn: 1, step: 2 });
      assert.deepEqual(resolveOpenTurnStep(durableSession), { turn: 1, step: 2 });
      const userTurn1 = createUserMessage({
        content: [{ type: "text", text: "run probe" }],
        source: { kind: "user" },
      });
      durableSession.append("user/message", userTurn1, { surfaceOp: "append" });

      nextApprovalDecision = "allowed-once";
      const beforeTurn1 = bodyCalls;
      nextRuntimeOptions = {
        toolDecision: "allow",
        toolArgs: { mode: "turn1-ok" },
        promptText: transcriptText({ messages: durableSession.deriveMessages() }),
      };
      const turn1Chunks = [];
      for await (const chunk of adapter.stream({
        ...promptOptions,
        sessionId: durableAgent.id,
        messages: durableSession.deriveMessages(),
      })) {
        turn1Chunks.push(chunk);
      }
      assert.equal(bodyCalls, beforeTurn1 + 1, "Turn 1 tool body must execute exactly once");

      // Simulate agent-loop committing the final assistant response at end of step 2.
      durableSession.append(
        "assistant/message",
        {
          turn: 1,
          step: 2,
          message: {
            id: "asst-turn1-final",
            role: "assistant",
            content: [{ type: "text", text: "done" }],
            source: { kind: "model", provider: "agy-next", model: MODEL },
          },
          stream: [],
        },
        { surfaceOp: "append" },
      );
      durableSession.append("step/end", { turn: 1, step: 2 });
      durableSession.append("turn/end", { turn: 1, reason: { kind: "completed" } });

      // Verify durable events in Turn 1: assistant/message(tool-call), tool/call, approval/asked, approval/decided, tool/result.
      const turn1Events = durableSession.snapshotEvents();
      const toolCallEvent = turn1Events.find((e) => e.type === "tool/call");
      const toolResultEvent = turn1Events.find((e) => e.type === "tool/result");
      const askEvent = turn1Events.find((e) => e.type === "approval/asked");
      const decidedEvent = turn1Events.find((e) => e.type === "approval/decided");
      assert.ok(toolCallEvent, "tool/call must be durably recorded in DSH Session");
      assert.ok(toolResultEvent, "tool/result must be durably recorded in DSH Session");
      assert.ok(askEvent && decidedEvent && decidedEvent.data.outcome === "allowed-once", "Approval audit pair must be durably recorded");
      assert.deepEqual(toolResultEvent.sourceEventSeqs, [toolCallEvent.seq], "tool/result must cite tool/call seq in sourceEventSeqs");
      assert.equal(toolResultEvent.data.message.isError, false);

      // Verify surface fold and paired assistant(tool-call) -> tool(tool-result) messages (no orphan tool-result).
      const foldedTurn1 = foldSurface(turn1Events);
      assert.ok(foldedTurn1.nodes.length >= 4);
      const derivedTurn1 = durableSession.deriveMessages();
      const asstToolCallIndex = derivedTurn1.findIndex((m) => m.role === "assistant" && m.content.some((b) => b.type === "tool-call"));
      const toolMsgIndex = derivedTurn1.findIndex((m) => m.role === "tool");
      assert.ok(asstToolCallIndex >= 0 && toolMsgIndex === asstToolCallIndex + 1, "assistant(tool-call) must immediately precede tool(tool-result)");
      assert.equal(derivedTurn1[asstToolCallIndex].content[0].id, derivedTurn1[toolMsgIndex].toolCallId);

      // Reload verification: cold-restore a brand new Session instance via Session.fromRestore.
      const restoredSession = Session.fromRestore(
        durableSession.id,
        structuredClone(durableSession.snapshotEvents()),
        structuredClone(durableSession.header),
        durableSession.inheritedEventCount,
        "detached",
      );
      const restoredDerived = restoredSession.deriveMessages();
      assert.equal(restoredDerived.length, derivedTurn1.length, "Restored session must preserve all derived messages");

      // Turn 2 on the restored session: verify cross-turn context includes Turn 1 tool-call and tool-result,
      // and verify Turn 1 tool body is NOT re-executed.
      restoredSession.append("turn/start", { turn: 2 });
      restoredSession.append("step/start", { turn: 2, step: 1 });
      restoredSession.append(
        "user/message",
        createUserMessage({
          content: [{ type: "text", text: "summarize previous probe result" }],
          source: { kind: "user" },
        }),
        { surfaceOp: "append" },
      );
      durableAgent.session = restoredSession;
      const turn2Messages = restoredSession.deriveMessages();
      const turn2Transcript = transcriptText({ messages: turn2Messages });
      assert.match(turn2Transcript, /\[tool-call id=.* name=probe\]/);
      assert.match(turn2Transcript, /\{"mode":"turn1-ok"\}/);
      assert.match(turn2Transcript, /\[tool id=.* status=ok\]\napproved/);

      nextRuntimeOptions = {
        toolDecision: "allow",
        skipMcpCall: true,
        promptText: turn2Transcript,
      };
      for await (const _chunk of adapter.stream({
        ...promptOptions,
        sessionId: durableAgent.id,
        messages: turn2Messages,
      })) {}
      assert.equal(bodyCalls, beforeTurn1 + 1, "Turn 2 must not re-execute Turn 1 tool body");
      restoredSession.append("step/end", { turn: 2, step: 1 });
      restoredSession.append("turn/end", { turn: 2, reason: { kind: "completed" } });

      // Turn 3: Multiple sequential tool calls in one turn + reject / cancel / tool error recording.
      restoredSession.append("turn/start", { turn: 3 });
      restoredSession.append("step/start", { turn: 3, step: 1 });
      restoredSession.append(
        "user/message",
        createUserMessage({ content: [{ type: "text", text: "multi calls" }], source: { kind: "user" } }),
        { surfaceOp: "append" },
      );

      // 3a. Two sequential allowed calls in one turn must record distinct callIds without confusion.
      nextApprovalDecision = "allowed-once";
      const beforeMulti = bodyCalls;
      nextRuntimeOptions = {
        toolDecision: "allow",
        promptText: null,
        multiCalls: [
          { name: "dsh_probe", arguments: { mode: "multi-1" } },
          { name: "dsh_probe", arguments: { mode: "multi-2" } },
        ],
      };
      for await (const _chunk of adapter.stream({
        ...promptOptions,
        sessionId: durableAgent.id,
        messages: restoredSession.deriveMessages(),
      })) {}
      assert.equal(bodyCalls, beforeMulti + 2, "Two tool calls in one turn must each execute once");
      const turn3Calls = restoredSession.snapshotEvents().filter((e) => e.type === "tool/call" && e.data.turn === 3);
      const turn3Results = restoredSession.snapshotEvents().filter((e) => e.type === "tool/result" && e.data.turn === 3);
      assert.equal(turn3Calls.length, 2);
      assert.equal(turn3Results.length, 2);
      assert.notEqual(turn3Calls[0].data.callId, turn3Calls[1].data.callId, "Multiple calls in one turn must have distinct callIds");
      assert.deepEqual(turn3Results[0].sourceEventSeqs, [turn3Calls[0].seq]);
      assert.deepEqual(turn3Results[1].sourceEventSeqs, [turn3Calls[1].seq]);

      // 3b. Rejected, cancelled, and throwing tool calls must record isError: true and never replay as success.
      nextApprovalDecision = "rejected";
      nextRuntimeOptions = { toolDecision: "deny", promptText: null, toolArgs: { mode: "turn3-reject" } };
      for await (const _chunk of adapter.stream({
        ...promptOptions,
        sessionId: durableAgent.id,
        messages: restoredSession.deriveMessages(),
      })) {}
      const rejectResult = restoredSession.snapshotEvents().findLast((e) => e.type === "tool/result");
      assert.equal(rejectResult.data.message.isError, true);
      assert.match(rejectResult.data.message.content[0].text, /rejected/i);

      nextApprovalDecision = "allowed-once";
      nextRuntimeOptions = { toolDecision: "deny", promptText: null, toolArgs: { mode: "throw-error" } };
      for await (const _chunk of adapter.stream({
        ...promptOptions,
        sessionId: durableAgent.id,
        messages: restoredSession.deriveMessages(),
      })) {}
      const throwResult = restoredSession.snapshotEvents().findLast((e) => e.type === "tool/result");
      assert.equal(throwResult.data.message.isError, true);
      assert.match(throwResult.data.message.content[0].text, /probe body intentional error/);
      assert.match(transcriptText({ messages: restoredSession.deriveMessages() }), /status=error\]\nError: probe body intentional error/);

      // 3c. Fail-closed when pre-execution session.append OR asynchronous session/flush fails:
      // First test asynchronous session/flush failure on the live SessionStore-registered durableSession.
      durableSession.append("turn/start", { turn: 2 });
      durableSession.append("step/start", { turn: 2, step: 1 });
      const beforeFlushFail = bodyCalls;
      const disposeFailingFlush = root.on("session/flush", async (subj) => {
        if (subj === durableSession) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error("simulated async session/flush backend failure");
        }
      });
      const prevSession = durableAgent.session;
      durableAgent.session = durableSession;
      try {
        await assert.rejects(
          () =>
            adapter.executeTool(
              { id: "flush-fail-call", name: "probe", arguments: { mode: "should-not-run-on-flush-fail" }, signal: new AbortController().signal },
              durableAgent,
              new AbortController().signal,
              new Set(["probe"]),
              { provider: "agy-next", model: MODEL },
            ),
          /simulated async session\/flush backend failure/,
        );
        assert.equal(bodyCalls, beforeFlushFail, "Tool body must not execute if pre-execution session/flush fails");
      } finally {
        durableAgent.session = prevSession;
        disposeFailingFlush();
      }

      // Next test synchronous session.append failure before tool execution: body must not run.
      const beforeAppendFail = bodyCalls;
      const origAppend = restoredSession.append.bind(restoredSession);
      restoredSession.append = () => {
        throw new Error("simulated disk/log append failure");
      };
      try {
        await assert.rejects(
          () =>
            adapter.executeTool(
              { id: "append-fail-call", name: "probe", arguments: { mode: "should-not-run" }, signal: new AbortController().signal },
              durableAgent,
              new AbortController().signal,
              new Set(["probe"]),
              { provider: "agy-next", model: MODEL },
            ),
          /simulated disk\/log append failure/,
        );
        assert.equal(bodyCalls, beforeAppendFail, "Tool body must not execute if pre-execution session.append fails");
      } finally {
        restoredSession.append = origAppend;
      }

      // 3d. Crash recovery: if interrupted after assistant/message(tool-call) + tool/call but before tool/result,
      // interruptedTurnClosers synthesizes TOOL_OUTCOME_UNKNOWN error result without re-running the tool body.
      const crashCallId = ToolCallId("crash-mid-call");
      restoredSession.append(
        "assistant/message",
        {
          turn: 3,
          step: 1,
          message: {
            id: "asst-crash-call",
            role: "assistant",
            content: [{ type: "tool-call", id: crashCallId, name: "probe", arguments: '{"mode":"crash"}' }],
            source: { kind: "model", provider: "agy-next", model: MODEL },
          },
          stream: [],
        },
        { surfaceOp: "append" },
      );
      const crashCallSeq = restoredSession.append("tool/call", {
        turn: 3,
        step: 1,
        callId: crashCallId,
        name: "probe",
        arguments: '{"mode":"crash"}',
      }).seq;
      const closers = interruptedTurnClosers(restoredSession.snapshotEvents());
      const syntheticResult = closers.find((e) => e.type === "tool/result");
      assert.ok(syntheticResult, "interruptedTurnClosers must synthesize a recovery tool/result");
      assert.equal(syntheticResult.data.error.code, "TOOL_OUTCOME_UNKNOWN");
      assert.equal(syntheticResult.data.message.isError, true);
      assert.deepEqual(syntheticResult.sourceEventSeqs, [crashCallSeq]);
    } finally {
      liveAgents.delete(durableAgent.id);
      disposeApprovalAnswerer();
      await durableScope.dispose();
    }
  }

  console.log("acp roundtrip DSH integration: ok (approved, rejected, approval-cancelled, no-agent, turn-cancelled, p0-permission-fail-closed, p1-durable-session-multiturn-reload)");
} finally {
  disposeAskPolicy();
  disposeTool();
  await disposeApproval();
  await scopeHandle.dispose();
  restoreRuntime();
  for (const runtime of runtimes) await runtime.close();
}

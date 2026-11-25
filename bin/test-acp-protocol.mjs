#!/usr/bin/env node
/** Offline checks for the official ACP client. Does not start agy or read tokens. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PassThrough } from "node:stream";

import { AcpConnection, AcpError, DshTextMapper, modelsFromSession, pickAuthMethod, PREFERRED_AUTH_METHOD, sessionConfigParams } from "../lib/acp/connection.js";
import { redact, resolveAcpLaunch } from "../lib/acp/runtime.js";
import { promptAcp, setAcpRuntimeFactoryForTests, transcriptText } from "../lib/acp/service.js";

const picked = pickAuthMethod([
  { id: "gemini-api-key", name: "Gemini API key" },
  { id: "oauth-business", name: "Log in with Gemini Enterprise" },
  { id: PREFERRED_AUTH_METHOD, name: "Log in with Google" },
]);
assert.equal(picked.id, "oauth-personal");
assert.equal(redact('AGY_NEXT_MCP_BRIDGE_TOKEN=secret-value'), 'AGY_NEXT_MCP_BRIDGE_TOKEN=[redacted]');
assert.equal(redact('Authorization: Bearer secret-value'), 'Authorization: Bearer [redacted]');

const discovered = modelsFromSession({
  sessionId: "s",
  configOptions: [
    {
      type: "select",
      id: "model",
      category: "model",
      currentValue: "gemini-4-neon",
      options: [
        { value: "gemini-4-neon", name: "Gemini 4 Neon" },
        { value: "gemini-4-argon", name: "Gemini 4 Argon" },
      ],
    },
    {
      type: "select",
      id: "thought_level",
      category: "thought_level",
      currentValue: "high",
      options: [
        { value: "low", name: "Low" },
        { value: "medium", name: "Medium" },
        { value: "high", name: "High" },
      ],
    },
  ],
});
assert.equal(discovered.currentModelId, "gemini-4-neon");
assert.deepEqual(discovered.models.map((model) => model.id), ["gemini-4-neon", "gemini-4-argon"]);
assert.equal(discovered.modelSelectorId, "model");
assert.equal(discovered.currentThoughtLevel, "high");
assert.equal(discovered.thoughtLevelSelectorId, "thought_level");
assert.deepEqual(discovered.thoughtLevels.map((level) => level.id), ["low", "medium", "high"]);
const cwd = process.cwd();
const shim = fileURLToPath(new URL("./acp-mcp-stdio.mjs", import.meta.url));
assert.ok(path.isAbsolute(cwd));
assert.ok(path.isAbsolute(shim));
assert.equal(existsSync(shim), true);
assert.deepEqual(sessionConfigParams(cwd, []), { cwd, mcpServers: [] });
const stdioServer = {
  name: "dsh-tools",
  command: process.execPath,
  args: [shim],
  env: [{ name: "AGY_NEXT_MCP_BRIDGE_URL", value: "http://127.0.0.1:4321/mcp" }, { name: "AGY_NEXT_MCP_BRIDGE_TOKEN", value: "x".repeat(64) }],
};
assert.equal(sessionConfigParams(cwd, [stdioServer]).mcpServers[0].command, process.execPath);
assert.throws(() => sessionConfigParams("relative", []), /absolute working directory/);
assert.throws(() => sessionConfigParams(cwd, [{ type: "http", name: "bad", url: "http://127.0.0.1/mcp" }]), /requires url and headers/);

{
  const stdout = new PassThrough();
  const writes = [];
  const runtime = {
    stdout,
    stderrTail: "",
    exited: new Promise(() => {}),
    write: (frame) => writes.push(JSON.parse(frame)),
    close: async () => {},
  };
  const connection = new AcpConnection(runtime);
  const controller = new AbortController();
  const started = Date.now();
  const prompt = connection.prompt("session-1", "test", 30_000, controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 5));
  controller.abort(new Error("cancel"));
  let rejected;
  try {
    await prompt;
  } catch (error) {
    rejected = error;
  }
  assert.ok(rejected instanceof AcpError && rejected.phase === "aborted");
  assert.ok(writes.some((frame) => frame.method === "session/prompt"));
  assert.ok(writes.some((frame) => frame.method === "session/cancel"));
  assert.equal(connection.pending.size, 0, "prompt abort must immediately clear connection.pending");
  assert.ok(Date.now() - started < 5_000, "cancellation must not wait for the prompt timeout");
}

// Prompt timeout WITHOUT external signal must also notify session/cancel and clear connection.pending.
{
  const stdout = new PassThrough();
  const writes = [];
  const runtime = {
    stdout,
    stderrTail: "",
    exited: new Promise(() => {}),
    write: (frame) => writes.push(JSON.parse(frame)),
    close: async () => {},
  };
  const connection = new AcpConnection(runtime);
  let rejected;
  try {
    await connection.prompt("session-timeout-no-signal", "test", 25);
  } catch (error) {
    rejected = error;
  }
  assert.ok(rejected instanceof AcpError && rejected.phase === "timeout");
  assert.ok(writes.some((frame) => frame.method === "session/cancel" && frame.params?.sessionId === "session-timeout-no-signal"), "timeout without signal must send session/cancel");
  assert.equal(connection.pending.size, 0, "prompt timeout must immediately clear connection.pending");
}

const legacy = modelsFromSession({
  models: { currentModelId: "gemini-4-neon", availableModels: [{ modelId: "gemini-4-neon", name: "Gemini 4 Neon" }] },
});
assert.equal(legacy.models[0].id, "gemini-4-neon");

const mapper = new DshTextMapper();
const chunks = mapper.push({
  update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "pong" } },
});
assert.equal(chunks[0].type, "block-start");
assert.equal(chunks[1].type, "text-delta");
assert.equal(chunks[1].text, "pong");
assert.deepEqual(mapper.push({ sessionId: "s", update: { sessionUpdate: "tool_call", toolCallId: "c1", title: "Calling probe", name: "dsh_probe" } }), []);
assert.deepEqual(mapper.push({ sessionId: "s", update: { sessionUpdate: "tool_call_update", toolCallId: "c1", status: "completed" } }), []);
const finish = mapper.finish("end_turn", { provider: "agy-next", model: "gemini-4-neon" });
assert.equal(finish.at(-1).type, "finish");
assert.equal(finish.at(-1).reason.kind, "stop");

assert.equal(transcriptText({ system: "Be brief.", messages: [{ role: "user", content: "ping" }] }), "Be brief.\n\n[user]\nping");
assert.equal(
  transcriptText({
    messages: [
      { role: "assistant", content: [{ type: "text", text: "Working" }] },
      { role: "tool", toolCallId: "call-1", isError: false, content: [{ type: "text", text: "42" }] },
      { role: "user", content: "Explain" },
    ],
  }),
  "[assistant]\nWorking\n\n[tool id=call-1 status=ok]\n42\n\n[user]\nExplain",
);
assert.equal(
  transcriptText({
    messages: [
      {
        role: "assistant",
        content: [{ type: "tool-call", id: "call-2", name: "probe", arguments: '{"x":1}' }],
      },
      {
        role: "tool",
        toolCallId: "call-2",
        isError: true,
        content: [{ type: "text", text: "Error: denied" }],
      },
    ],
  }),
  '[assistant]\n[tool-call id=call-2 name=probe]\n{"x":1}\n\n[tool id=call-2 status=error]\nError: denied',
);

// Pre-prompt stage cancellation & cleanup tests (initialize, session/new, setModel, late replies).
for (const hangStage of ["initialize", "session/new", "session/set_config_option"]) {
  let runtimeClosed = false;
  const stdout = new PassThrough();
  const runtime = {
    stdout,
    stderrTail: "",
    exited: new Promise(() => {}),
    write(frame) {
      const msg = JSON.parse(frame);
      if (msg.method === hangStage) return; // Simulate unresponsive server at this stage
      if (msg.method === "initialize") {
        stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: 1, authMethods: [] } })}\n`);
      } else if (msg.method === "session/new") {
        stdout.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: {
              sessionId: "s-cancel",
              configOptions: [
                {
                  type: "select",
                  id: "model",
                  category: "model",
                  currentValue: "gemini-4-neon",
                  options: [{ value: "gemini-4-neon" }, { value: "gemini-4-argon" }],
                },
              ],
            },
          })}\n`,
        );
      }
    },
    async close() {
      runtimeClosed = true;
    },
  };
  const restore = setAcpRuntimeFactoryForTests(() => runtime);
  try {
    const controller = new AbortController();
    const started = Date.now();
    const pending = promptAcp({
      model: "gemini-4-argon",
      text: "hello",
      cwd,
      signal: controller.signal,
      initTimeoutMs: 30_000,
      sessionTimeoutMs: 30_000,
    });
    await new Promise((resolve) => setTimeout(resolve, 15));
    controller.abort(new Error(`abort during ${hangStage}`));
    await assert.rejects(
      pending,
      (err) => err instanceof AcpError && err.phase === "aborted",
      `must abort promptly during ${hangStage}`,
    );
    assert.ok(Date.now() - started < 2_000, `${hangStage} cancellation must not wait for 30s timeout`);
    assert.equal(runtimeClosed, true, `runtime must be closed after abort during ${hangStage}`);
  } finally {
    restore();
  }
}

let launch;
try {
  launch = resolveAcpLaunch();
} catch (error) {
  console.log(`launch skipped: ${error.message}`);
}
if (launch) {
  assert.ok(launch.source === "agy-acp" || launch.source === "agy-user-install" || launch.source === "agy_acp_server" || launch.source === "agy-managed");
  assert.ok(Array.isArray(launch.args));
  console.log(`launch source: ${launch.source}`);
}

import { register } from "node:module";
import { pathToFileURL } from "node:url";

if (!process.env.AGY_PEER_ROOT) {
  process.env.AGY_PEER_ROOT = fileURLToPath(new URL("../peer-rc5/node_modules", import.meta.url));
}
if (existsSync(process.env.AGY_PEER_ROOT)) {
  register("./peer-resolve.mjs", import.meta.url);
  const { AntigravityAcpAdapter, resolveOpenTurnStep, selectSafeAllowOnceOption } = await import("../lib/acp/adapter.js");
  const { Context } = await import("@deepseek-ai/cordis");
  const { SystemPrompt } = await import("@deepseek-ai/dsh-system-prompt");
  const { createScope } = await import("@deepseek-ai/dsh-scope");
  const { Session, SessionStore, foldSurface, interruptedTurnClosers } = await import("@deepseek-ai/dsh-session");
  const { ApprovalService } = await import("@deepseek-ai/dsh-user-approval");
  const { default: ToolRuntime, defineTool } = await import("@deepseek-ai/dsh-tools");
  const { createUserMessage, ToolCallId } = await import("@deepseek-ai/dsh-llm");
  const { AcpMcpBridge } = await import("../lib/acp/mcp-bridge.js");

  // 0. bridge.start(signal) abort during startup cleans up immediately.
  {
    const abortDuringBind = new AbortController();
    const bridge = new AcpMcpBridge({
      tools: [{ name: "t", description: "t", parameters: { type: "object", properties: {} } }],
      onCall: async () => ({ isError: false, content: [] }),
    });
    const starting = bridge.start(abortDuringBind.signal);
    abortDuringBind.abort(new Error("cancel bridge bind"));
    await assert.rejects(starting, /ACP MCP bridge startup aborted/);
    assert.equal(bridge.closed, true, "bridge aborted during start() must close itself");
  }

  // 1. P0 selectSafeAllowOnceOption unit checks (no allow_always fallback).
  assert.equal(selectSafeAllowOnceOption([{ optionId: "a", kind: "allow_always" }]), undefined);
  assert.equal(selectSafeAllowOnceOption([{ optionId: "o", kind: "allow_once" }, { optionId: "a", kind: "allow_always" }]), "o");
  assert.equal(selectSafeAllowOnceOption(null), undefined);

  // 2. P0 adapter permission fail-closed checks (in-process FakeRuntime, no loopback socket needed):
  // - Undeclared tool -> cancelled
  // - Spoofed declared tool name without MCP bridge call -> cancelled
  // - Permission with only toolCallId -> cancelled
  // - Only allow_always option -> cancelled
  // - Turn already cancelled -> cancelled
  const root = new Context();
  new SystemPrompt(root, {});
  new SessionStore(root);
  const session = root.sessions.create("offline-agent-1", {
    meta: { cwd },
  });
  const agent = { id: session.id, session };
  const scope = createScope(root, agent);
  agent.ctx = scope.ctx;
  const tools = new ToolRuntime(agent.ctx);
  new ApprovalService(agent.ctx, { policy: "ask" });
  let approvalDecision = "allowed-once";
  const disposeApprovalListener = agent.ctx.on("approval/request", () => Promise.resolve(approvalDecision));
  let bodyExecutions = 0;
  let flushedEventCountAtBodyStart = 0;
  let diskLineCountAtBodyStart = 0;
  let flushedEventsStore = [];
  let pendingBuffer = [];
  let failNextFlush = false;
  let flushCalls = 0;
  const isolatedVerifyDir = process.env.AGY_ISOLATED_VERIFY_DIR
    ? path.resolve(process.env.AGY_ISOLATED_VERIFY_DIR)
    : fileURLToPath(new URL("../_isolated-verify", import.meta.url));
  const diskFlushFile = path.join(isolatedVerifyDir, "session-flush-test.jsonl");
  const canWriteDiskFlush = existsSync(isolatedVerifyDir);

  const disposeTool = tools.register(
    defineTool({
      name: "probe",
      description: "Offline probe",
      parameters: { mode: { type: "string", description: "mode", required: true } },
      output: {
        schema: { type: "object", properties: { ok: { type: "boolean", required: true } }, additionalProperties: false },
        render: (_a, v) => [{ type: "text", text: v.ok ? "probe-ok" : "probe-fail" }],
      },
      async execute(args) {
        bodyExecutions++;
        flushedEventCountAtBodyStart = flushedEventsStore.length;
        if (existsSync(diskFlushFile)) {
          const raw = await readFile(diskFlushFile, "utf8");
          diskLineCountAtBodyStart = raw.trim().split("\n").filter(Boolean).length;
        }
        if (args.mode === "throw") throw new Error("offline tool body error");
        return { ok: true };
      },
    }),
  );
  const disposeAsk = agent.ctx.on("tools/pre-execute", (exec, next) =>
    exec.name === "probe" ? Promise.resolve({ kind: "ask", reason: "offline test" }) : next(),
  );
  const liveAgents = new Map([[agent.id, agent]]);
  const adapter = new AntigravityAcpAdapter({
    agents: { get: (id) => liveAgents.get(id), currentInitiator: () => agent },
    tools,
  });

  try {
    for (const permScenario of [
      { label: "undeclared", toolCall: { toolCallId: "c1", name: "dsh_undeclared" }, options: [{ optionId: "o1", kind: "allow_once" }] },
      { label: "spoofed-declared", toolCall: { toolCallId: "c2", name: "dsh_probe" }, options: [{ optionId: "o1", kind: "allow_once" }], announceFirst: true },
      { label: "id-only", toolCall: { toolCallId: "c3" }, options: [{ optionId: "o1", kind: "allow_once" }] },
      { label: "only-allow-always", toolCall: { toolCallId: "c4", name: "dsh_probe" }, options: [{ optionId: "a1", kind: "allow_always" }] },
    ]) {
      let permissionOutcome;
      const permStdout = new PassThrough();
      const permRuntime = {
        stdout: permStdout,
        stderrTail: "",
        exited: new Promise(() => {}),
        write(frame) {
          const msg = JSON.parse(frame);
          if (msg.method === "initialize") {
            permStdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: 1, authMethods: [] } })}\n`);
          } else if (msg.method === "session/new") {
            permStdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { sessionId: "s-perm", configOptions: [{ type: "select", id: "model", category: "model", currentValue: "gemini-4-neon", options: [{ value: "gemini-4-neon" }] }] } })}\n`);
          } else if (msg.method === "session/prompt") {
            if (permScenario.announceFirst) {
              permStdout.write(`${JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "s-perm", update: { sessionUpdate: "tool_call", toolCallId: permScenario.toolCall.toolCallId, name: permScenario.toolCall.name } } })}\n`);
            }
            permStdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: 777, method: "session/request_permission", params: { sessionId: "s-perm", toolCall: permScenario.toolCall, options: permScenario.options } })}\n`);
          } else if (msg.id === 777) {
            permissionOutcome = msg.result;
            permStdout.write(`${JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { sessionId: "s-perm", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "ok" } } } })}\n`);
            permStdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: 3, result: { stopReason: "end_turn" } })}\n`);
          }
        },
        async close() {},
      };
      const restore = setAcpRuntimeFactoryForTests(() => permRuntime);
      try {
        // Pass tools: [] so startToolBridge does not bind a socket, while testing adapter's onPermission handler directly.
        for await (const _chunk of adapter.stream({
          provider: "agy-next",
          model: "gemini-4-neon",
          sessionId: agent.id,
          cwd,
          messages: [{ role: "user", content: `test ${permScenario.label}` }],
          tools: [],
        })) {}
        assert.deepEqual(permissionOutcome, { outcome: { outcome: "cancelled" } }, `P0 scenario ${permScenario.label} must fail closed`);
        assert.equal(bodyExecutions, 0, `P0 scenario ${permScenario.label} must never execute tool body`);
      } finally {
        restore();
      }
    }

    // 3. P1 Durable Session contract checks via adapter.executeTool (no socket required):
    // Fail-closed when no open turn/step exists:
    assert.equal(resolveOpenTurnStep(session), undefined);
    await assert.rejects(
      () =>
        adapter.executeTool(
          { id: "call-no-step", name: "probe", arguments: { mode: "ok" }, signal: new AbortController().signal },
          agent,
          new AbortController().signal,
          new Set(["probe"]),
          { provider: "agy-next", model: "gemini-4-neon" },
        ),
      /no open turn\/step boundary/,
    );
    assert.equal(bodyExecutions, 0);

    // Open Turn 1, Step 1:
    session.append("turn/start", { turn: 1 });
    session.append("step/start", { turn: 1, step: 1 });
    session.append("user/message", createUserMessage({ content: [{ type: "text", text: "turn 1" }], source: { kind: "user" } }), { surfaceOp: "append" });
    assert.deepEqual(resolveOpenTurnStep(session), { turn: 1, step: 1 });

    // Multi-step within the same turn: turn/start(1) -> step/start(1,1) -> step/end(1,1) -> step/start(1,2)
    // must resolve to { turn: 1, step: 2 }, and return undefined after step/end(1,2).
    session.append("step/end", { turn: 1, step: 1 });
    assert.equal(resolveOpenTurnStep(session), undefined, "after step/end(1,1) with no step 2 yet, no step is open");
    session.append("step/start", { turn: 1, step: 2 });
    assert.deepEqual(resolveOpenTurnStep(session), { turn: 1, step: 2 }, "second step in same turn must resolve to { turn: 1, step: 2 }");

    // In-memory mode (no session/flush listener registered yet): root.sessions.flush(session) returns false (safe no-op).
    assert.equal(await root.sessions.flush(session), false, "in-memory SessionStore.flush without listeners must resolve to false");

    // Allowed execution in Step 2 (in-memory safe no-op flush):
    approvalDecision = "allowed-once";
    const okRes = await adapter.executeTool(
      { id: "call-1", name: "probe", arguments: { mode: "ok" }, signal: new AbortController().signal },
      agent,
      new AbortController().signal,
      new Set(["probe"]),
      { provider: "agy-next", model: "gemini-4-neon" },
    );
    assert.equal(okRes.isError, false);
    assert.equal(bodyExecutions, 1);
    const call1Event = session.snapshotEvents().find((e) => e.type === "tool/call" && e.data.callId === "call-1");
    assert.deepEqual({ turn: call1Event.data.turn, step: call1Event.data.step }, { turn: 1, step: 2 });

    // Now mount an asynchronous disk-backed persistence listener on session/event + session/flush:
    // Verifies that tool/call is flushed to disk BEFORE tool body executes, that an async flush failure
    // fails closed without running the tool body, and that Session.fromRestore reconstructs the session
    // from the JSONL file on disk. (Writes to `_isolated-verify` only when that directory already exists
    // or AGY_ISOLATED_VERIFY_DIR is specified, so running inside an extracted tarball never creates a new
    // `_isolated-verify` folder inside the extracted package tree.)
    if (canWriteDiskFlush) {
      await mkdir(isolatedVerifyDir, { recursive: true });
    }
    pendingBuffer = [...session.snapshotEvents()];
    const disposeEventBuffer = root.on("session/event", (subj, ev) => {
      if (subj === session) pendingBuffer.push(ev);
    });
    const writeFlushFile = async () => {
      if (!canWriteDiskFlush) return;
      const headerRecord = JSON.stringify({
        kind: "header",
        header: session.header,
        inheritedEventCount: session.inheritedEventCount,
      });
      const eventLines = flushedEventsStore.map((ev) => JSON.stringify({ kind: "event", event: ev }));
      await writeFile(diskFlushFile, `${[headerRecord, ...eventLines].join("\n")}\n`, "utf8");
    };
    const disposeFlushListener = root.on("session/flush", async (subj) => {
      if (subj !== session) return;
      flushCalls++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (failNextFlush) {
        throw new Error("async persistence flush failed");
      }
      flushedEventsStore.push(...pendingBuffer.splice(0, pendingBuffer.length));
      await writeFlushFile();
    });

    try {
      // Async flush succeeds: before probe body runs, assistant/message(tool-call) and tool/call are already flushed to disk!
      const beforeFlushedCall = flushedEventsStore.length;
      diskLineCountAtBodyStart = 0;
      const okFlushedRes = await adapter.executeTool(
        { id: "call-flushed", name: "probe", arguments: { mode: "ok-flushed" }, signal: new AbortController().signal },
        agent,
        new AbortController().signal,
        new Set(["probe"]),
        { provider: "agy-next", model: "gemini-4-neon" },
      );
      assert.equal(okFlushedRes.isError, false);
      assert.equal(bodyExecutions, 2);
      assert.ok(flushedEventCountAtBodyStart > beforeFlushedCall, "pre-execution flush must commit tool/call before tool body starts");
      if (canWriteDiskFlush) {
        assert.equal(diskLineCountAtBodyStart, 1 + flushedEventCountAtBodyStart, "disk JSONL file must already contain header + flushed pre-execution events while tool body is running");
      }
      assert.ok(
        flushedEventsStore.slice(0, flushedEventCountAtBodyStart).some((e) => e.type === "tool/call" && e.data.callId === "call-flushed"),
        "tool/call must be present in flushed storage when tool body begins executing",
      );
      assert.ok(
        flushedEventsStore.some((e) => e.type === "tool/result" && e.data.message.toolCallId === "call-flushed"),
        "tool/result must be present in flushed storage after executeTool returns",
      );

      // Async flush fails before tool execution: executeTool must fail closed and NOT execute tool body.
      // Because session.append() already added the in-memory candidate events before flush() threw,
      // we test the flush failure on a separate live session so the primary session log stays clean for disk reload.
      const failFlushSession = root.sessions.create("offline-flush-fail-agent", { meta: { cwd } });
      failFlushSession.append("turn/start", { turn: 1 });
      failFlushSession.append("step/start", { turn: 1, step: 1 });
      const failFlushAgent = { id: failFlushSession.id, session: failFlushSession, ctx: agent.ctx };
      liveAgents.set(failFlushAgent.id, failFlushAgent);
      const disposeFailFlush = root.on("session/flush", async (subj) => {
        if (subj === failFlushSession) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error("async persistence flush failed");
        }
      });
      const beforeFlushFailBody = bodyExecutions;
      try {
        await assert.rejects(
          () =>
            adapter.executeTool(
              { id: "call-flush-fail", name: "probe", arguments: { mode: "must-not-run" }, signal: new AbortController().signal },
              failFlushAgent,
              new AbortController().signal,
              new Set(["probe"]),
              { provider: "agy-next", model: "gemini-4-neon" },
            ),
          /async persistence flush failed/,
        );
        assert.equal(bodyExecutions, beforeFlushFailBody, "Tool body must NOT execute when pre-execution session/flush fails");
      } finally {
        disposeFailFlush();
        liveAgents.delete(failFlushAgent.id);
      }

      // Rejected execution:
      approvalDecision = "rejected";
      const beforeRejectBody = bodyExecutions;
      const rejRes = await adapter.executeTool(
        { id: "call-2", name: "probe", arguments: { mode: "rej" }, signal: new AbortController().signal },
        agent,
        new AbortController().signal,
        new Set(["probe"]),
        { provider: "agy-next", model: "gemini-4-neon" },
      );
      assert.equal(rejRes.isError, true);
      assert.equal(bodyExecutions, beforeRejectBody, "rejected call must not run tool body");

      // Cancelled approval execution:
      approvalDecision = "cancelled";
      const canRes = await adapter.executeTool(
        { id: "call-3", name: "probe", arguments: { mode: "can" }, signal: new AbortController().signal },
        agent,
        new AbortController().signal,
        new Set(["probe"]),
        { provider: "agy-next", model: "gemini-4-neon" },
      );
      assert.equal(canRes.isError, true);
      assert.equal(bodyExecutions, beforeRejectBody, "cancelled call must not run tool body");

      // Tool error execution:
      approvalDecision = "allowed-once";
      const errRes = await adapter.executeTool(
        { id: "call-4", name: "probe", arguments: { mode: "throw" }, signal: new AbortController().signal },
        agent,
        new AbortController().signal,
        new Set(["probe"]),
        { provider: "agy-next", model: "gemini-4-neon" },
      );
      assert.equal(errRes.isError, true);
      assert.equal(bodyExecutions, beforeRejectBody + 1, "throwing tool ran once and recorded error");

      session.append("step/end", { turn: 1, step: 2 });
      session.append("turn/end", { turn: 1, reason: { kind: "completed" } });
      await root.sessions.flush(session);
    } finally {
      disposeFlushListener();
      disposeEventBuffer();
    }

    // Read back from disk file `_isolated-verify/session-flush-test.jsonl` (kept on disk, not auto-deleted)
    // and reconstruct a brand-new Session via Session.fromRestore.
    let restoredFromDisk;
    if (canWriteDiskFlush) {
      const rawJsonl = await readFile(diskFlushFile, "utf8");
      const parsedRecords = rawJsonl
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      const diskHeaderRecord = parsedRecords.find((record) => record.kind === "header");
      const diskEvents = parsedRecords.filter((record) => record.kind === "event").map((record) => record.event);
      assert.ok(diskHeaderRecord, "disk JSONL must contain header record");
      assert.equal(diskEvents.length, session.snapshotEvents().length, "disk JSONL event count must match live session event count");
      const folded = foldSurface(diskEvents);
      assert.ok(folded.nodes.length >= 11);
      restoredFromDisk = Session.fromRestore(
        diskHeaderRecord.header.id,
        diskEvents,
        diskHeaderRecord.header,
        diskHeaderRecord.inheritedEventCount,
        "detached",
      );
    } else {
      const memEvents = structuredClone(session.snapshotEvents());
      const folded = foldSurface(memEvents);
      assert.ok(folded.nodes.length >= 11);
      restoredFromDisk = Session.fromRestore(
        session.id,
        memEvents,
        structuredClone(session.header),
        session.inheritedEventCount,
        "detached",
      );
    }
    const restoredMessages = restoredFromDisk.deriveMessages();
    assert.equal(restoredMessages.length, session.deriveMessages().length, "Session.fromRestore from disk JSONL must derive identical message history");
    const t2Text = transcriptText({ messages: restoredMessages });
    assert.match(t2Text, /\[tool-call id=call-1 name=probe\]/);
    assert.match(t2Text, /\[tool id=call-1 status=ok\]\nprobe-ok/);
    assert.match(t2Text, /\[tool-call id=call-flushed name=probe\]/);
    assert.match(t2Text, /\[tool id=call-flushed status=ok\]\nprobe-ok/);
    assert.match(t2Text, /\[tool id=call-2 status=error\]\nError: the user rejected tool "probe"/);
    assert.match(t2Text, /\[tool id=call-3 status=error\]\nError: approval for tool "probe" was cancelled/);
    assert.match(t2Text, /\[tool id=call-4 status=error\]\nError: offline tool body error/);
  } finally {
    disposeAsk();
    disposeTool();
    disposeApprovalListener();
    await scope.dispose();
  }
}

console.log("acp protocol offline: ok");

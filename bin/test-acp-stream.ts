/**
 * One-shot check of the official ACP route.
 *
 *   node bin/test-acp-stream.ts
 *   node bin/test-acp-stream.ts --models-only
 *   node bin/test-acp-stream.ts --prompt "Reply with the single word pong."
 *
 * Login is the server's own Google OAuth. This script does not read
 * ~/.gemini/antigravity-acp/ and does not print token files.
 */

import os from "node:os";
import path from "node:path";

import {
  AcpConnection,
  DshTextMapper,
  pickAuthMethod,
} from "../src/acp/connection.ts";
import {
  AcpRuntime,
  antigravityAcpDirectory,
  resolveAcpLaunch,
} from "../src/acp/runtime.ts";

const DEFAULT_PROMPT = "Reply with the single word pong. Do not use tools.";
const LOGIN_TIMEOUT_MS = 5 * 60_000;
const PROMPT_TIMEOUT_MS = 2 * 60_000;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const modelsOnly = process.argv.includes("--models-only");
const prompt = arg("--prompt") ?? DEFAULT_PROMPT;
const cwd = path.resolve(arg("--cwd") ?? os.tmpdir());

let connection: AcpConnection | undefined;

try {
  const launch = resolveAcpLaunch();
  console.log(`launch: ${launch.source}`);
  console.log(`command: ${launch.command} ${launch.args.join(" ")}`.trim());
  console.log(`token store (not read): ${antigravityAcpDirectory()}`);
  console.log(`session cwd: ${cwd}`);

  const runtime = new AcpRuntime({ cwd, launch });
  connection = new AcpConnection(runtime);

  const initialized = await connection.initialize();
  console.log(`protocol: ${initialized.protocolVersion}`);
  if (initialized.agentInfo?.name || initialized.agentInfo?.version) {
    console.log(`agent: ${initialized.agentInfo.name ?? "unknown"} ${initialized.agentInfo.version ?? ""}`.trim());
  }
  if (initialized.authMethods.length === 0) {
    console.log("auth methods: none advertised; skipping authenticate");
  } else {
    for (const method of initialized.authMethods) {
      console.log(`auth method: ${method.id}${method.name ? ` (${method.name})` : ""}`);
    }
    const selected = pickAuthMethod(initialized.authMethods);
    if (!selected) throw new Error("ACP server advertised auth methods but none had an id");
    console.log(`authenticate: ${selected.id}`);
    console.log("Complete the Google login in the browser the official server opens. This process does not see the token.");
    await connection.authenticate(selected.id, LOGIN_TIMEOUT_MS);
    console.log("authenticate: ok");
  }

  const session = await connection.newSession(cwd);
  console.log(`session: ${session.sessionId}`);
  console.log(`current model: ${session.currentModelId ?? "(not reported)"}`);
  if (session.models.length === 0) {
    console.log("models: none in session/new");
  } else {
    for (const model of session.models) console.log(`model: ${model.id} — ${model.name}`);
  }

  if (modelsOnly) {
    console.log("skipped prompt (--models-only)");
  } else {
    const mapper = new DshTextMapper();
    const unsubscribe = connection.subscribeUpdates((params) => {
      for (const chunk of mapper.push(params)) {
        if (chunk.type === "text-delta" && chunk.text) process.stdout.write(chunk.text);
        else if (chunk.type === "reasoning-delta") console.log(`\n[reasoning] ${chunk.text ?? ""}`);
      }
    });
    console.log("--- prompt ---");
    const result = await connection.prompt(session.sessionId, prompt, PROMPT_TIMEOUT_MS);
    unsubscribe();
    process.stdout.write("\n");
    const finish = mapper.finish(result.stopReason, { provider: "agy-next-acp", model: session.currentModelId ?? "acp-current" });
    console.log(`stopReason: ${result.stopReason ?? "(none)"}`);
    console.log(`dsh finish: ${JSON.stringify(finish.at(-1))}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  await connection?.close().catch(() => undefined);
}

/**
 * Start and own one official Antigravity ACP server process.
 *
 * Launch order is fixed: `agy acp` on PATH, then `agy_acp_server`.
 * OAuth tokens stay in Antigravity's own store (`~/.gemini/antigravity-acp/`).
 * This module never reads that directory and never embeds a client id.
 *
 * Protocol shape follows the official ACP v1 client used by
 * https://github.com/zacbemis/pi-antigravity-acp-provider — NDJSON JSON-RPC
 * on stdio, not a copied implementation.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STDERR_LIMIT = 16 * 1024;
const KILL_GRACE_MS = 1_500;
const CHROMIUM_STDOUT_NOISE = "Opening in existing browser session.";

export interface AcpLaunch {
  command: string;
  args: string[];
  source: "agy-acp" | "agy_acp_server";
}

export interface ProcessExit {
  code: number | null;
  signal: NodeJS.Signals | null;
  stderrTail: string;
}

/** Official token directory. Callers may display this path; they must not read it. */
export function antigravityAcpDirectory(env: NodeJS.ProcessEnv = process.env): string {
  const geminiHome = env.GEMINI_HOME?.trim();
  const base = geminiHome ? expandHome(geminiHome) : path.join(os.homedir(), ".gemini");
  return path.join(base, "antigravity-acp");
}

export function resolveAcpLaunch(env: NodeJS.ProcessEnv = process.env): AcpLaunch {
  const agy = findOnPath("agy", env);
  if (agy) return { command: agy, args: ["acp"], source: "agy-acp" };

  const server = findOnPath("agy_acp_server", env);
  if (server) {
    return {
      command: server,
      args: linuxUidArg(server),
      source: "agy_acp_server",
    };
  }

  throw new Error(
    "Official Antigravity ACP server was not found on PATH. Install `agy` and run `agy acp`, or put `agy_acp_server` on PATH.",
  );
}

export function redact(text: string): string {
  return text
    .replace(/((?:access|refresh|id)_token|code|client_secret)(["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi, "$1$2[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bya29\.[0-9A-Za-z._-]+/g, "[redacted]")
    .replace(/(https?:\/\/[^\s"'<>]+)\?[^\s"'<>]*/g, "$1?[redacted]");
}

export function isCompatibilityNoise(line: string): boolean {
  return line.trim() === CHROMIUM_STDOUT_NOISE;
}

export class AcpRuntime {
  readonly launch: AcpLaunch;
  readonly exited: Promise<ProcessExit>;
  private readonly child: ChildProcessWithoutNullStreams;
  private stderr = "";
  private settled = false;
  private closing?: Promise<void>;

  constructor(options: { cwd?: string; env?: NodeJS.ProcessEnv; launch?: AcpLaunch } = {}) {
    this.launch = options.launch ?? resolveAcpLaunch(options.env);
    let resolveExit!: (exit: ProcessExit) => void;
    this.exited = new Promise((resolve) => {
      resolveExit = resolve;
    });

    const command = this.launch.command;
    const args = this.launch.args;
    const shell = needsWindowsShell(command);
    this.child = spawn(command, args, {
      cwd: path.resolve(options.cwd ?? process.cwd()),
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      windowsHide: true,
    });

    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk: string) => {
      this.stderr = redact((this.stderr + chunk).slice(-STDERR_LIMIT));
    });
    this.child.once("error", (cause) => {
      this.finish(resolveExit, null, null, `spawn failed: ${cause.message}`);
    });
    this.child.once("exit", (code, signal) => {
      this.finish(resolveExit, code, signal, this.stderr);
    });
  }

  get stdout(): NodeJS.ReadableStream {
    return this.child.stdout;
  }

  get pid(): number | undefined {
    return this.child.pid;
  }

  get stderrTail(): string {
    return this.stderr;
  }

  get alive(): boolean {
    return !this.settled && this.child.exitCode === null && !this.child.killed;
  }

  write(frame: string): void {
    if (!this.child.stdin.writable) {
      throw new Error("ACP server stdin is closed");
    }
    this.child.stdin.write(frame);
  }

  async close(): Promise<void> {
    this.closing ??= this.closeOnce();
    return this.closing;
  }

  private async closeOnce(): Promise<void> {
    if (!this.alive) return;
    this.signal("SIGTERM");
    const exited = await Promise.race([
      this.exited.then(() => true),
      delay(KILL_GRACE_MS).then(() => false),
    ]);
    if (!exited && this.alive) {
      this.signal("SIGKILL");
      await Promise.race([this.exited, delay(KILL_GRACE_MS)]);
    }
  }

  private signal(signal: NodeJS.Signals): void {
    const pid = this.child.pid;
    try {
      if (process.platform === "win32" && pid) {
        const args = ["/PID", String(pid), "/T"];
        if (signal === "SIGKILL") args.push("/F");
        spawn("taskkill", args, { stdio: "ignore", windowsHide: true });
        return;
      }
      this.child.kill(signal);
    } catch {
      // Already gone.
    }
  }

  private finish(
    resolve: (exit: ProcessExit) => void,
    code: number | null,
    signal: NodeJS.Signals | null,
    stderrTail: string,
  ): void {
    if (this.settled) return;
    this.settled = true;
    resolve({ code, signal, stderrTail: redact(stderrTail) });
  }
}

function findOnPath(name: string, env: NodeJS.ProcessEnv): string | undefined {
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const names = commandNames(name);
  for (const directory of dirs) {
    if (!path.isAbsolute(directory)) continue;
    for (const candidate of names) {
      const file = path.join(directory, candidate);
      if (isFile(file)) return file;
    }
  }
  return undefined;
}

function commandNames(name: string): string[] {
  if (process.platform !== "win32") return [name];
  return [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name];
}

function needsWindowsShell(command: string): boolean {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

/**
 * The reference client passes an empty `--uid=` to the native Linux server.
 * `agy acp` is a subcommand and must not receive it. Windows is unaffected.
 */
function linuxUidArg(command: string): string[] {
  if (process.platform !== "linux") return [];
  if (hasShebang(command)) return [];
  return ["--uid="];
}

function hasShebang(file: string): boolean {
  try {
    const fd = fs.openSync(file, "r");
    const bytes = Buffer.alloc(2);
    const count = fs.readSync(fd, bytes, 0, 2, 0);
    fs.closeSync(fd);
    return count >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21;
  } catch {
    return false;
  }
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function expandHome(file: string): string {
  if (file === "~") return os.homedir();
  if (file.startsWith("~/") || file.startsWith("~\\")) return path.join(os.homedir(), file.slice(2));
  return file;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

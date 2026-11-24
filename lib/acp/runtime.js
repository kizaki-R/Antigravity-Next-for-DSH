/**
 * Start one official Antigravity ACP server.
 *
 * Launch order: `agy acp` on PATH, then `agy_acp_server`, then the per-user
 * Windows install `~/AppData/Local/agy/bin/agy.exe` so a GUI process with a
 * thinner PATH can still find the CLI. Tokens stay in Antigravity's store.
 * This module never reads that directory and never embeds a client id.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STDERR_LIMIT = 16 * 1024;
const KILL_GRACE_MS = 1_500;
const CHROMIUM_STDOUT_NOISE = "Opening in existing browser session.";

export function resolveAcpLaunch(env = process.env) {
  const pathAgy = findOnPath("agy", env);
  if (pathAgy) return { command: pathAgy, args: ["acp"], source: "agy-acp" };

  const server = findOnPath("agy_acp_server", env);
  if (server) {
    return { command: server, args: linuxUidArg(server), source: "agy_acp_server" };
  }

  const userAgy = windowsUserAgy();
  if (userAgy) return { command: userAgy, args: ["acp"], source: "agy-user-install" };

  throw new Error(
    "Official Antigravity ACP server was not found on PATH. Install `agy` and run `agy acp`, or put `agy_acp_server` on PATH.",
  );
}

export function redact(text) {
  return String(text)
    .replace(/(AGY_NEXT_MCP_BRIDGE_TOKEN["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi, "$1[redacted]")
    .replace(/((?:access|refresh|id)_token|code|client_secret)(["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi, "$1$2[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bya29\.[0-9A-Za-z._-]+/g, "[redacted]")
    .replace(/(https?:\/\/[^\s"'<>]+)\?[^\s"'<>]*/g, "$1?[redacted]");
}

export function isCompatibilityNoise(line) {
  return String(line).trim() === CHROMIUM_STDOUT_NOISE;
}

export class AcpRuntime {
  constructor(options = {}) {
    this.launch = options.launch ?? resolveAcpLaunch(options.env);
    this.stderr = "";
    this.settled = false;
    this.closing = undefined;
    let resolveExit;
    this.exited = new Promise((resolve) => {
      resolveExit = resolve;
    });

    const shell = needsWindowsShell(this.launch.command);
    this.child = spawn(this.launch.command, this.launch.args, {
      cwd: path.resolve(options.cwd ?? process.cwd()),
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      windowsHide: true,
    });
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk) => {
      this.stderr = redact((this.stderr + chunk).slice(-STDERR_LIMIT));
    });
    this.child.once("error", (cause) => {
      this.finish(resolveExit, null, null, `spawn failed: ${cause.message}`);
    });
    this.child.once("exit", (code, signal) => {
      this.finish(resolveExit, code, signal, this.stderr);
    });
  }

  get stdout() {
    return this.child.stdout;
  }

  get pid() {
    return this.child.pid;
  }

  get stderrTail() {
    return this.stderr;
  }

  get alive() {
    return !this.settled && this.child.exitCode === null && !this.child.killed;
  }

  write(frame) {
    if (!this.child.stdin.writable) throw new Error("ACP server stdin is closed");
    this.child.stdin.write(frame);
  }

  close() {
    this.closing ??= this.closeOnce();
    return this.closing;
  }

  async closeOnce() {
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

  signal(signal) {
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

  finish(resolve, code, signal, stderrTail) {
    if (this.settled) return;
    this.settled = true;
    resolve({ code, signal, stderrTail: redact(stderrTail) });
  }
}

function findOnPath(name, env) {
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  for (const directory of dirs) {
    if (!path.isAbsolute(directory)) continue;
    for (const candidate of commandNames(name)) {
      const file = path.join(directory, candidate);
      if (isFile(file)) return file;
    }
  }
  return undefined;
}

function windowsUserAgy() {
  if (process.platform !== "win32") return undefined;
  const file = path.join(os.homedir(), "AppData", "Local", "agy", "bin", "agy.exe");
  return isFile(file) ? file : undefined;
}

function commandNames(name) {
  if (process.platform !== "win32") return [name];
  return [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name];
}

function needsWindowsShell(command) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

function linuxUidArg(command) {
  if (process.platform !== "linux" || hasShebang(command)) return [];
  return ["--uid="];
}

function hasShebang(file) {
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

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

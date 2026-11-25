/**
 * Read active Antigravity ACP CLI credentials (`agy` / `agy_acp_server`) without
 * touching desktop IDE binaries or hardcoding client secrets.
 *
 * Where official ACP runtimes persist sign-in state:
 * 1. File storage (SSH / `GEMINI_HOME` / headless / `agy_acp_server`):
 *    - `<GEMINI_HOME>/antigravity-acp/antigravity-oauth-token`
 *    - `<GEMINI_HOME>/antigravity-cli/antigravity-oauth-token`
 *    - `<GEMINI_HOME>/antigravity-acp/acp_token.json`
 * 2. Native OS keyring (`go-keyring` service `gemini`, account `antigravity`):
 *    - Windows Credential Manager: `gemini:antigravity`
 *    - macOS Keychain: `security find-generic-password -s gemini -a antigravity -w`
 *    - Linux Secret Service: `secret-tool lookup service gemini username antigravity`
 */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { TOKEN_URL } from "../constants.js";

const execFileAsync = promisify(execFile);

const KEYRING_SERVICE = "gemini";
const KEYRING_ACCOUNT = "antigravity";
const WINDOWS_TARGET = `${KEYRING_SERVICE}:${KEYRING_ACCOUNT}`;
const CACHE_TTL_MS = 2 * 60_000;
const EXPIRY_LEEWAY_MS = 60_000;
const KEYRING_TIMEOUT_MS = 8_000;
const REFRESH_TIMEOUT_MS = 10_000;

const WIN_CRED_PS = Buffer.from(
  [
    "Add-Type -TypeDefinition @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "using System.Text;",
    "public class AgyNextWinCred {",
    "  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]",
    "  public struct CREDENTIAL {",
    "    public int Flags; public int Type; public string TargetName; public string Comment;",
    "    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;",
    "    public int Persist; public int AttributeCount; public IntPtr Attributes;",
    "    public string TargetAlias; public string UserName;",
    "  }",
    '  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]',
    "  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);",
    '  [DllImport("advapi32.dll")]',
    "  public static extern void CredFree(IntPtr cred);",
    "  public static string Read(string target) {",
    "    IntPtr ptr;",
    "    if (!CredRead(target, 1, 0, out ptr)) return null;",
    "    try {",
    "      var cred = Marshal.PtrToStructure<CREDENTIAL>(ptr);",
    "      if (cred.CredentialBlobSize <= 0) return string.Empty;",
    "      var bytes = new byte[cred.CredentialBlobSize];",
    "      Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);",
    "      return Encoding.UTF8.GetString(bytes);",
    "    } finally { CredFree(ptr); }",
    "  }",
    "}",
    "'@",
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    `$secret = [AgyNextWinCred]::Read("${WINDOWS_TARGET}")`,
    "if ($null -ne $secret) { [Console]::Write($secret) }",
  ].join("\n"),
  "utf16le",
).toString("base64");

let cachedEntry = null;
let inflightRead = null;

function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Decode `go-keyring`'s base64/hex wrappers used on macOS/Windows keyrings. */
export function decodeGoKeyringSecret(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.replace(/\0+$/g, "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("go-keyring-base64:")) {
    return Buffer.from(trimmed.slice("go-keyring-base64:".length), "base64").toString("utf8");
  }
  if (trimmed.startsWith("go-keyring-encoded:")) {
    return Buffer.from(trimmed.slice("go-keyring-encoded:".length), "hex").toString("utf8");
  }
  return trimmed;
}

export function parseAcpCredentialBlob(rawText, { source = "keyring", now = Date.now } = {}) {
  const decoded = decodeGoKeyringSecret(rawText);
  if (!decoded) return null;
  let data;
  try {
    data = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const token = data.token && typeof data.token === "object" ? data.token : data;
  const accessToken = asString(token.access_token);
  const refreshToken = asString(token.refresh_token) ?? asString(data.refresh_token);
  const clientId = asString(data.client_id);
  const clientSecret = asString(data.client_secret);
  const projectId = asString(data.project_id);
  const email = asString(data.id_token_email) ?? asString(data.email);
  const authMethod = asString(data.auth_method) ?? asString(data.authMethod);

  if (!accessToken && !(refreshToken && clientId && clientSecret)) return null;

  let expiresAtMs = null;
  if (typeof token.expiry === "string" && token.expiry.trim()) {
    const parsed = Date.parse(token.expiry);
    if (Number.isFinite(parsed)) expiresAtMs = parsed;
  } else if (typeof token.expires === "number" && Number.isFinite(token.expires)) {
    expiresAtMs = token.expires;
  }

  return {
    source,
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
    projectId,
    expiresAtMs,
    expired: Boolean(expiresAtMs !== null && expiresAtMs <= now() + EXPIRY_LEEWAY_MS),
    email,
    authMethod,
    hasRefresh: Boolean(refreshToken),
  };
}

async function exchangeLegacyAcpToken(cred, { fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (!cred?.refreshToken || !cred?.clientId || !cred?.clientSecret) return cred;
  try {
    const body = new URLSearchParams({
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      refresh_token: cred.refreshToken,
      grant_type: "refresh_token",
    });
    const res = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
    if (!res.ok) return cred;
    const json = await res.json();
    const accessToken = asString(json?.access_token);
    if (!accessToken) return cred;
    const expiresIn = Number(json?.expires_in);
    const expiresAtMs = Number.isFinite(expiresIn) && expiresIn > 0
      ? now() + expiresIn * 1000
      : null;
    return {
      ...cred,
      accessToken,
      expiresAtMs,
      expired: false,
    };
  } catch {
    return cred;
  }
}

function candidateGeminiHomes(env = process.env, homedir = os.homedir) {
  const dirs = [];
  const geminiDir = asString(env?.GEMINI_DIR) || ".gemini";
  const explicitHome = asString(env?.GEMINI_HOME);
  if (explicitHome) dirs.push(explicitHome);
  const cliHome = asString(env?.GEMINI_CLI_HOME);
  if (cliHome) dirs.push(path.join(cliHome, geminiDir));
  const userHome = asString(env?.HOME) ?? asString(env?.USERPROFILE) ?? homedir();
  if (userHome) dirs.push(path.join(userHome, geminiDir));
  return [...new Set(dirs.map((d) => path.resolve(d)))];
}

async function readKeyringSecret({
  platform = process.platform,
  execFileImpl = execFileAsync,
} = {}) {
  try {
    if (platform === "win32") {
      const { stdout } = await execFileImpl(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", WIN_CRED_PS],
        { windowsHide: true, timeout: KEYRING_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      );
      return asString(stdout);
    }
    if (platform === "darwin") {
      const { stdout } = await execFileImpl(
        "security",
        ["find-generic-password", "-s", KEYRING_SERVICE, "-a", KEYRING_ACCOUNT, "-w"],
        { timeout: KEYRING_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      );
      return asString(stdout);
    }
    if (platform === "linux") {
      const { stdout } = await execFileImpl(
        "secret-tool",
        ["lookup", "service", KEYRING_SERVICE, "username", KEYRING_ACCOUNT],
        { timeout: KEYRING_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      );
      return asString(stdout);
    }
  } catch {
    return null;
  }
  return null;
}

export function clearAcpCredentialCache() {
  cachedEntry = null;
  inflightRead = null;
}

export async function readAcpCredential(options = {}) {
  const hasCustomHooks = Boolean(
    options.env ||
    options.platform ||
    options.homedir ||
    options.readFile ||
    options.execFile ||
    options.fetch ||
    options.now,
  );
  const now = options.now ?? Date.now;

  if (!hasCustomHooks && !options.force && cachedEntry && now() < cachedEntry.untilMs) {
    return cachedEntry.value;
  }
  if (!hasCustomHooks && !options.force && inflightRead) {
    return inflightRead;
  }

  const work = (async () => {
    const env = options.env ?? process.env;
    const platform = options.platform ?? process.platform;
    const homedir = options.homedir ?? os.homedir;
    const readFileImpl = options.readFile ?? readFile;
    const fetchImpl = options.fetch ?? globalThis.fetch;

    const homes = candidateGeminiHomes(env, homedir);
    let found = null;

    // 1. Check explicit file-backed CLI tokens (`antigravity-oauth-token`)
    for (const home of homes) {
      for (const subdir of ["antigravity-acp", "antigravity-cli"]) {
        const tokenPath = path.join(home, subdir, "antigravity-oauth-token");
        try {
          const text = await readFileImpl(tokenPath, "utf8");
          const parsed = parseAcpCredentialBlob(text, { source: "file", now });
          if (parsed?.accessToken) {
            found = parsed;
            break;
          }
        } catch {
          // Not present or unreadable.
        }
      }
      if (found) break;
    }

    // 2. Check OS keyring (`gemini:antigravity` on Windows / `gemini`+`antigravity` on Unix)
    if (!found) {
      const rawKeyring = await readKeyringSecret({
        platform,
        execFileImpl: options.execFile ?? execFileAsync,
      });
      if (rawKeyring) {
        const parsed = parseAcpCredentialBlob(rawKeyring, { source: "keyring", now });
        if (parsed?.accessToken) found = parsed;
      }
    }

    // 3. Fallback to legacy `acp_token.json` (`agy_acp_server` 1.4.x) if present
    if (!found) {
      for (const home of homes) {
        const legacyPath = path.join(home, "antigravity-acp", "acp_token.json");
        try {
          const text = await readFileImpl(legacyPath, "utf8");
          const parsed = parseAcpCredentialBlob(text, { source: "acp_token", now });
          if (parsed) {
            found = parsed.accessToken && !parsed.expired
              ? parsed
              : await exchangeLegacyAcpToken(parsed, { fetchImpl, now });
            if (found?.accessToken) break;
            found = null;
          }
        } catch {
          // Not present or unreadable.
        }
      }
    }

    if (!hasCustomHooks) {
      const expiryLimit = found?.expiresAtMs ? Math.max(now(), found.expiresAtMs - EXPIRY_LEEWAY_MS) : Infinity;
      const ttlUntil = Math.min(now() + CACHE_TTL_MS, expiryLimit);
      cachedEntry = {
        value: found,
        untilMs: found && !found.expired ? ttlUntil : now() + 5_000,
      };
    }
    return found;
  })();

  if (!hasCustomHooks && !options.force) {
    inflightRead = work;
    try {
      return await work;
    } finally {
      if (inflightRead === work) inflightRead = null;
    }
  }
  return work;
}

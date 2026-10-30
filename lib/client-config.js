/**
 * @deprecated Legacy user-supplied OAuth client file support.
 * agy-next now resolves the OAuth client directly from the locally installed official
 * Antigravity application. Manual client JSON files (<DSH_HOME>/storages/agy-next-oauth-client.json)
 * and clientPath settings are deprecated and ignored.
 *
 * Kept for backward compatibility with external exports.
 */

import { readFile, writeFile, mkdir, rename, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { CLIENT_FILE_NAME } from "./constants.js";

/**
 * Resolve `~/.dsh/...` without depending on the host, so `agy-next-login` works
 * as a standalone command. See the same helper in `store.js`.
 */
async function homePath(...segments) {
  try {
    const mod = await import("@deepseek-ai/dsh-home-paths");
    if (typeof mod.dshHomePath === "function") return mod.dshHomePath(...segments);
  } catch {
    // Not running under DSH; fall through.
  }
  const base = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
  return join(base, ...segments);
}

/** `<DSH_HOME>/storages/agy-next-oauth-client.json` unless overridden. */
export async function clientFilePath(override = "") {
  return (
    override?.trim() ||
    process.env.AGY_NEXT_CLIENT_PATH?.trim() ||
    (await homePath("storages", CLIENT_FILE_NAME))
  );
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the user's OAuth client file.
 *
 * Returns `undefined` when the file is absent — that is a normal first run, not
 * an error. Throws only when the file exists but is unusable, so a typo does not
 * masquerade as "not configured yet".
 */
export async function readClientFile(path) {
  const target = path ?? (await clientFilePath());
  let text;
  try {
    text = await readFile(target, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`agy-next: ${target} is not valid JSON.`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`agy-next: ${target} must contain a JSON object.`);
  }

  // Tolerate the names Google's console shows ("Client ID"/"Client Secret").
  const clientId = parsed.clientId ?? parsed.client_id ?? parsed["Client ID"];
  const clientSecret = parsed.clientSecret ?? parsed.client_secret ?? parsed["Client Secret"];

  return {
    clientId: typeof clientId === "string" ? clientId.trim() : "",
    clientSecret: typeof clientSecret === "string" ? clientSecret.trim() : "",
  };
}

/**
 * Write the OAuth client file with owner-only permissions.
 *
 * `mode` is applied on creation and re-applied after the rename, because a
 * rename onto an existing file can carry over that file's mode.
 */
export async function writeClientFile({ clientId, clientSecret }, path) {
  const target = path ?? (await clientFilePath());
  await mkdir(dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  const body = JSON.stringify({ clientId, clientSecret }, null, 2);
  await writeFile(temp, `${body}\n`, { mode: 0o600 });
  await rename(temp, target);
  try {
    await chmod(target, 0o600);
  } catch {
    // Windows does not implement POSIX modes; the file already inherits the
    // profile directory's ACL, which is the best available guarantee there.
  }
  return target;
}

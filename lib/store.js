/**
 * Credential storage.
 *
 * Two formats exist in the wild:
 *
 *   v1 (flat)   { refresh, access, expires, projectId, email }
 *   v2 (book)   { version:2, activeId, accounts:[ {id,email,refresh,...} ] }
 *
 * The official 0.0.9 plugin only understands v1 and its `write()` replaces the
 * whole file, so pointing it at a v2 book silently destroys every account but
 * one. This plugin therefore owns a separate path and will only ever *read*
 * the official file, never write it.
 */

import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

/**
 * Resolve `~/.dsh/...` without depending on the host.
 *
 * In DSH the `@deepseek-ai/dsh-home-paths` package is injected by the loader, but
 * the `bin/*.mjs` entry points (notably `agy-next-login`) run as plain Node
 * scripts *outside* the host, where that package is not resolvable. Importing it
 * statically would make `npx agy-next-login` fail with ERR_MODULE_NOT_FOUND, so
 * the import stays dynamic and falls back to the documented layout:
 * `$DSH_HOME`, else `~/.dsh`.
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

/** Our own file. Deliberately distinct from the official `antigravity-oauth.json`. */
export async function credentialPath(override = "") {
  return (
    override?.trim() ||
    process.env.AGY_NEXT_CREDENTIAL_PATH?.trim() ||
    (await homePath("storages", "agy-next-oauth.json"))
  );
}

/** The official plugin's file, read-only, used only to import an existing login. */
export async function legacyCredentialPath() {
  return homePath("storages", "antigravity-oauth.json");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extract the flat credential out of either on-disk format. */
export function normalizeCredential(raw) {
  if (!isRecord(raw)) return undefined;

  if (Array.isArray(raw.accounts)) {
    const active =
      raw.accounts.find((a) => isRecord(a) && a.id === raw.activeId) ??
      raw.accounts.find(isRecord);
    if (!active) return undefined;
    return {
      email: typeof active.email === "string" ? active.email : undefined,
      refresh: active.refresh,
      access: active.access,
      expires: active.expires,
      projectId: active.projectId,
      addedAt: active.addedAt,
    };
  }

  return {
    email: typeof raw.email === "string" ? raw.email : undefined,
    refresh: raw.refresh,
    access: raw.access,
    expires: raw.expires,
    projectId: raw.projectId,
    addedAt: raw.addedAt,
  };
}

export function needsRefresh(credential) {
  if (!credential?.access) return true;
  if (!credential.expires) return true;
  return credential.expires <= Date.now() + 60_000;
}

export class CredentialStore {
  #file;
  #explicit;
  /** Serializes writes so two concurrent refreshes cannot interleave. */
  #chain = Promise.resolve();

  constructor(file = "") {
    this.#explicit = file?.trim() || "";
    this.#file = this.#explicit || undefined;
  }

  /** Absolute path of this store's file. Resolved lazily (may need HOME). */
  async path() {
    if (!this.#file) this.#file = await credentialPath();
    return this.#file;
  }

  /** Throwing-free peek; returns undefined before the path is resolved. */
  pathSync() {
    return this.#file;
  }

  async read() {
    try {
      const parsed = JSON.parse(await readFile(await this.path(), "utf8"));
      return normalizeCredential(parsed);
    } catch (error) {
      if (error?.code === "ENOENT") return undefined;
      throw error;
    }
  }

  /** Read the official plugin's file without ever writing to it. */
  async readLegacy() {
    try {
      const parsed = JSON.parse(await readFile(await legacyCredentialPath(), "utf8"));
      return normalizeCredential(parsed);
    } catch {
      return undefined;
    }
  }

  /** Prefer our own credential; fall back to importing the official one. */
  async readOrImport() {
    return (await this.read()) ?? (await this.readLegacy());
  }

  async write(credential) {
    const file = await this.path();
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    await writeFile(temp, JSON.stringify(credential, null, 2), { mode: 0o600 });
    await rename(temp, file);
  }

  /** Read-modify-write under a lock; `fn` returning undefined skips the write. */
  modify(fn) {
    const next = (async () => {
      await this.#chain.catch(() => {});
      const current = await this.read();
      const updated = await fn(current);
      if (updated !== undefined) await this.write(updated);
      return updated ?? current;
    })();
    this.#chain = next.catch(() => {});
    return next;
  }

  async delete() {
    await this.#chain.catch(() => {});
    try {
      await unlink(await this.path());
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export function joinPath(...segments) {
  return join(...segments);
}

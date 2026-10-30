/**
 * @deprecated Progress state tracking for legacy manual OAuth setup guide.
 * agy-next now resolves the client automatically from the official local Antigravity app.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const PROGRESS_FILE = "agy-next-setup.json";

/**
 * Resolve `<DSH_HOME>/...` without requiring the host.
 *
 * `store.js` and `client-config.js` each carry their own copy of this helper so
 * they stay independent of each other; this third copy follows the same rule
 * rather than coupling the setup state to either of them.
 */
async function homePath(...segments) {
  try {
    const mod = await import("@deepseek-ai/dsh-home-paths");
    if (typeof mod.dshHomePath === "function") return mod.dshHomePath(...segments);
  } catch {
    // Not running under DSH; fall through to the environment.
  }
  const base = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
  return join(base, ...segments);
}

/** `<DSH_HOME>/storages/agy-next-setup.json`, or AGY_NEXT_SETUP_STATE when set. */
export async function progressPath() {
  return (
    process.env.AGY_NEXT_SETUP_STATE?.trim() ||
    (await homePath("storages", PROGRESS_FILE))
  );
}

/**
 * @returns {Promise<{done: string[], updatedAt: string|null}>}
 *          `done` is always an array, so callers never branch on undefined.
 */
export async function readProgress() {
  const empty = { done: [], updatedAt: null };
  let text;
  try {
    text = await readFile(await progressPath(), "utf8");
  } catch {
    return empty;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // A corrupted progress file must not block setup; starting over is safe.
    return empty;
  }
  if (!parsed || typeof parsed !== "object") return empty;
  const done = Array.isArray(parsed.done)
    ? parsed.done.filter((k) => typeof k === "string")
    : [];
  return { done, updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null };
}

/** Record that a step key is finished. Best-effort: a failure here never stops setup. */
export async function markStepDone(key) {
  if (typeof key !== "string" || !key) return;
  try {
    const current = await readProgress();
    if (current.done.includes(key)) return;
    const target = await progressPath();
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      target,
      `${JSON.stringify(
        { done: [...current.done, key], updatedAt: new Date().toISOString() },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
  } catch {
    // Losing the marker only costs the user a repeated step.
  }
}

/** Forget the progress, so the next run walks every step again. */
export async function clearProgress() {
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(await progressPath());
  } catch {
    // Absent file is already the desired state.
  }
}

/**
 * Remember how far the one-time setup walkthrough has got.
 *
 * Why this exists: the walkthrough sends the user through four Google Cloud
 * pages. Someone who closes the terminal on step three — or whose browser
 * session drops — had to start again from step one, and that is exactly where
 * people give up. The progress file turns a restart into "continue where you
 * were".
 *
 * What is stored, and what is NOT:
 *   step      which step was finished, so the next run resumes after it
 *   done      steps that no longer need revisiting
 *
 * The OAuth client id and secret are NOT stored here. They live in
 * `agy-next-oauth-client.json` with owner-only permissions, written only when
 * the user pastes them; duplicating a secret into a second file would double
 * the places it can leak from.
 *
 * The file is advisory. If it is missing, unreadable, or from an older layout,
 * the walkthrough simply starts from the beginning rather than failing.
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

import { createHash } from "node:crypto";
import { fetchAvailableModels } from "./client.js";
import { ROUTING } from "./constants.js";

/**
 * Upstream model discovery, in two speeds.
 *
 * `peekUpstreamModels` never touches the network: it returns whatever the last
 * successful discovery produced (even if it is a little stale) and asks for a
 * refresh in the background. The model picker calls this, because a picker must
 * answer immediately — awaiting three endpoints there is what made choosing a
 * model pause for seconds.
 *
 * `primeUpstreamModels` is the refresh itself: at most one request per account
 * is in flight, and the result lands in the cache for the next peek.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const inflight = new Map();

/**
 * Cache key for one account. Keyed by the full token, not a suffix: a refreshed
 * access token for the same account must not look like a different account and
 * lose its discovery, nor may two accounts that happen to share a suffix share
 * one snapshot.
 */
function cacheKey(token, projectId) {
  // Keep a non-reversible fingerprint in memory; never retain bearer tokens as
  // Map keys where a heap/debug snapshot could reveal them.
  const fingerprint = createHash("sha256").update(String(token)).digest("hex");
  return `${fingerprint}:${projectId ?? ""}`;
}

function pruneCache() {
  while (cache.size > 16) cache.delete(cache.keys().next().value);
}

function snapshot(models) {
  const limits = {};
  const available = new Set();
  for (const [runtimeId, m] of Object.entries(models ?? {})) {
    if (!m || typeof m !== "object") continue;
    available.add(runtimeId);
    limits[runtimeId] = {
      maxTokens: Number.isFinite(m.maxTokens) ? m.maxTokens : undefined,
      maxOutputTokens: Number.isFinite(m.maxOutputTokens) ? m.maxOutputTokens : undefined,
      supportsThinking: Boolean(m.supportsThinking),
      displayName: typeof m.displayName === "string" ? m.displayName : undefined,
    };
  }
  return { limits, available, fetchedAt: Date.now(), expiresAt: Date.now() + CACHE_TTL_MS };
}

/** Refresh one account's model list. Safe to fire and forget. */
export function primeUpstreamModels(token, projectId) {
  if (!token) return Promise.resolve(null);
  const key = cacheKey(token, projectId);
  const running = inflight.get(key);
  if (running) return running;

  const work = (async () => {
    try {
      const res = await fetchAvailableModels(token, projectId ?? "aicode-consumers");
      // A failed or empty discovery is not "this account serves nothing":
      // keep the last successful snapshot for THIS account and report failure
      // so callers can tell "unknown" apart from "confirmed empty".
      if (!res?.reachable || !res.models || Object.keys(res.models).length === 0) {
        return { entry: cache.get(key) ?? null, failed: true };
      }
      const entry = snapshot(res.models);
      if (entry.available.size === 0) return { entry: cache.get(key) ?? null, failed: true };
      cache.set(key, entry);
      pruneCache();
      return { entry, failed: false };
    } catch {
      return { entry: cache.get(key) ?? null, failed: true };
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, work);
  return work;
}

/**
 * Last known discovery for this account, without waiting on the network.
 * Expired entries are still returned (stale-while-revalidate) and refreshed in
 * the background; a cold cache returns null and starts the first refresh.
 */
export function peekUpstreamModels(token, projectId) {
  if (!token) return null;
  const key = cacheKey(token, projectId);
  const hit = cache.get(key);
  if (!hit || Date.now() >= hit.expiresAt) {
    void primeUpstreamModels(token, projectId);
  }
  return hit ?? null;
}

/**
 * Drop cached discovery for one account. Keyed by the same full token as
 * `cacheKey`, so a refresh of that account really clears its snapshot.
 */
export function invalidateUpstreamModels(token) {
  if (!token) return;
  const fingerprint = createHash("sha256").update(String(token)).digest("hex");
  const prefix = `${fingerprint}:`;
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Awaiting variant, for background warm-up and tests. */
export async function getUpstreamModelLimits(token, projectId) {
  if (!token) return null;
  const key = cacheKey(token, projectId);
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.limits;
  const result = await primeUpstreamModels(token, projectId);
  return result?.entry?.limits ?? null;
}

/**
 * Wait for one refresh and return what it proved: a confirmed snapshot, the
 * previous snapshot when the refresh failed, or `null` when nothing is known.
 */
export function refreshUpstreamModels(token, projectId) {
  if (!token) return Promise.resolve({ entry: null, failed: true });
  return primeUpstreamModels(token, projectId);
}

/** Resolve dynamic context window and output ceiling for a catalog model ID. */
export function resolveDynamicLimits(modelId, upstreamLimits) {
  const limits = upstreamLimits?.limits ?? upstreamLimits;
  if (!limits || typeof limits !== "object") return null;

  const route = ROUTING[modelId];
  const candidateRuntimeIds = route
    ? [route.medium, route.high, route.low, route.off].filter(Boolean)
    : [modelId];

  for (const rid of candidateRuntimeIds) {
    const info = limits[rid];
    if (info?.maxTokens) return { ctx: info.maxTokens, max: info.maxOutputTokens };
  }

  if (limits[modelId]?.maxTokens) {
    return { ctx: limits[modelId].maxTokens, max: limits[modelId].maxOutputTokens };
  }

  return null;
}

/**
 * The chat picker's rule, as a pure function.
 *
 * `checked` are the catalog models the user ticked, `entry` is this account's
 * confirmed discovery (or null when nothing could be confirmed).
 *   - confirmed: exactly "checked AND this account serves it"
 *   - unconfirmed: the user's checked models, so the provider and the user's
 *     choices stay visible instead of the picker vanishing
 */
export function pickChatModels(checked, entry) {
  if (!Array.isArray(checked) || checked.length === 0) return [];
  if (!entry) return [...checked];
  return checked.filter((model) => isModelServedUpstream(model.id, entry) === true);
}

/**
 * Whether this account actually serves the catalog model, judged only by what
 * Google returned for THAT account. `null` means "not discovered yet": callers
 * must keep the model visible rather than hide everything on a cold cache.
 */
export function isModelServedUpstream(modelId, entry) {
  // An empty Set is truthy. Treating it as a real discovery hides every model
  // and DSH then drops the whole provider from the chat picker.
  if (!entry?.available || entry.available.size === 0) return null;
  const route = ROUTING[modelId];
  const runtimeIds = route
    ? [route.medium, route.high, route.low, route.off].filter(Boolean)
    : [modelId];
  return runtimeIds.some((rid) => entry.available.has(rid));
}

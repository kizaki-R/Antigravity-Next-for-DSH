/** Google subscription information is independent of model-rollout eligibility. */
import { createHash } from "node:crypto";
import { ENDPOINTS } from "./constants.js";
import { isRecord, jsonHeaders } from "./client.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;

function tierSummary(value) {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : null;
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : null;
  return id || name ? { id, name } : null;
}

function googlePlanKind(tier) {
  const name = tier?.name ?? "";
  const named = name.match(/\bGoogle\s+AI\s+(Plus|Pro|Ultra)\b/i)?.[1]?.toLowerCase();
  if (named) return named;
  // Map known plan IDs when the upstream omits a display name; accept future
  // tier names without requiring a fixed ID.
  return ({ "g1-plus-tier": "plus", "g1-pro-tier": "pro", "g1-ultra-tier": "ultra" })[tier?.id] ?? null;
}

/** Whitelist safe, relevant fields; never forward the full discovery payload. */
export function parseAccountPlan(data, checkedAt = new Date().toISOString()) {
  const paidTier = tierSummary(data?.paidTier);
  const codeAssistTier = tierSummary(data?.currentTier);
  // currentTier=free-tier coexists with paidTier=g1-pro-tier. allowedTiers and
  // upgrade URLs describe selectable/advertised tiers, NOT subscriptions.
  const selected = paidTier ?? (googlePlanKind(codeAssistTier) ? codeAssistTier : null);
  const tier = googlePlanKind(selected);
  return {
    status: selected ? "reported" : "unknown",
    tier: selected ? tier ?? "other" : null,
    label: selected ? selected.name ?? (tier ? `Google AI ${tier[0].toUpperCase()}${tier.slice(1)}` : selected.id) : null,
    source: selected ? `loadCodeAssist.${paidTier ? "paidTier" : "currentTier"}` : null,
    paidTier,
    codeAssistTier,
    checkedAt,
  };
}

/** In-memory, account-isolated, short-lived cache with in-flight deduplication. */
export function createAccountPlanReader({
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
  timeoutMs = REQUEST_TIMEOUT_MS,
  cacheTtlMs = CACHE_TTL_MS,
  endpoints = ENDPOINTS,
} = {}) {
  const cache = new Map();
  const pending = new Map();
  return async function readAccountPlan(token) {
    if (!token) return { ...parseAccountPlan(null, null), status: "unavailable" };
    const key = createHash("sha256").update(token).digest("hex");
    const cached = cache.get(key);
    if (cached && now() < cached.expiresAt) return structuredClone(cached.value);
    if (pending.has(key)) return structuredClone(await pending.get(key));
    const work = (async () => {
      const signal = AbortSignal.timeout(timeoutMs);
      for (const endpoint of endpoints) {
        if (signal.aborted) break;
        try {
          const response = await fetchImpl(`${endpoint}/v1internal:loadCodeAssist`, {
            method: "POST",
            headers: await jsonHeaders(token),
            body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" } }),
            signal,
          });
          if (!response.ok) continue;
          const data = await response.json();
          if (!isRecord(data)) continue;
          const value = parseAccountPlan(data, new Date(now()).toISOString());
          cache.set(key, { value, expiresAt: now() + cacheTtlMs });
          if (cache.size > 32) cache.delete(cache.keys().next().value);
          return value;
        } catch {
          // Try only the configured fallbacks within the same total timeout.
        }
      }
      // No subscription inference from quota/model IDs, and no cached failure
      // masking a recovery. Network failures are not evidence of a free plan.
      return { ...parseAccountPlan(null, new Date(now()).toISOString()), status: "unavailable" };
    })();
    pending.set(key, work);
    try { return structuredClone(await work); }
    finally { pending.delete(key); }
  };
}

export const readAccountPlan = createAccountPlanReader();

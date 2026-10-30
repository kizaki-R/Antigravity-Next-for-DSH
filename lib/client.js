/**
 * HTTP layer: request headers, project discovery, and error classification.
 */

import {
  DISCOVERY_TIMEOUT_MS,
  ENDPOINTS,
  PLATFORM,
  PRODUCT_VERSION,
  PROJECT_CACHE_TTL_MS,
  RETRYABLE_STATUS,
  USER_AGENT,
} from "./constants.js";

/**
 * Harness attribution headers, when running inside DSH.
 *
 * The host contract is that every provider request carries them, and the loader
 * normally injects `@deepseek-ai/dsh-llm` for that. The CLI entry points
 * (`agy-next-login`, `agy-next-smoke`) run as plain Node scripts where that
 * package is not resolvable, so the import is dynamic and a miss degrades to "no
 * attribution" instead of crashing the whole module with ERR_MODULE_NOT_FOUND.
 * Attribution is cosmetic for the calls those scripts make (project discovery,
 * model listing); it matters for real model traffic, which only happens under
 * the host where the package is always present.
 */
let attributionModule;
async function loadAttribution() {
  if (attributionModule === undefined) {
    try {
      attributionModule = await import("@deepseek-ai/dsh-llm");
    } catch {
      attributionModule = null;
    }
  }
  return attributionModule;
}

/** Attribution headers, or `{}` outside the host. */
export async function attribution() {
  const mod = await loadAttribution();
  try {
    return mod?.attributionHeaders?.() ?? {};
  } catch {
    return {};
  }
}

const projectCache = new Map();

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Headers for every Antigravity provider request.
 *
 * Attribution goes last so the harness attribution wins over the
 * Antigravity-flavoured UA, matching the host contract. Resolved
 * asynchronously so the module still loads outside the host.
 */
export async function antigravityHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "User-Agent": USER_AGENT,
    "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "Client-Metadata": JSON.stringify({
      ideType: "ANTIGRAVITY",
      platform: PLATFORM,
      pluginType: "GEMINI",
    }),
    ...(await attribution()),
  };
}

export async function jsonHeaders(token) {
  return { ...(await antigravityHeaders(token)), Accept: "application/json" };
}

/** Pull a project id out of any of the shapes loadCodeAssist is known to return. */
export function extractProjectId(data) {
  if (!isRecord(data)) return undefined;
  const direct =
    data.antigravityProjectId ??
    data.projectId ??
    data.backendProjectId ??
    data.userDefinedCloudaicompanionProject ??
    data.cloudaicompanionProject ??
    data.project;
  const directId = asString(direct);
  if (directId) return directId;
  if (isRecord(direct)) {
    const nestedId = asString(direct.id);
    if (nestedId) return nestedId;
  }
  for (const key of ["projects", "projectIds", "cloudaicompanionProjects"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      for (const entry of value) {
        const id = asString(entry) ?? asString(entry?.id);
        if (id) return id;
      }
    }
  }
  return undefined;
}

/** Deterministic fallback project id when discovery fails. */
export function fallbackProjectId(seed = "antigravity-default", override = "") {
  return (
    override?.trim() || process.env.ANTIGRAVITY_PROJECT_ID?.trim() || `agy-next-${seed.length}`
  );
}

/**
 * Ask the backend which Cloud Code Assist project this token maps to.
 * Personal accounts get a Google-managed value; it is not user-created.
 */
export async function loadCodeAssist(token, { signal, discoveryTimeoutMs, projectCacheTtlMs } = {}) {
  const cached = projectCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.projectId;

  const body = JSON.stringify({
    metadata: {
      ideType: "ANTIGRAVITY",
      platform: "PLATFORM_UNSPECIFIED",
      pluginType: "GEMINI",
    },
  });

  let projectId;
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
        method: "POST",
        headers: await jsonHeaders(token),
        body,
        signal: signal ?? AbortSignal.timeout(discoveryTimeoutMs ?? DISCOVERY_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      projectId = extractProjectId(await response.json());
      if (projectId) break;
    } catch {
      // Try the next endpoint; discovery failure is not fatal.
    }
  }

  projectCache.set(token, {
    projectId,
    expiresAt: Date.now() + (projectCacheTtlMs ?? PROJECT_CACHE_TTL_MS),
  });
  if (projectCache.size > 32) {
    const oldest = projectCache.keys().next().value;
    projectCache.delete(oldest);
  }
  return projectId;
}

/** Retrieve per-group quota windows for an account. */
export async function retrieveUserQuotaSummary(token, { signal } = {}) {
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}/v1internal:retrieveUserQuotaSummary`, {
        method: "POST", headers: await jsonHeaders(token), body: "{}", signal,
      });
      if (response.ok) return await response.json();
    } catch {}
  }
  return undefined;
}

/** List the models the backend currently exposes for this project. */
export async function fetchAvailableModels(token, projectId) {
  const merged = {};
  let defaultAgentModelId;
  let reachable = false;
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}/v1internal:fetchAvailableModels`, {
        method: "POST",
        headers: await jsonHeaders(token),
        body: JSON.stringify({ project: projectId }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      reachable = true;
      if (isRecord(data?.models)) Object.assign(merged, data.models);
      if (typeof data?.defaultAgentModelId === "string") {
        defaultAgentModelId = data.defaultAgentModelId;
      }
    } catch {
      // Keep whatever the other endpoint returned.
    }
  }
  // `reachable: false` means every endpoint failed. That is not an account
  // that serves no models, and must not be cached as an empty catalog.
  return { models: merged, defaultAgentModelId, reachable };
}

/* ------------------------------------------------------------ error mapping */

export function classifyError(message) {
  const text = String(message ?? "");
  if (/\b(?:401|403)\b/.test(text)) return "AUTH";
  if (/\b429\b|rate.?limit/i.test(text)) return "RATE_LIMIT";
  if (/quota/i.test(text)) return "QUOTA";
  if (/\b400\b|invalid.?request/i.test(text)) return "INVALID_REQUEST";
  if (/\b5\d\d\b/.test(text)) return "SERVER";
  if (/time(?:d)?\s*out|timeout/i.test(text)) return "TIMEOUT";
  if (/\b(?:network|connection|socket|fetch)\b|\bECONN[A-Z]+\b/i.test(text)) return "TRANSPORT";
  return "ANTIGRAVITY_ERROR";
}

export function friendlyError(status, text) {
  const message = String(text ?? "").slice(0, 500);
  switch (status) {
    case 400:
      if (/API key not valid|API_KEY_INVALID/i.test(message)) {
        return "Antigravity login expired or credentials are invalid. Run the login command again.";
      }
      if (/Invalid JSON payload|Unknown name/i.test(message)) {
        return `Antigravity rejected the request format: ${message}`;
      }
      return `Bad request from Antigravity: ${message}`;
    case 401:
      return "Antigravity authentication failed. Run the login command again.";
    case 403:
      return `Antigravity denied this request: ${message}`;
    case 404:
      return `Antigravity could not find the requested model or resource: ${message}`;
    case 408:
      return "Antigravity timed out. Retry the request.";
    case 429: {
      const wait = message.match(/Resets? in ([^.\n]+)/i)?.[1]?.trim();
      return /quota/i.test(message)
        ? `Quota reached.${wait ? ` Resets in ${wait}.` : ""}`
        : `Rate limited by Antigravity.${wait ? ` Reset: ${wait}.` : ""}`;
    }
    case 500:
      return "Antigravity had an internal server error. Retry or switch models.";
    case 502:
      return "Antigravity returned a bad gateway error. Retry.";
    case 503:
      return /No capacity available/i.test(message)
        ? "This model has no capacity right now. Retry later or switch models."
        : "Antigravity is temporarily unavailable. Retry or switch models.";
    case 504:
      return "Antigravity timed out upstream. Retry.";
    default:
      return message || "Antigravity request failed";
  }
}

/** Strip anything that looks like a credential out of text bound for a log or error. */
export function redactSecrets(text) {
  return String(text ?? "")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "ya29.<redacted>")
    .replace(/1\/\/[A-Za-z0-9._-]{20,}/g, "1//<redacted>")
    .replace(/GOCSPX-[A-Za-z0-9_-]+/g, "GOCSPX-<redacted>")
    .replace(/(client_secret=)[^&\s]+/gi, "$1<redacted>")
    .replace(/("(?:access|refresh|id)_token"\s*:\s*")[^"]+/gi, "$1<redacted>");
}

export { RETRYABLE_STATUS, PRODUCT_VERSION };

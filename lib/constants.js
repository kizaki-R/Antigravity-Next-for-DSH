/**
 * Constants for the agy-next provider.
 *
 * Everything here is a plain protocol fact: endpoint URLs, OAuth scopes, the
 * public model catalog, and the effort -> runtime-model routing table.
 */

/**
 * The provider route this adapter registers.
 *
 * Deliberately NOT "agy": the official dsh-antigravity plugin claims that id,
 * and `registerAdapter` throws DUPLICATE_ADAPTER when a second adapter wants a
 * route that is already taken. That throw happens during boot, so sharing the
 * id would stop the whole profile from starting rather than merely disabling
 * one plugin. A distinct id lets both coexist and makes it obvious in the model
 * picker which plugin is serving a request.
 */
export const PROVIDER = "agy-next";
export const PROVIDER_NAME = "Antigravity Next";

/* ---------------------------------------------------------------- endpoints */

/**
 * Cloud Code PA endpoints.
 *
 * Ordered to match Google's official Antigravity desktop IDE, which runs with:
 *   --cloud_code_endpoint https://daily-cloudcode-pa.googleapis.com
 * Using this endpoint aligns truthful quota accounting with the IDE's display
 * and avoids 429 quota exhaustion from the generic cloudcode-pa host.
 */
export const ENDPOINTS = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
];

/** Retry the next endpoint only for these statuses. */
export const RETRYABLE_STATUS = new Set([403, 404, 429, 500, 502, 503, 504]);

/* --------------------------------------------------------------------- oauth */

export const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo";
export const REDIRECT_PATH = "/oauth-callback";

export const SCOPES = [
  "https://www.googleapis.com/auth/aicode",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];

/**
 * OAuth client credentials — supplied by the USER, never bundled.
 *
 * Previous versions shipped a copy of the client id/secret that Google embeds
 * in its own Antigravity desktop client. Those literals are readable by anyone
 * who unpacks the IDE, so they were never a secret, but publishing them from
 * this package is not ours to do: the credential belongs to Google's client,
 * not to this plugin. Shipping it would tie every user's traffic to one
 * revocable client_id — if Google deactivated it, every install would break at
 * once, including accounts that never consented to anything unusual.
 *
 * A user-provided OAuth client is required. However, the requested Cloud Code
 * Assist scopes are not publicly documented and a custom client may be rejected
 * with `invalid_scope`; see README.md and SETUP.md before attempting login.
 *
 * If a supported client is available, store its id/secret in
 * <DSH_HOME>/storages/agy-next-oauth-client.json, or set the environment
 * variables, or pass them through plugin config. Nothing is inferred or
 * defaulted: if no client is configured, login refuses to start.
 */

/**
 * @deprecated Legacy client file name. User-supplied client JSON files are ignored;
 * official client settings are resolved automatically from local AGY installation resources.
 */
export const CLIENT_FILE_NAME = "agy-next-oauth-client.json";

export class MissingClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingClientError";
  }
}

function invalid(what) {
  return new MissingClientError(
    `agy-next: no OAuth client configured (${what} missing).\n\n` +
      `Install the official Antigravity desktop app from https://antigravity.google/product/antigravity-2.\n` +
      `If installed in a non-standard location, set AGY_NEXT_INSTALL_PATH to its directory.\n` +
      `User-supplied OAuth clients in config or client files are deprecated and ignored.`,
  );
}

/**
 * @deprecated Legacy OAuth client id resolution.
 *
 * @param {string} override value from plugin config, if any
 * @param {{clientId?: string}} [fileClient] parsed client file, if any
 */
export function clientId(override = "", fileClient) {
  const value =
    override?.trim() ||
    fileClient?.clientId?.trim() ||
    process.env.AGY_NEXT_CLIENT_ID?.trim() ||
    process.env.ANTIGRAVITY_CLIENT_ID?.trim();
  if (!value) throw invalid("client id");
  return value;
}

/**
 * @deprecated Legacy OAuth client secret resolution. Same precedence as {@link clientId}.
 */
export function clientSecret(override = "", fileClient) {
  const value =
    override?.trim() ||
    fileClient?.clientSecret?.trim() ||
    process.env.AGY_NEXT_CLIENT_SECRET?.trim() ||
    process.env.ANTIGRAVITY_CLIENT_SECRET?.trim();
  if (!value) throw invalid("client secret");
  return value;
}

/**
 * @deprecated Legacy non-throwing probe for user-supplied OAuth client settings.
 */
export function clientConfigured(override = "", fileClient) {
  try {
    clientId(override, fileClient);
    clientSecret(override, fileClient);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ timings */

/**
 * Fallbacks only. The live values come from the Cordis `Config` (see
 * `config.js`) so that `cordis.yml` can change them without a code edit; these
 * constants exist for direct callers such as the `bin/*.mjs` scripts.
 */
export const STREAM_IDLE_TIMEOUT_MS = 300_000;
export const DISCOVERY_TIMEOUT_MS = 8_000;
export const PROJECT_CACHE_TTL_MS = 30 * 60 * 1000;
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------- models */

/**
 * The catalog the user picks from. `id` is what DSH and the user see;
 * `runtimeModelFor()` maps it to what the backend actually accepts.
 *
 * VERIFIED LIVE against the backend on 2026-10-17 with a real account.
 * The 0.0.9 plugin's catalog is stale: its newest entries (gemini-3.7-flash,
 * gemini-3.6-flash) both 404, and the model actually serving traffic
 * (gemini-3.8-flash-tiered) is not in it at all. `bin/sweep-models.mjs`
 * re-verifies this list; run it after any backend change.
 */
export const MODELS = [
  { id: "gemini-4-argon", name: "Gemini 4 Argon", ctx: 1048576, max: 65536, efforts: ["low", "medium", "high"] },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", ctx: 1048576, max: 65536, efforts: ["low", "medium", "high"] },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", ctx: 1048576, max: 65536, efforts: ["low"] },
  { id: "gemini-3.1-flash-image", name: "Gemini 3.1 Flash Image", ctx: 1048576, max: 65536, efforts: ["low"] },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", ctx: 1048576, max: 65536, efforts: ["low"] },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", ctx: 1048576, max: 65536, efforts: ["low"] },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", ctx: 1048576, max: 65536, efforts: ["low", "high"] },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", ctx: 1048576, max: 65536, efforts: ["low", "medium", "high"] },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", ctx: 1048576, max: 65536, efforts: ["low", "medium", "high"] },
  { id: "gemini-2.5-flash-thinking", name: "Gemini 2.5 Flash Thinking", ctx: 1048576, max: 65536, efforts: ["low", "high"] },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", ctx: 1000000, max: 128000, efforts: ["low", "medium", "high"] },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", ctx: 1000000, max: 128000, efforts: ["low", "medium", "high"] },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", ctx: 1000000, max: 64000, efforts: ["high"] },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", ctx: 250000, max: 64000, efforts: ["high"] },
  { id: "gpt-oss-120b", name: "GPT-OSS 120B", ctx: 128000, max: 32768, efforts: ["medium"] },
].map((m) => ({ ...m, inputModalities: ["text", "image"] }));

/** Models whose tool schemas must use the legacy (non-custom) shape. */
export const LEGACY_TOOL_SCHEMA_PREFIXES = ["claude-", "gpt-oss-"];

/**
 * catalog id -> the concrete backend model id.
 *
 * A catalog entry such as `gemini-3.8-flash` is a *tier*; the backend wants a
 * specific variant like `gemini-3.8-flash-tiered`. Anything absent here is
 * passed through unchanged. Every value below was confirmed to serve a request.
 */
export const ROUTING = {
  // Argon is exposed in the picker as one model; its selected reasoning effort
  // maps to the concrete runtime model Google advertises for that tier.
  "gemini-4-argon": {
    off: "gemini-4-argon-low",
    minimal: "gemini-4-argon-low",
    low: "gemini-4-argon-low",
    medium: "gemini-4-argon-medium",
    high: "gemini-4-argon-high",
    xhigh: "gemini-4-argon-high",
  },
  "gemini-3.8-flash": {
    off: "gemini-3.8-flash-tiered",
    minimal: "gemini-3.8-flash-tiered",
    low: "gemini-3.8-flash-tiered",
    medium: "gemini-3.8-flash-tiered",
    high: "gemini-3.8-flash-tiered",
    xhigh: "gemini-3.8-flash-tiered",
  },
  "gemini-3-flash": {
    // Google serves this tier under one runtime id; every effort maps to it.
    off: "gemini-3-flash",
    low: "gemini-3-flash",
    medium: "gemini-3-flash",
    high: "gemini-3-flash",
    xhigh: "gemini-3-flash",
  },
  "gemini-3.1-flash-image": {
    off: "gemini-3.1-flash-image",
    low: "gemini-3.1-flash-image",
    medium: "gemini-3.1-flash-image",
    high: "gemini-3.1-flash-image",
    xhigh: "gemini-3.1-flash-image",
  },
  "claude-sonnet-5-5": {
    off: "claude-sonnet-5-5-high",
    minimal: "claude-sonnet-5-5-low",
    low: "claude-sonnet-5-5-low",
    medium: "claude-sonnet-5-5-medium",
    high: "claude-sonnet-5-5-high",
    xhigh: "claude-sonnet-5-5-high",
  },
  "claude-opus-5-5": {
    off: "claude-opus-5-5-high",
    minimal: "claude-opus-5-5-low",
    low: "claude-opus-5-5-low",
    medium: "claude-opus-5-5-medium",
    high: "claude-opus-5-5-high",
    xhigh: "claude-opus-5-5-high",
  },
  "claude-opus-4-6": {
    // Google advertises the live id as claude-opus-4-6-thinking. The bare id 404s.
    off: "claude-opus-4-6-thinking",
    low: "claude-opus-4-6-thinking",
    medium: "claude-opus-4-6-thinking",
    high: "claude-opus-4-6-thinking",
    xhigh: "claude-opus-4-6-thinking",
  },
  "claude-sonnet-4-6": {
    // The backend serves the thinking variant under the bare id; there is no
    // separate `claude-sonnet-4-6-thinking` (that id 404s).
    off: "claude-sonnet-4-6",
    low: "claude-sonnet-4-6",
    medium: "claude-sonnet-4-6",
    high: "claude-sonnet-4-6",
    xhigh: "claude-sonnet-4-6",
  },
  "gpt-oss-120b": {
    off: "gpt-oss-120b-medium",
    low: "gpt-oss-120b-medium",
    medium: "gpt-oss-120b-medium",
    high: "gpt-oss-120b-medium",
    xhigh: "gpt-oss-120b-medium",
  },
};

/**
 * Runtime ids known to be dead. Kept as an explicit denylist so a stale catalog
 * entry fails loudly instead of sending a request that 404s.
 *
 * These were advertised by `fetchAvailableModels` but do not serve traffic:
 * - gemini-3.6-flash-{low,medium,high}   404
 * - gemini-3.1-pro-{low,high}, gemini-pro-agent   404
 * - gemini-3.5-flash-{low,extra-low}, gemini-3-flash-agent   HTTP 200 + deprecation notice
 */
export const GONE_RUNTIME_MODELS = new Set([
  "gemini-3.6-flash-medium",
  "gemini-3.6-flash-high",
  "gemini-3.1-pro-low",
  "gemini-3.1-pro-high",
  "gemini-pro-agent",
  "gemini-3.7-flash-tiered",
  "gemini-3.7-flash-low",
  "gemini-3.7-flash-medium",
  "gemini-3.7-flash-high",
  "gemini-3.5-flash-low",
  "gemini-3.5-flash-extra-low",
  "gemini-3-flash-agent",
]);

/**
 * A retired model still answers HTTP 200 with a plain-text notice instead of an
 * error. Treat that text as a failure, not as model output.
 */
export const DEPRECATION_PATTERN = /is no longer available|has been deprecated|is not available for your account/i;

/** Per-runtime-model output ceiling. Unknown ids fall back to the catalog max. */
export const RUNTIME_MAX_TOKENS = {
  "gemini-4-argon-low": 65536,
  "gemini-4-argon-medium": 65536,
  "gemini-4-argon-high": 65536,
  "gemini-3.8-flash-tiered": 65536,
  "gemini-3.1-flash-image": 65536,
  "gemini-3.1-flash-lite": 65536,
  "gemini-3.5-flash-lite": 65536,
  "gemini-3-flash": 65536,
  "gemini-2.5-flash": 65536,
  "gemini-2.5-flash-lite": 65536,
  "gemini-2.5-flash-thinking": 65536,
  "gemini-2.5-pro": 65536,
  "claude-sonnet-5-5-high": 128000,
  "claude-sonnet-5-5-medium": 128000,
  "claude-sonnet-5-5-low": 128000,
  "claude-opus-5-5-high": 128000,
  "claude-opus-5-5-medium": 128000,
  "claude-opus-5-5-low": 128000,
  "claude-opus-4-6-thinking": 64000,
  "claude-sonnet-4-6": 64000,
  "gpt-oss-120b-medium": 32768,
};

/** System preamble the backend expects before user content. */
export const SYSTEM_INSTRUCTION =
  "You are Antigravity, a powerful agentic AI coding assistant designed by " +
  "Google DeepMind. You are pair programming with a user to solve coding " +
  "tasks. Be concise, practical, and tool-aware.";

export const NO_PREAMBLE_INSTRUCTION =
  "CRITICAL: NEVER output rule checks, formatting guidelines, constraint " +
  "checklists, or thinking/personality preambles in the final response. " +
  "Output only the final response.";

export const PLATFORM =
  process.platform === "darwin" ? "MACOS" : process.platform === "win32" ? "WINDOWS" : "LINUX";

/** Version string the Antigravity client advertises; matches the running AGY app. */
export const PRODUCT_VERSION = "2.25.0";

export const USER_AGENT = (() => {
  const os = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "windows" : "linux";
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  // The official App identifies its subclient BEFORE the version. Omitting
  // "hub/" makes Google return the legacy model/quota cohort without Argon,
  // even for the same OAuth account and product version.
  return `antigravity/hub/${PRODUCT_VERSION} (aidev_client; os_type=${os}; arch=${arch})`;
})();

export const TOOL_CALLING_MODE = {
  none: "NONE",
  any: "ANY",
  auto: "AUTO",
  validated: "VALIDATED",
};

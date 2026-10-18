/**
 * Cordis configuration for agy-next.
 *
 * Two rules from the official plugin guide drive this file:
 *
 *   1. "Do not hardcode tunable values." The test is whether `cordis.yml` can
 *      change the value without a code edit — so every timing, path and
 *      credential override that used to live in an `process.env` read is now a
 *      schema field with an environment fallback baked into its default.
 *   2. "Do not export a plain object as `Config`; it does not implement the
 *      Standard Schema interface required by Cordis." `Schema.object(...)` from
 *      `@deepseek-ai/schemastery` does, so a bad value fails loudly at load
 *      time instead of silently misbehaving at request time.
 *
 * NOTE: this schema is only reachable while the module exports `name`/`Config`
 * as *named* exports. `export default` collapses the module namespace to the
 * default value alone (loader `unwrapExports`), which would hide `Config` and
 * make Cordis skip validation entirely (`resolveConfig`:
 * `if (!runtime.Config) return config;`). That is why index.js no longer
 * declares a default export.
 */

import Schema from "@deepseek-ai/schemastery";

/** Env fallback, so existing shell-based setups keep working unchanged. */
function env(name) {
  return process.env[name]?.trim() || "";
}

export const Config = Schema.object({
  streamIdleTimeoutMs: Schema.number()
    .min(1000)
    .default(300_000)
    .description("Abort an Antigravity stream that emits nothing for this long (ms)."),

  discoveryTimeoutMs: Schema.number()
    .min(1000)
    .default(8_000)
    .description("Timeout for the loadCodeAssist project-discovery call (ms)."),

  projectCacheTtlMs: Schema.number()
    .min(1000)
    .default(30 * 60 * 1000)
    .description("How long a discovered Cloud Code Assist project id is cached (ms)."),

  runtimeModel: Schema.string()
    .default(env("ANTIGRAVITY_RUNTIME_MODEL"))
    .description(
      "Force every request onto one backend model id (e.g. gemini-3.8-flash-tiered), " +
        "bypassing the effort -> variant routing table. Leave empty for normal routing.",
    ),

  projectId: Schema.string()
    .default(env("ANTIGRAVITY_PROJECT_ID"))
    .description(
      "Override the Cloud Code Assist project id. Leave empty to let the backend " +
        "assign one via loadCodeAssist.",
    ),

  clientId: Schema.string()
    .default("")
    .description(
      "Your own Google OAuth client id (Desktop app type). Empty means: read " +
        "<DSH_HOME>/storages/agy-next-oauth-client.json, then AGY_NEXT_CLIENT_ID. " +
        "This plugin never ships a shared client. See SETUP.md.",
    ),

  clientSecret: Schema.string()
    .default("")
    .description(
      "OAuth client secret paired with clientId. Empty means: read " +
        "<DSH_HOME>/storages/agy-next-oauth-client.json, then AGY_NEXT_CLIENT_SECRET.",
    ),

  clientPath: Schema.string()
    .default(env("AGY_NEXT_CLIENT_PATH"))
    .description(
      "Path to the OAuth client file. Empty means " +
        "<DSH_HOME>/storages/agy-next-oauth-client.json.",
    ),

  credentialPath: Schema.string()
    .default(env("AGY_NEXT_CREDENTIAL_PATH"))
    .description("Credential file. Empty means <DSH_HOME>/storages/agy-next-oauth.json."),
});

/**
 * Fill in every default for a partially supplied config.
 *
 * Cordis already validates and defaults the config it passes to `apply`, but
 * `apply` is also reachable directly (tests, `bin/*.mjs`) and a `cordis.patch.yml`
 * row may omit `config` entirely. Running the schema here makes both paths
 * behave identically instead of leaving callers to handle `undefined` fields.
 */
export function resolveConfig(raw) {
  const result = Config["~standard"].validate(raw ?? {});
  if (result.issues) {
    const detail = result.issues.map((issue) => issue.message).join("; ");
    throw new Error(`agy-next: invalid config: ${detail}`);
  }
  return result.value;
}

/**
 * OAuth-client resolution and reporting, shared by the adapter, the CLI, and the
 * settings page.
 *
 * Kept out of `index.js` so that the web API can read status without importing
 * the adapter module (which statically needs `@deepseek-ai/dsh-llm` and would
 * create a cycle: index -> web-api -> index).
 */

import { clientFilePath, readClientFile } from "./client-config.js";
import { clientConfigured, clientId, clientSecret } from "./constants.js";

/**
 * Resolve the user's own OAuth client from, in order:
 *   1. plugin config (`clientId` / `clientSecret`)
 *   2. <DSH_HOME>/storages/agy-next-oauth-client.json
 *   3. AGY_NEXT_CLIENT_ID / AGY_NEXT_CLIENT_SECRET
 *
 * Throws MissingClientError with the setup instructions when nothing is found.
 */
export async function resolveOAuthClient(settings = {}) {
  const path = settings.clientPath || (await clientFilePath());
  const fileClient = await readClientFile(path);
  return {
    clientId: clientId(settings.clientId ?? "", fileClient),
    clientSecret: clientSecret(settings.clientSecret ?? "", fileClient),
  };
}

/** Non-throwing variant for status/health reporting. */
export async function oauthClientStatus(settings = {}) {
  try {
    const path = settings.clientPath || (await clientFilePath());
    const fileClient = await readClientFile(path);
    return {
      configured: clientConfigured(settings.clientId ?? "", fileClient),
      source: settings.clientId
        ? "config"
        : fileClient?.clientId
          ? "file"
          : process.env.AGY_NEXT_CLIENT_ID || process.env.ANTIGRAVITY_CLIENT_ID
            ? "env"
            : "none",
      path,
    };
  } catch (error) {
    const path = settings.clientPath || (await clientFilePath().catch(() => "<unresolved>"));
    return { configured: false, source: "error", error: error.message, path };
  }
}

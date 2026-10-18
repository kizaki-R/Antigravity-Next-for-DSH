/**
 * Same-origin HTTP API for the settings page.
 *
 * The browser half reads everything through these routes rather than a typed
 * Remote binding, because the routes are served by the same host process on
 * every kernel line this plugin targets (the same choice the reference plugin
 * makes for its own `/antigravity/api`).
 *
 * Routes (all under `/agy-next/api`):
 *   GET  status    everything the page shows, in one round trip
 *   POST login     begins an OAuth login; returns the authorization URL
 *   POST logout    deletes the stored credential
 *   POST refresh   forces a token refresh when the access token is stale
 *
 * Nothing here accepts a secret from the browser. The OAuth client id/secret
 * and the tokens stay on the host; the page only ever sees whether they exist
 * and when they expire.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beginLogin, fetchUserEmail, refreshAccessToken } from "./oauth.js";
import { loadCodeAssist } from "./client.js";
import { CredentialStore, needsRefresh } from "./store.js";
import { clientFilePath, readClientFile } from "./client-config.js";
import { SCOPES, MODELS, clientConfigured, clientId, clientSecret } from "./constants.js";
import { oauthClientStatus } from "./status.js";

const PREFIX = "/agy-next/api";

// Read once from the package manifest instead of repeating the version here:
// a hardcoded copy silently reports the previous release after a bump, which
// is exactly how a stale value reaches a bug report. The BOM strip matters
// because an editor that writes UTF-8 with a BOM (PowerShell's Set-Content,
// for one) otherwise makes JSON.parse throw and this fall back to 0.0.0.
const VERSION = (() => {
  try {
    const manifest = fileURLToPath(new URL("../package.json", import.meta.url));
    const text = readFileSync(manifest, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(text).version ?? "0.0.0";
  } catch (error) {
    console.warn("agy-next: could not read the package version —", error.message);
    return "0.0.0";
  }
})();

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

function sendMethodNotAllowed(response) {
  return sendJson(response, 405, { ok: false, error: "method_not_allowed" });
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Pending login started from the page, if any. */
let pending = null;

/**
 * Build the status payload.
 *
 * Deliberately reports *whether* secrets exist and *when* they expire, never
 * their values: the page is rendered in a browser, so anything it can read is
 * something a screenshot can leak.
 */
export async function buildStatus({ store, settings, provider }) {
  const clientPath = settings?.clientPath || (await clientFilePath());
  let fileClient;
  let clientFileError;
  try {
    fileClient = await readClientFile(clientPath);
  } catch (error) {
    clientFileError = error.message;
  }

  const clientStatus = await oauthClientStatus(settings ?? {});
  const configured = clientStatus.configured;
  const source = clientStatus.source;

  let credential;
  try {
    credential = await store.readOrImport();
  } catch (error) {
    credential = undefined;
    clientFileError = clientFileError ?? error.message;
  }

  const now = Date.now();
  const expiresAt = credential?.expires ?? null;
  const expiresInMs = expiresAt === null ? null : expiresAt - now;

  return {
    provider,
    version: VERSION,
    client: {
      configured,
      source, // config | file | env | none | error
      path: clientPath,
      error: clientFileError ?? null,
      // Only the leading segment, enough to recognise the right client.
      clientIdPreview: fileClient?.clientId ? `${fileClient.clientId.slice(0, 18)}…` : null,
    },
    credential: credential
      ? {
          present: true,
          email: credential.email ?? null,
          projectId: credential.projectId ?? null,
          expiresAt,
          expiresInMs,
          stale: needsRefresh(credential),
          hasRefresh: Boolean(credential.refresh),
        }
      : { present: false },
    pending: pending ? { startedAt: pending.startedAt, authUrl: pending.authUrl } : null,
    scopes: SCOPES,
    models: MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      ctx: m.ctx,
      max: m.max,
      efforts: m.efforts,
    })),
    serverTime: now,
  };
}

/** Begin (or reuse) a login and return the URL the browser should open. */
async function startLogin({ store, settings }) {
  if (pending) return { authUrl: pending.authUrl, reused: true };

  // Resolve through the same path the adapter uses, so a config-only setup works.
  const fileClient = await readClientFile(settings.clientPath || (await clientFilePath()));
  const resolved = {
    clientId: clientId(settings.clientId ?? "", fileClient),
    clientSecret: clientSecret(settings.clientSecret ?? "", fileClient),
  };

  const { authUrl, complete } = await beginLogin({ client: resolved });
  const entry = { authUrl, startedAt: Date.now(), complete };
  pending = entry;

  complete
    .then(async (credential) => {
      const email = credential.email ?? (await fetchUserEmail(credential.access));
      const projectId = await loadCodeAssist(credential.access).catch(() => undefined);
      await store.write({ ...credential, email, ...(projectId ? { projectId } : {}) });
      return credential;
    })
    .catch(() => {})
    .finally(() => {
      if (pending === entry) pending = null;
    });

  return { authUrl, reused: false };
}

/**
 * Register the routes on the host web server.
 *
 * `ctx.inject(["webServer"], ...)` keeps the plugin usable in profiles that have
 * no web server (a headless run), instead of throwing at activation.
 */
export function registerWebApi(ctx, { store, settings, provider }) {
  ctx.inject(["webServer"], (webCtx) => {
    webCtx.effect(() =>
      webCtx.webServer.register({
        kind: "prefix",
        path: PREFIX,
        handler: async (request, response) => {
          const url = new URL(request.url || "/", "http://dsh.local");
          const path = url.pathname.replace(/^\/agy-next\/api\/?/, "");
          try {
            if (path === "status" || path === "") {
              if (request.method !== "GET") return sendMethodNotAllowed(response);
              return sendJson(response, 200, {
                ok: true,
                value: await buildStatus({ store, settings, provider }),
              });
            }

            if (path === "login") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              if (!(settings.clientId || (await oauthClientStatus(settings)).configured)) {
                return sendJson(response, 400, {
                  ok: false,
                  error: "client_not_configured",
                  message: "No OAuth client configured. Add one first.",
                });
              }
              const value = await startLogin({ store, settings });
              return sendJson(response, 200, { ok: true, value });
            }

            if (path === "logout") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              await store.delete();
              return sendJson(response, 200, { ok: true, value: { removed: true } });
            }

            if (path === "refresh") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const credential = await store.readOrImport();
              if (!credential?.refresh) {
                return sendJson(response, 400, { ok: false, error: "no_credential" });
              }
              const client = await resolveClient(settings);
              const tokens = await refreshAccessToken(credential.refresh, { client });
              await store.write({
                ...credential,
                access: tokens.access_token,
                refresh: tokens.refresh_token || credential.refresh,
                expires: Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000,
              });
              return sendJson(response, 200, { ok: true, value: { refreshed: true } });
            }

            return sendJson(response, 404, { ok: false, error: "not_found" });
          } catch (error) {
            // Surface the plugin's setup message rather than a bare 500: this is
            // the one place a user reads why login cannot proceed.
            return sendJson(response, 200, {
              ok: false,
              error: error?.name === "MissingClientError" ? "client_not_configured" : "internal",
              message: error?.message ?? String(error),
            });
          }
        },
      }),
    );
  });
}

async function resolveClient(settings) {
  const { clientId, clientSecret } = await import("./constants.js");
  const fileClient = await readClientFile(settings.clientPath || (await clientFilePath()));
  return {
    clientId: clientId(settings.clientId || "", fileClient),
    clientSecret: clientSecret(settings.clientSecret || "", fileClient),
  };
}

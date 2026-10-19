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
import { loadCodeAssist, retrieveUserQuotaSummary } from "./client.js";
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
export async function buildStatus({ store, settings, provider, deps }) {
  /* Seam for tests: production always uses the real implementations, but the
     refresh-before-quota ordering cannot be observed without stubbing the two
     network calls. */
  const doRefresh = deps?.refreshAccessToken ?? refreshAccessToken;
  const doQuota = deps?.retrieveUserQuotaSummary ?? retrieveUserQuotaSummary;
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

  let book;
  try { book = await store.readBook(); } catch {}
  const current = book?.accounts?.find((a) => a.id === book.activeId) ?? book?.accounts?.[0];
  const now = Date.now();
  const expiresAt = credential?.expires ?? null;
  const visibleSet = Array.isArray(book?.visibleModels) ? new Set(book.visibleModels) : null;
  /* `visible` must be present on EVERY model. The UI decides whether to show
     the per-model checkboxes, the 全選/全不選 controls and the "8/12" pill
     from `models.some(m => typeof m.visible === "boolean")`. Omitting the
     field when the book has no `visibleModels` made that test false, so the
     whole visibility UI disappeared even though the feature works — a fresh
     install defaults to "all visible". */
  const models = MODELS.map((m) => ({ id:m.id, name:m.name, ctx:m.ctx, max:m.max, efforts:m.efforts, visible: visibleSet ? visibleSet.has(m.id) : true }));
  const toUsage = (data) => {
    if (!Array.isArray(data?.groups)) return null;
    const groups = data.groups.map((g) => {
      const buckets = Array.isArray(g.buckets) ? g.buckets : [];
      const win = (key) => { const b=buckets.find(x=>x.window===key); if(!b || !Number.isFinite(b.remainingFraction))return undefined; return {usedPct:Math.max(0,Math.min(100,(1-b.remainingFraction)*100)),resetAt:typeof b.resetTime==="string"&&Number.isFinite(Date.parse(b.resetTime))?Date.parse(b.resetTime):null}; };
      const prefix=String(buckets[0]?.bucketId??"").startsWith("3p-")?"3p":"gemini";
      return {id:prefix,name:g.displayName??prefix,...(win("5h")?{fiveHour:win("5h")} : {}),...(win("weekly")?{weekly:win("weekly")} : {}),available:MODELS.some(m=>prefix==="gemini"?m.id.startsWith("gemini-"):(m.id.startsWith("claude-")||m.id.startsWith("gpt-oss-"))),primary:prefix==="gemini"};
    });
    return groups.length ? {groups} : null;
  };
  /* Refresh stale tokens BEFORE asking for quota. The quota endpoint needs a
     live access token; an expired one throws and the old code swallowed the
     error, so the panel showed "no quota" for an account that was perfectly
     usable — it just needed a refresh. All refreshed credentials are written
     back once, at the end, instead of one write per account. */
  let bookDirty = false;
  if (book?.accounts) {
    let refreshClient;
    try { refreshClient = await resolveClient(settings); } catch { refreshClient = undefined; }
    for (const account of book.accounts) {
      if (!account.access || !account.refresh || !needsRefresh(account)) continue;
      if (!refreshClient) break;
      try {
        const tokens = await doRefresh(account.refresh, { client: refreshClient });
        account.access = tokens.access_token;
        account.refresh = tokens.refresh_token || account.refresh;
        account.expires = Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000;
        bookDirty = true;
      } catch {
        // Leave the account as-is; it simply reports usage: null below.
      }
    }
  }
  if (book?.accounts) for (const account of book.accounts) {
    if (account.access) { try { account.usage=toUsage(await doQuota(account.access)); } catch {} }
  }
  if (bookDirty) { try { await store.writeBook(book); } catch {} }
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
    models,
    ...(book?.accounts ? { accounts: book.accounts.map((a) => ({ id:a.id, email:a.email??null, projectId:a.projectId??null, active:a.id===(book.activeId??current?.id), expiresInMs:a.expires? a.expires-now:null, stale:needsRefresh(a), exhausted:Boolean(a.exhausted), usage:a.usage??null })), autoSwitch:book.autoSwitch??{enabled:false,thresholdPct:80}, nextAccountId:book.accounts.find(a=>a.id!==book.activeId&&!a.exhausted)?.id??null } : {}),
    ...(credential && !book?.accounts ? { usage:null } : {}),
    serverTime: now,
  };
}

/** Begin (or reuse) a login and return the URL the browser should open. */
async function startLogin({ store, settings, addAccount = false }) {
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
      const completed = { ...credential, email, ...(projectId ? { projectId } : {}) };
      if (addAccount) await store.addAccount(completed); else if (await store.read()) await store.write(completed); else await store.addAccount(completed);
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
              const body = await readJson(request);
              const value = await startLogin({ store, settings, addAccount: body.addAccount === true });
              return sendJson(response, 200, { ok: true, value });
            }

            if (path === "accounts/switch") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const { id } = await readJson(request); const book = await store.readBook();
              const account = book?.accounts?.find(a => a.id === id);
              if (!account) return sendJson(response, 200, {ok:false,error:"account_not_found",message:"找不到指定帳號"});
              if (account.exhausted) return sendJson(response, 200, {ok:false,error:"account_exhausted",message:"此帳號額度已用完"});
              book.activeId=id; await store.writeBook(book); return sendJson(response,200,{ok:true,value:{}});
            }
            if (path === "auto-switch") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const {enabled}=await readJson(request); if(typeof enabled!=="boolean")return sendJson(response,400,{ok:false,error:"invalid_request"});
              const book=await store.readBook(); if(book){book.autoSwitch={enabled,thresholdPct:book.autoSwitch?.thresholdPct??80};await store.writeBook(book);}
              return sendJson(response,200,{ok:true,value:{}});
            }
            if (path === "models/visibility") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const {visible}=await readJson(request); if(!Array.isArray(visible))return sendJson(response,400,{ok:false,error:"invalid_request"});
              const book=await store.readBook(); if(book){const ids=new Set(MODELS.map(m=>m.id));book.visibleModels=[...new Set(visible.filter(id=>typeof id==="string"&&ids.has(id)))];await store.writeBook(book);}
              return sendJson(response,200,{ok:true,value:{}});
            }
            if (path === "logout") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const book=await store.readBook();
              if(book?.accounts?.length){const i=book.accounts.findIndex(a=>a.id===book.activeId);book.accounts.splice(i<0?0:i,1);book.activeId=book.accounts[0]?.id??null;if(!book.accounts.length)await store.delete();else await store.writeBook(book);}
              else await store.delete();
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

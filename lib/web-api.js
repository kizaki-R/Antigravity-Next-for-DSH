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

import { beginLogin, classifyRefreshError, fetchUserEmail, refreshAccessToken } from "./oauth.js";
import { loadCodeAssist, retrieveUserQuotaSummary } from "./client.js";
import { CredentialStore, needsRefresh } from "./store.js";
import { SCOPES, MODELS } from "./constants.js";
import { diagnoseEnvironment, oauthClientStatus, resolveOAuthClient } from "./status.js";
import { MODEL_VISIBILITY_VERSION, migrateArgonVisibility } from "./model-visibility.js";
import { getUpstreamModelLimits, invalidateUpstreamModels, isModelServedUpstream, peekUpstreamModels, primeUpstreamModels, resolveDynamicLimits } from "./dynamic-models.js";
import { parseAccountPlan, readAccountPlan } from "./account-plan.js";
import { clearAllExhaustion, recoverExhaustedFamilies } from "./model-family.js";

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

function authFailureKind(error) {
  return classifyRefreshError(error);
}

function publicRefreshError(error) {
  // Only return a stable reason code. Never expose the OAuth server body or an
  // arbitrary exception message to the browser.
  return { reason: authFailureKind(error) };
}

async function updateBookAccount(store, id, patch) {
  if (id === undefined || id === null) return false;
  const apply = (account, book) => {
    if (patch.update) return patch.update(account, book);
    if (patch.values) Object.assign(account, patch.values);
    return true;
  };
  if (typeof store.modifyAccount === "function") return store.modifyAccount(id, apply);
  if (typeof store.modifyBook === "function") {
    let changed = false;
    await store.modifyBook((book) => {
      const account = book?.accounts?.find((item) => item.id === id);
      if (!account) return book;
      changed = apply(account, book) !== false;
      return book;
    });
    return changed;
  }
  return false;
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
  // A test injecting quota I/O should not accidentally query real account plans.
  const doPlan = deps?.readAccountPlan ?? (deps?.retrieveUserQuotaSummary ? async () => null : readAccountPlan);
  let clientFileError;
  const clientStatus = await (deps?.oauthClientStatus ?? oauthClientStatus)(settings ?? {});
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
  try {
    await store.syncLegacyAccounts?.().catch(() => 0);
    book = await store.readBook();
  } catch {}
  if (!credential && book?.accounts?.length) {
    credential = book.accounts.find(account => account.id === book.activeId) ?? book.accounts[0];
  }
  if (migrateArgonVisibility(book)) {
    try {
      if (typeof store.modifyBook === "function") {
        await store.modifyBook((latest) => {
          if (!latest || !Array.isArray(latest.visibleModels) || Number(latest.modelVisibilityVersion) >= MODEL_VISIBILITY_VERSION) return latest;
          const migration = { visibleModels: [...latest.visibleModels], modelVisibilityVersion: latest.modelVisibilityVersion };
          migrateArgonVisibility(migration);
          latest.visibleModels = migration.visibleModels;
          latest.modelVisibilityVersion = migration.modelVisibilityVersion;
          return latest;
        });
      } else {
        // Stores without a serialized mutation API cannot safely migrate a stale snapshot.
      }
    } catch {}
  }
  const current = book?.accounts?.find((a) => a.id === book.activeId) ?? book?.accounts?.[0];
  const activeId = current?.id;
  const now = Date.now();
  const expiresAt = credential?.expires ?? null;
  const visibleSet = Array.isArray(book?.visibleModels) ? new Set(book.visibleModels) : null;
  // Peek, never await: this payload is fetched on every settings refresh, and
  // discovery is slow. The first refresh warms the cache in the background.
  let discovered = peekUpstreamModels(current?.access, current?.projectId);
  if (configured && discovered === null && current?.access) {
    const result = await Promise.race([
      (deps?.primeUpstreamModels ?? primeUpstreamModels)(current.access, current.projectId),
      new Promise((resolve) => setTimeout(() => resolve({ entry: null }), 8000)),
    ]);
    // `primeUpstreamModels` yields { entry, failed }; keep tolerant of a stub
    // that returns an entry directly.
    discovered = result?.entry ?? (result?.available ? result : null);
  } else if (configured && current?.access) {
    void primeUpstreamModels(current.access, current.projectId);
  }
  /* `visible` must be present on EVERY model. The UI decides whether to show
     the per-model checkboxes, the 全選/全不選 controls and the "8/12" pill
     from `models.some(m => typeof m.visible === "boolean")`. Omitting the
     field when the book has no `visibleModels` made that test false, so the
     whole visibility UI disappeared even though the feature works — a fresh
     install defaults to "all visible". */
  const models = MODELS.map((m) => {
    const dyn = resolveDynamicLimits(m.id, discovered);
    // served=true/false comes only from this account's own model list;
    // null (not discovered yet) must not hide anything.
    const served = isModelServedUpstream(m.id, discovered);
    return {
      id: m.id,
      name: m.name,
      ctx: dyn?.ctx ?? m.ctx,
      max: dyn?.max ?? m.max,
      efforts: m.efforts,
      visible: visibleSet ? visibleSet.has(m.id) : true,
      served,
    };
  });
  /* Quota groups, in the shape the settings page reads.
     Each group carries BOTH the raw bucket fields the page wants to convert
     itself (remainingFraction / resetTime) and the pre-converted ones
     (usedPct / resetAt) the older panel code still uses, so neither side has to
     change at the same moment.

     `modelIds` is the important addition: once a model is retired upstream the
     group that served it can still return a quota window, and the page needs
     the ids to grey that group out instead of claiming quota is available. The
     ids come from the bucket's nested `modelIds` when the API supplies them;
     otherwise the group's prefix decides, which is how the catalog is split. */
  const toUsage = (data) => {
    if (!Array.isArray(data?.groups)) return null;
    const groups = data.groups.map((g) => {
      const buckets = Array.isArray(g.buckets) ? g.buckets : [];
      const isoReset = (b) =>
        typeof b.resetTime === "string" && Number.isFinite(Date.parse(b.resetTime))
          ? b.resetTime
          : null;
      const win = (key) => {
        const b = buckets.find((x) => x.window === key);
        if (!b || !Number.isFinite(b.remainingFraction)) return undefined;
        const resetTime = isoReset(b);
        const remainingFraction = Math.max(0, Math.min(1, b.remainingFraction));
        return {
          // Raw, for the page to convert itself.
          remainingFraction,
          resetTime,
          // Pre-converted, kept for the existing panel.
          usedPct: Math.max(0, Math.min(100, (1 - remainingFraction) * 100)),
          resetAt: resetTime === null ? null : Date.parse(resetTime),
        };
      };
      const bucketId = String(buckets[0]?.bucketId ?? "");
      const displayName = String(g.displayName ?? "");
      // Argon is Gemini 4, not the Gemini 3.8 bucket. Its id starts with
      // "gemini-", so a 3p-vs-everything split would fold it into Gemini and
      // the ledger would show one column instead of two.
      const family = /argon/i.test(`${bucketId} ${displayName}`)
        ? "argon"
        : bucketId.startsWith("3p-")
          ? "3p"
          : "gemini";
      // Model ids this group serves. Prefer ids the API reports per bucket, so
      // a changed upstream roster is reflected without a plugin release.
      // Quota display must not depend on enabling an Argon chat-catalog entry.
      // Leave modelIds unset for this quota-only family so it does not get
      // greyed out merely because this build has not added Argon chat routing.
      const reported = buckets.flatMap((b) => (Array.isArray(b.modelIds) ? b.modelIds : []));
      const modelIds = family === "argon"
        ? undefined
        : reported.length
          ? [...new Set(reported.filter((id) => typeof id === "string" && id))]
          : MODELS.filter((m) => (family === "gemini" ? m.id.startsWith("gemini-") : m.id.startsWith("claude-") || m.id.startsWith("gpt-oss-"))).map((m) => m.id);
      const fallbackName = family === "argon" ? "Gemini 4 Argon" : family === "gemini" ? "Gemini Models" : "Claude and GPT models";
      return {
        id: family,
        name: g.displayName ?? fallbackName,
        ...(modelIds ? { modelIds } : {}),
        ...(win("5h") ? { fiveHour: win("5h") } : {}),
        ...(win("weekly") ? { weekly: win("weekly") } : {}),
        available: family === "argon" ? true : modelIds.some((id) => MODELS.some((m) => m.id === id)),
        primary: family === "gemini",
      };
    });
    return groups.length ? { groups } : null;
  };
  /* Refresh stale tokens BEFORE asking for quota. The quota endpoint needs a
     live access token; an expired one throws and the old code swallowed the
     error, so the panel showed "no quota" for an account that was perfectly
     usable — it just needed a refresh. All refreshed credentials are written
     back once, at the end, instead of one write per account. */
  const refreshOutcomes = new Map();
  const quotaOutcomes = new Map();
  const accountUsage = new Map();
  if (book?.accounts) {
    let refreshClient;
    let clientUnavailable = false;
    try { refreshClient = configured ? await (deps?.resolveOAuthClient ?? resolveOAuthClient)(settings) : undefined; }
    catch { clientUnavailable = true; }
    for (const account of book.accounts) {
      let refreshStatus = null;
      // An empty access token alone is not a reason to skip: a valid refresh
      // token with a missing access token is exactly the state that needs a
      // refresh (needsRefresh covers it). Missing refresh is the real skip.
      if (!account.refresh || !needsRefresh(account)) {
        refreshOutcomes.set(account.id, refreshStatus);
        continue;
      }
      if (!refreshClient) {
        refreshStatus = { reason: clientUnavailable ? "client_unavailable" : "reauth_required" };
        refreshOutcomes.set(account.id, refreshStatus);
        continue;
      }
      try {
        const tokens = await doRefresh(account.refresh, { client: refreshClient });
        const nextRefresh = tokens.refresh_token || account.refresh;
        const expires = Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000;
        // CAS: two chains can refresh the same account concurrently; the one
        // that started first must not commit afterwards and roll the newer
        // tokens back.
        const capturedAccess = account.access;
        const capturedExpires = account.expires;
        account.access = tokens.access_token;
        account.refresh = nextRefresh;
        account.expires = expires;
        let superseded = false;
        const saved = await updateBookAccount(store, account.id, { update: (latest) => {
          if (latest.access !== capturedAccess || latest.expires !== capturedExpires) {
            superseded = true;
            return undefined;
          }
          Object.assign(latest, { access: tokens.access_token, refresh: nextRefresh, expires });
          return true;
        } });
        refreshStatus = superseded
          ? { reason: "ok" /* a newer refresh already landed; not a removal */ }
          : saved
            ? { reason: "ok" }
            : { reason: "account_removed" };
      } catch (error) {
        refreshStatus = publicRefreshError(error);
      }
      refreshOutcomes.set(account.id, refreshStatus);
    }
  }
  if (configured && book?.accounts) for (const account of book.accounts) {
    if (!account.access) { quotaOutcomes.set(account.id, null); accountUsage.set(account.id, account.usage ?? null); continue; }
    try {
      const quota = await doQuota(account.access);
      const usage = toUsage(quota);
      accountUsage.set(account.id, usage);
      quotaOutcomes.set(account.id, usage ? null : { reason: "unreported" });
      if (recoverExhaustedFamilies(account, usage?.groups)) {
        const saved = await updateBookAccount(store, account.id, { update: (latest) =>
          recoverExhaustedFamilies(latest, usage?.groups)
        });
        if (!saved) quotaOutcomes.set(account.id, { reason: "account_removed" });
      }
    } catch (error) {
      accountUsage.set(account.id, null);
      quotaOutcomes.set(account.id, { reason: publicRefreshError(error).reason });
    }
  }
  // Query plans AFTER token refresh, using each account's own identity. Keep
  // discovery results out of the saved credential book and separate from quota.
  const accountPlans = new Map();
  if (configured && book?.accounts) await Promise.all(book.accounts.map(async (account) => {
    try {
      const plan = account.access ? await doPlan(account.access) : null;
      if (plan) accountPlans.set(account.id, plan);
    } catch {
      // Unknown is honest; no Argon/Claude rollout-based tier inference.
    }
  }));
  // Read again after asynchronous work. The serialized per-account patches above
  // preserve concurrent adds, switches, logouts and visibility preferences.
  let responseBook = book;
  if (typeof store.readBook === "function") {
    try { responseBook = await store.readBook() ?? book; } catch {}
  }
  const responseActive = responseBook?.accounts?.find(a => a.id === responseBook.activeId) ?? responseBook?.accounts?.[0];
  /* The response describes the book as THIS request ended it, not the snapshot
     taken at the top. A present-but-empty book means logout finished, so the
     pre-request `credential` must not claim a login that no longer exists. */
  const logoutComplete = responseBook !== undefined && Array.isArray(responseBook.accounts) && responseBook.accounts.length === 0;
  const responseCredential = responseActive ? { ...responseActive } : logoutComplete ? undefined : credential;
  const responseActiveId = responseActive?.id ?? current?.id;
  const singleAccountUsage = responseActiveId ? accountUsage.get(responseActiveId) : undefined;
  const singleAccountRefreshStatus = responseActiveId ? refreshOutcomes.get(responseActiveId) ?? null : null;
  const singleAccountQuotaStatus = responseActiveId ? quotaOutcomes.get(responseActiveId) ?? null : null;
  const responseExpiresInMs = responseCredential?.expires === undefined || responseCredential?.expires === null ? null : responseCredential.expires - Date.now();

  return {
    provider,
    version: VERSION,
    client: {
      ...clientStatus,
      configured,
      source,
      error: clientStatus.error ?? clientFileError ?? null,
      clientIdPreview: null,
    },
    credential: responseCredential
      ? {
          present: true,
          email: responseCredential?.email ?? null,
          projectId: responseCredential?.projectId ?? null,
          expiresAt: responseCredential?.expires ?? null,
          expiresInMs: responseExpiresInMs,
          stale: needsRefresh(responseCredential),
          hasRefresh: Boolean(responseCredential?.refresh),
          /* Set when this login came from the official dsh-antigravity file.
             That file holds a refresh token but no OAuth client, and the token
             is bound to the client that issued it, so such an account cannot be
             refreshed or priced until the user supplies their own client. The
             page needs the flag to explain "signed in" beside "no OAuth client"
             instead of leaving the pair looking like a bug. */
          importedFrom: responseCredential?.importedFrom ?? (CredentialStore.isImported(responseCredential) ? "dsh-antigravity" : null),
          refreshStatus: singleAccountRefreshStatus,
          quotaStatus: singleAccountQuotaStatus,
        }
      : { present: false },
    pending: pending ? { startedAt: pending.startedAt, authUrl: pending.authUrl } : null,
    scopes: SCOPES,
    models,
    /* The roster above discovered against the account that was active when
       this request STARTED; a concurrent switch makes it stale for the new
       active account. Consumers that need switch-consistent data re-poll. */
    modelsAccountId: current?.id ?? null,
    modelsStale: Boolean(current?.id && responseCredential?.id && responseCredential.id !== current.id),
    ...(responseBook?.accounts ? { accounts: responseBook.accounts.map((a) => ({ id:a.id, email:a.email??null, projectId:a.projectId??null, active:a.id===(responseBook.activeId??responseActive?.id), expiresInMs:a.expires? a.expires-now:null, stale:needsRefresh(a), /* `exhausted` is the legacy all-families lock; per-family locks stay in exhaustedFamilies, so a single dead family must not flag the whole account as spent. */ exhausted:Boolean(a.exhausted), exhaustedFamilies:Array.isArray(a.exhaustedFamilies)?a.exhaustedFamilies:[], refreshStatus:refreshOutcomes.get(a.id)??null, quotaStatus:quotaOutcomes.get(a.id)??null, plan:accountPlans.get(a.id)??parseAccountPlan(null, null), usage:accountUsage.has(a.id) ? accountUsage.get(a.id) : a.usage??null })), autoSwitch:responseBook.autoSwitch??{enabled:false,thresholdPct:80}, nextAccountId:responseBook.accounts.find(a=>a.id!==(responseBook.activeId??responseActive?.id)&&!a.exhausted)?.id??null } : {}),
    ...(credential && !responseBook?.accounts ? { usage: singleAccountUsage ?? null } : {}),
    serverTime: now,
  };
}

/** Begin (or reuse) a login and return the URL the browser should open. */
async function startLogin({ store, settings, addAccount = false }) {
  if (pending) return { authUrl: pending.authUrl, reused: true };

  // Always derive the client from the installed official application.
  const resolved = await resolveOAuthClient(settings);

  const { authUrl, complete } = await beginLogin({ client: resolved });
  const entry = { authUrl, startedAt: Date.now(), complete };
  pending = entry;

  complete
    .then(async (credential) => {
      const email = credential.email ?? (await fetchUserEmail(credential.access));
      const projectId = await loadCodeAssist(credential.access).catch(() => undefined);
      const completed = { ...credential, email, ...(projectId ? { projectId } : {}), clientRecorded: true };
      // A sign-in started as an additional account must remain an addition even
      // if the active account changed before browser consent completed.
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
export function registerWebApi(ctx, { store, settings, provider, deps, refreshPicker }) {
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

            if (path === "diagnostics") {
              if (request.method !== "GET") return sendMethodNotAllowed(response);
              // A support report the user can copy: environment facts plus the
              // current install verdict, with no account, token or path leakage.
              const installation = await oauthClientStatus(settings);
              return sendJson(response, 200, {
                ok: true,
                value: {
                  generatedAt: new Date().toISOString(),
                  plugin: { name: "agy-next", version: VERSION },
                  environment: diagnoseEnvironment(),
                  install: {
                    configured: installation.configured,
                    kind: installation.kind ?? null,
                    code: installation.code ?? null,
                    message: installation.error ?? null,
                  },
                },
              });
            }

            if (path === "login") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const installation = await oauthClientStatus(settings);
              if (!installation.configured) {
                return sendJson(response, 400, {
                  ok: false,
                  error: installation.code ?? "agy_install_required",
                  message: installation.error ?? "Install the official Antigravity app first.",
                });
              }
              const body = await readJson(request);
              const value = await startLogin({ store, settings, addAccount: body.addAccount === true });
              return sendJson(response, 200, { ok: true, value });
            }

            if (path === "accounts/switch") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const { id } = await readJson(request);
              const beforeSwitch = await store.readBook();
              if (!beforeSwitch?.accounts?.some(a => a.id === id)) return sendJson(response, 200, {ok:false,error:"account_not_found",message:"找不到指定帳號"});
              let accountForSwitch;
              // Select the requested ID in the serialized mutation and use the
              // latest record, not a stale pre-lock snapshot, for discovery.
              await store.modifyBook((state) => {
                const target = state?.accounts?.find((item) => item.id === id);
                if (!target) return state;
                clearAllExhaustion(target);
                state.activeId = id;
                accountForSwitch = { id: target.id, access: target.access, projectId: target.projectId };
                return state;
              });
              if (!accountForSwitch) return sendJson(response, 200, {ok:false,error:"account_not_found",message:"找不到指定帳號"});
              // Refresh this account's model list right here, so the picker is
              // already correct the first time it opens after the switch.
              let served = null;
              if (accountForSwitch.access) {
                // A previously cached snapshot belongs to the old rollout; the
                // new account must be discovered fresh for this switch.
                invalidateUpstreamModels(accountForSwitch.access);
                const result = await Promise.race([
                  (deps?.primeUpstreamModels ?? (deps ? async () => ({ entry: null }) : primeUpstreamModels))(accountForSwitch.access, accountForSwitch.projectId),
                  new Promise((resolve) => setTimeout(() => resolve({ entry: null }), 8000)),
                ]);
                const entry = result?.entry ?? (result?.available ? result : null);
                served = entry?.available ? [...entry.available] : null;
              }
              refreshPicker?.();
              return sendJson(response,200,{ok:true,value:{modelsRefreshed:Boolean(served)}});
            }
            if (path === "auto-switch") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const {enabled}=await readJson(request); if(typeof enabled!=="boolean")return sendJson(response,400,{ok:false,error:"invalid_request"});
              if (typeof store.modifyBook !== "function") return sendJson(response,500,{ok:false,error:"storage_unavailable"});
              await store.modifyBook((book)=>{if(book)book.autoSwitch={enabled,thresholdPct:book.autoSwitch?.thresholdPct??80};return book;});
              return sendJson(response,200,{ok:true,value:{}});
            }
            if (path === "models/visibility") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const {visible}=await readJson(request); if(!Array.isArray(visible))return sendJson(response,400,{ok:false,error:"invalid_request"});
              if (typeof store.modifyBook !== "function") return sendJson(response,500,{ok:false,error:"storage_unavailable"});
              const ids=new Set(MODELS.map(m=>m.id));
              await store.modifyBook((book)=>{if(book){book.visibleModels=[...new Set(visible.filter(id=>typeof id==="string"&&ids.has(id)))];book.modelVisibilityVersion=MODEL_VISIBILITY_VERSION;}return book;});
              return sendJson(response,200,{ok:true,value:{}});
            }
            if (path === "logout") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const book = typeof store.readBook === "function" ? await store.readBook() : null;
              const activeId = book?.activeId ?? book?.accounts?.[0]?.id;
              let removed = false;
              if (activeId && typeof store.removeAccount === "function") {
                removed = await store.removeAccount(activeId);
              } else if (book?.accounts?.length && typeof store.modifyBook === "function") {
                await store.modifyBook((latest) => {
                  const index = latest?.accounts?.findIndex(a => a.id === (latest.activeId ?? latest.accounts?.[0]?.id)) ?? -1;
                  if (index < 0) return latest;
                  latest.accounts.splice(index, 1);
                  latest.activeId = latest.accounts[0]?.id ?? null;
                  latest.loggedOut = latest.accounts.length === 0;
                  removed = true;
                  return latest;
                });
              } else if (typeof store.delete === "function") {
                await store.delete();
                removed = true;
              } else {
                return sendJson(response, 500, { ok: false, error: "storage_unavailable" });
              }
              return sendJson(response, 200, { ok: true, value: { removed } });
            }

            if (path === "refresh") {
              if (request.method !== "POST") return sendMethodNotAllowed(response);
              const credential = await store.readOrImport();
              if (!credential?.refresh) {
                return sendJson(response, 400, { ok: false, error: "no_credential" });
              }
              const client = await resolveClient(settings);
              const capturedAccess = credential.access;
              const capturedExpires = credential.expires;
              const tokens = await refreshAccessToken(credential.refresh, { client });
              const nextRefresh = tokens.refresh_token || credential.refresh;
              const expires = Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000;
              let superseded = false;
              const saved = credential.id && typeof store.modifyAccount === "function"
                ? await store.modifyAccount(credential.id, (account) => {
                    if (account.access !== capturedAccess || account.expires !== capturedExpires) {
                      superseded = true;
                      return undefined;
                    }
                    Object.assign(account, { access: tokens.access_token, refresh: nextRefresh, expires });
                    return true;
                  })
                : await store.write({
                    ...credential,
                    access: tokens.access_token,
                    refresh: nextRefresh,
                    expires,
                  });
              if (saved === false) return sendJson(response, 200, { ok: false, error: "account_removed", message: "The account was removed before refresh completed." });
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
  return resolveOAuthClient(settings);
}

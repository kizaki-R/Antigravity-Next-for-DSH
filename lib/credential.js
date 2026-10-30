/** Credential resolution, kept independent of host-only adapter classes for testing. */
import { CredentialStore, needsRefresh } from "./store.js";
import { refreshAccessToken } from "./oauth.js";
import { loadCodeAssist } from "./client.js";
import { resolveOAuthClient } from "./status.js";

function makeError(ErrorType, message, code) {
  const error = new ErrorType(message, code);
  if (error.code === undefined) error.code = code;
  return error;
}

export async function resolveCredential(store = new CredentialStore(), { signal, config, deps, ErrorType = Error } = {}) {
  const settings = config ?? {};
  const resolveClient = deps?.resolveOAuthClient ?? resolveOAuthClient;
  const doRefresh = deps?.refreshAccessToken ?? refreshAccessToken;
  const discoverProject = deps?.loadCodeAssist ?? loadCodeAssist;
  // An unexpired token must not bypass the installed-application requirement.
  const client = await resolveClient(settings);
  let credential = await store.readOrImport();
  if (!credential) {
    throw makeError(ErrorType,
      `No Antigravity credentials found. Run \`npm run login\` in the agy-next package directory\n` +
        `(expected ${await store.path()})`,
      "AUTH",
    );
  }

  const accountId = credential.id;
  if (needsRefresh(credential)) {
    if (!credential.refresh) {
      throw makeError(ErrorType, "Stored Antigravity credential has no refresh token; log in again.", "AUTH");
    }
    // Capture the exact stored token state to fight over: two chains may be
    // refreshing the same account at once, and the one that started first must
    // not commit afterwards and roll the newer tokens back.
    const capturedAccess = credential.access;
    const capturedExpires = credential.expires;
    const tokens = await doRefresh(credential.refresh, { client });
    credential = {
      ...credential,
      access: tokens.access_token,
      refresh: tokens.refresh_token || credential.refresh,
      expires: Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000,
    };
    let superseded = false;
    const saved = accountId !== undefined && accountId !== null && typeof store.modifyAccount === "function"
      ? await store.modifyAccount(accountId, account => {
          if (account.access !== capturedAccess || account.expires !== capturedExpires) {
            // A newer refresh landed while this one was in flight; keep it.
            // The in-memory copy above still serves this request.
            superseded = true;
            return undefined;
          }
          Object.assign(account, { access: credential.access, refresh: credential.refresh, expires: credential.expires });
          return true;
        })
      : await store.write({ ...credential, ...(accountId !== undefined && accountId !== null ? { id: accountId } : {}) });
    if (saved === false) throw makeError(ErrorType, "Antigravity account was removed while its token was refreshing.", "AUTH");
    if (superseded) {
      // Deliberate no-op on disk. Nothing to report: the request keeps answer
      // with this run's tokens, and the book already holds the fresher ones.
    }
  }

  if (!credential.projectId) {
    const projectId = await discoverProject(credential.access, {
      signal,
      discoveryTimeoutMs: settings.discoveryTimeoutMs,
      projectCacheTtlMs: settings.projectCacheTtlMs,
    });
    if (projectId) {
      credential = { ...credential, projectId };
      const saved = accountId !== undefined && accountId !== null && typeof store.modifyAccount === "function"
        ? await store.modifyAccount(accountId, account => { account.projectId = projectId; })
        : await store.write({ ...credential, ...(accountId !== undefined && accountId !== null ? { id: accountId } : {}) });
      if (saved === false) throw makeError(ErrorType, "Antigravity account was removed while project discovery was running.", "AUTH");
    }
  }

  return credential;
}

export { needsRefresh };

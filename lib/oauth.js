/**
 * OAuth 2.0 PKCE login and token refresh for Antigravity / Cloud Code Assist.
 *
 * Every entry point takes an explicit `client` object `{ clientId, clientSecret }`
 * resolved from the locally installed official Antigravity application (see `status.js#resolveOAuthClient`).
 * There is no bundled fallback: an unresolvable client fails at a single, explainable point.
 */

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  AUTH_URL,
  OAUTH_CALLBACK_TIMEOUT_MS,
  REDIRECT_PATH,
  SCOPES,
  TOKEN_URL,
  USERINFO_URL,
} from "./constants.js";

function base64url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pkcePair() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Only loopback redirects are ever produced; localhost normalizes to 127.0.0.1. */
export function redirectUri(port) {
  return `http://localhost:${port}${REDIRECT_PATH}`;
}

function requireClient(client) {
  if (!client?.clientId || !client?.clientSecret) {
    throw new Error("agy-next: OAuth client was not resolved (internal error)");
  }
  return client;
}

export function classifyRefreshError(error) {
  const oauthError = String(error?.oauthError ?? "").toLowerCase();
  const status = Number(error?.httpStatus ?? 0);
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? "");
  if (oauthError === "invalid_grant") return "reauth_required";
  if (oauthError === "unauthorized_client" || oauthError === "invalid_client") return "client_mismatch";
  if (status === 401) return "reauth_required";
  if (status === 403) return "access_denied";
  if (status === 408 || status >= 500 || error?.name === "AbortError" || error?.name === "TimeoutError" ||
      ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(code) ||
      /fetch failed|network|socket|timed? out/i.test(message)) return "temporary_failure";
  return "refresh_failed";
}

export function buildAuthUrl({ port, challenge, state, client }) {
  const { clientId } = requireClient(client);
  return `${AUTH_URL}?${new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(port),
    scope: SCOPES.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    access_type: "offline",
    prompt: "consent",
  })}`;
}

export function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("rundll32", ["url.dll,FileProtocolHandler", url], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return true;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  return true;
}

/**
 * Wait for Google's redirect on a loopback server.
 * Resolves with the authorization code, or rejects on timeout/denial.
 */
export function waitForCallback(port, expectedState) {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
      if (url.pathname !== REDIRECT_PATH) {
        response.writeHead(404).end("not found");
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      const finish = (status, body, settlement) => {
        response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
        response.end(body);
        clearTimeout(timer);
        server.close();
        settlement();
      };

      if (error) {
        return finish(400, `<h1>Login failed</h1><p>${error}</p>`, () =>
          reject(new Error(`OAuth denied: ${error}`)),
        );
      }
      if (state !== expectedState) {
        return finish(400, "<h1>Login failed</h1><p>state mismatch</p>", () =>
          reject(new Error("OAuth state mismatch; the callback did not originate from this login")),
        );
      }
      if (!code) {
        return finish(400, "<h1>Login failed</h1><p>no code</p>", () =>
          reject(new Error("OAuth callback carried no authorization code")),
        );
      }
      finish(
        200,
        "<h1>Login complete</h1><p>You can close this tab and return to DeepSeek Harness.</p>",
        () => resolve(code),
      );
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`OAuth timed out after ${OAUTH_CALLBACK_TIMEOUT_MS}ms`));
    }, OAUTH_CALLBACK_TIMEOUT_MS);
    timer.unref?.();

    server.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    // Bind loopback only: never expose the callback to the network.
    server.listen(port, "127.0.0.1");
  });
}

export async function exchangeCode({ code, verifier, port, client }) {
  const { clientId, clientSecret } = requireClient(client);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(port),
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    let payload;
    try { payload = JSON.parse(text); } catch {}
    const error = new Error(`Token exchange failed (${response.status}).`);
    error.httpStatus = response.status;
    if (typeof payload?.error === "string") error.oauthError = payload.error;
    throw error;
  }
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error("Token exchange returned no access_token");
  if (!data.refresh_token) {
    throw new Error(
      "Token exchange returned no refresh_token. Revoke access at " +
        "https://myaccount.google.com/permissions and log in again.",
    );
  }
  return data;
}

/**
 * Exchange a refresh token for a fresh access token.
 *
 * The refresh token is bound to the client_id that issued it, so it stays valid
 * only as long as the same client credential keeps being used. Switching to a
 * different OAuth client therefore requires logging in again.
 */
export async function refreshAccessToken(refreshToken, { client } = {}) {
  const { clientId, clientSecret } = requireClient(client);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    let payload;
    try { payload = JSON.parse(text); } catch {}
    const error = new Error(`Token refresh failed (${response.status}).`);
    error.httpStatus = response.status;
    if (typeof payload?.error === "string") error.oauthError = payload.error;
    throw error;
  }
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error("Token refresh returned no access_token");
  return data;
}

export async function fetchUserEmail(accessToken) {
  try {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    return typeof data.email === "string" ? data.email : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One-shot credential parse (no network): decode the JWT payload or call userinfo.
 * Used by the smoke test to identify the active account.
 */
export function decodeIdTokenEmail(idToken) {
  try {
    const payload = idToken.split(".")[1];
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).email;
  } catch {
    return undefined;
  }
}

/**
 * Start a login without waiting for it to finish.
 *
 * The web UI needs to return the authorization URL to the caller immediately so
 * it can show "waiting for you to approve in the browser" while the loopback
 * server keeps listening. `complete` settles when the user finishes (or the
 * five-minute window closes), so the caller decides how to observe it.
 *
 * @returns {Promise<{ authUrl: string, port: number, complete: Promise<object> }>}
 */
export async function beginLogin({ port = 0, client } = {}) {
  requireClient(client);
  const { verifier, challenge } = pkcePair();
  const state = base64url(randomBytes(16));

  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const boundPort = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const actualPort = port || boundPort;

  const authUrl = buildAuthUrl({ port: actualPort, challenge, state, client });

  // Attach the callback listener before the browser opens, so a fast approval
  // cannot race the server into existence.
  const callback = waitForCallback(actualPort, state);

  const complete = (async () => {
    const code = await callback;
    const tokens = await exchangeCode({ code, verifier, port: actualPort, client });
    const email = decodeIdTokenEmail(tokens.id_token) ?? (await fetchUserEmail(tokens.access_token));
    return {
      email,
      refresh: tokens.refresh_token,
      access: tokens.access_token,
      expires: Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000,
      addedAt: Date.now(),
    };
  })();

  // An unobserved rejection would crash the host; the caller attaches its own
  // handler, and this keeps the promise from being "unhandled" in the meantime.
  complete.catch(() => {});

  return { authUrl, port: actualPort, complete };
}

/** Full interactive login. Returns a flat credential. */
export async function login({ port = 0, onUrl, client, openBrowser: shouldOpen = true } = {}) {
  const { authUrl, complete } = await beginLogin({ port, client });
  onUrl?.(authUrl);
  if (shouldOpen) openBrowser(authUrl);
  return complete;
}

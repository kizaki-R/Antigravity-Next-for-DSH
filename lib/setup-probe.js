/**
 * Decide whether the user's Cloud Code Assist API is actually reachable.
 *
 * Why this is separate from `retrieveUserQuotaSummary`: that function returns
 * `undefined` for every kind of failure, which is right for the settings page
 * (it just shows "no usage yet") but useless to someone stuck in setup. The
 * single most common way to fail setup is to enable the API on a different
 * project than the OAuth client belongs to, and the only visible symptom is a
 * 403 that never mentions the cause. Setup needs the status code to say
 * "go back to step 2".
 *
 * This module therefore reports the outcome instead of collapsing it, and it
 * never throws for an expected network outcome.
 */

import { ENDPOINTS } from "./constants.js";

/** @typedef {"ok"|"forbidden"|"unauthenticated"|"not-found"|"network"|"unknown"} ProbeOutcome */

async function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "agy-next-setup/1",
  };
}

/**
 * Ask the quota endpoint whether this token can reach the API at all.
 *
 * @param {string} token an access token
 * @param {{ signal?: AbortSignal, timeoutMs?: number }} [options]
 * @returns {Promise<{ outcome: ProbeOutcome, status: number|null, endpoint: string|null }>}
 */
export async function probeApiReachable(token, { signal, timeoutMs = 12000 } = {}) {
  if (typeof token !== "string" || !token) {
    return { outcome: "unauthenticated", status: null, endpoint: null };
  }

  let last = { outcome: "network", status: null, endpoint: null };
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // A caller-supplied signal must still be able to cancel the probe.
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const response = await fetch(`${endpoint}/v1internal:retrieveUserQuotaSummary`, {
        method: "POST",
        headers: await jsonHeaders(token),
        body: "{}",
        signal: controller.signal,
      });
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);

      if (response.ok) return { outcome: "ok", status: response.status, endpoint };
      if (response.status === 401) return { outcome: "unauthenticated", status: 401, endpoint };
      // 403 is the one this whole module exists for: API not enabled, or the
      // account is not a test user on the consent screen.
      if (response.status === 403) {
        last = { outcome: "forbidden", status: 403, endpoint };
        continue;
      }
      if (response.status === 404) {
        last = { outcome: "not-found", status: 404, endpoint };
        continue;
      }
      last = { outcome: "unknown", status: response.status, endpoint };
    } catch {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      // Endpoint unreachable; the next one may still answer.
      last = { outcome: "network", status: null, endpoint };
    }
  }
  return last;
}

/**
 * Turn a probe outcome into the next action a stuck user should take.
 *
 * @param {ProbeOutcome} outcome
 * @param {{ setupStep?: string }} [context]
 * @returns {{ advice: "ok"|"enable-api"|"check-test-user"|"login-again"|"retry"|"unknown", stepKey: string|null }}
 */
export function adviceFor(outcome) {
  switch (outcome) {
    case "ok":
      return { advice: "ok", stepKey: null };
    case "forbidden":
      // 403 covers two different fixes, and the consent-screen one is more
      // common among first-time users, so both are reported in order.
      return { advice: "enable-api", stepKey: "api" };
    case "unauthenticated":
      return { advice: "login-again", stepKey: null };
    case "not-found":
      return { advice: "enable-api", stepKey: "api" };
    case "network":
      return { advice: "retry", stepKey: null };
    default:
      return { advice: "unknown", stepKey: null };
  }
}

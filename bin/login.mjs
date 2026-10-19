#!/usr/bin/env node
/**
 * Interactive Antigravity login for agy-next.
 *
 * Honours the project's rule that no OAuth client is bundled: on first run the
 * user is walked through supplying their own (see SETUP.md), with the option to
 * paste the id/secret straight into this prompt.
 *
 * Writes to agy-next's own credential file. It will import an existing login
 * from the official plugin's file if one is present, but never writes there.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { CredentialStore, credentialPath, needsRefresh } from "../lib/store.js";
import { login, refreshAccessToken, fetchUserEmail } from "../lib/oauth.js";
import { loadCodeAssist } from "../lib/client.js";
import { MissingClientError, clientConfigured, clientId, clientSecret } from "../lib/constants.js";
import { clientFilePath, readClientFile, writeClientFile } from "../lib/client-config.js";
import { pickLocale, t } from "../lib/i18n.js";
import { runSetupGuide } from "../lib/setup-guide.js";
import { probeApiReachable, adviceFor } from "../lib/setup-probe.js";

function log(message = "") {
  output.write(`${message}\n`);
}

const args = new Set(process.argv.slice(2));

/** `AGY_NEXT_LANG=en|zh-TW|zh-CN`, else the system locale. */
const locale = pickLocale();

/**
 * Resolve the OAuth client, offering to save one if none is configured.
 * @returns {Promise<{clientId: string, clientSecret: string, savedTo?: string}>}
 */
async function ensureClient() {
  const filePath = await clientFilePath();
  const fileClient = await readClientFile(filePath);

  if (clientConfigured("", fileClient)) {
    log(`OAuth client: using ${fileClient.clientId ? filePath : "environment variables"}`);
    return { clientId: clientId("", fileClient), clientSecret: clientSecret("", fileClient) };
  }

  // Environment-only configuration is also acceptable.
  if (clientConfigured("")) {
    log("OAuth client: using environment variables (AGY_NEXT_CLIENT_ID).");
    return { clientId: clientId(""), clientSecret: clientSecret("") };
  }

  // Full walkthrough: five steps with direct links, then the pair.
  // `--quick` skips it for people who already know the process.
  const pair = args.has("--quick")
    ? await askPair()
    : await runSetupGuide({ locale });

  if (!pair) return undefined; // user quit

  const savedTo = await writeClientFile(pair, filePath);
  log(`\nSaved your OAuth client to ${savedTo} (owner-only permissions).`);
  return { clientId: pair.clientId, clientSecret: pair.clientSecret, savedTo };
}

/** Bare prompt for `--quick`, with the same two shape checks. */
async function askPair() {
  const rl = createInterface({ input, output });
  try {
    for (;;) {
      const id = (await rl.question(t(locale, "guide.paste.clientId") + " ")).trim();
      if (!id) { log(t(locale, "guide.paste.required")); continue; }
      if (!id.endsWith(".apps.googleusercontent.com")) { log(t(locale, "guide.paste.badClientId")); continue; }

      const secret = (await rl.question(t(locale, "guide.paste.clientSecret") + " ")).trim();
      if (!secret) { log(t(locale, "guide.paste.required")); continue; }
      if (!secret.startsWith("GOCSPX-")) { log(t(locale, "guide.paste.badClientSecret")); continue; }

      return { clientId: id, clientSecret: secret };
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const store = new CredentialStore();

  if (args.has("--status") || args.has("--whoami")) {
    // Both are read-only: --status reports what exists, it never migrates the
    // official plugin's login into agy-next's file as a side effect.
    const own = await store.peek();
    const legacy = await store.readLegacy();
    log(`agy-next credential file: ${await store.path()}`);
    log(`  present: ${own ? "yes" : "no"}`);
    log(`official plugin file: ${legacy ? "present (read-only)" : "absent"}`);

    const filePath = await clientFilePath();
    const fileClient = await readClientFile(filePath).catch((error) => ({ error }));
    const configured = fileClient && !fileClient.error && clientConfigured("", fileClient);
    log(`\nOAuth client:`);
    log(`  file:       ${filePath}`);
    log(`  configured: ${configured ? "yes" : fileClient?.error ? `BAD FILE (${fileClient.error.message})` : "no"}`);
    if (configured) log(`  clientId:   ${fileClient.clientId.slice(0, 24)}...`);

    const credential = own ?? legacy;
    if (!credential) {
      log("\nNo credential available. Run without --status to log in.");
      return configured ? 0 : 1;
    }
    if (CredentialStore.isImported(credential)) {
      // The official plugin's file stores refresh tokens only. A refresh token
      // is bound to the OAuth client that issued it, and that client is not in
      // the file, so this login cannot be renewed or used for quota until the
      // user supplies their own client.
      log("\nnote: this credential was imported from the official dsh-antigravity file.");
      log("      It carries a refresh token but no OAuth client, so it cannot be refreshed");
      log("      here. Supply your own client (see SETUP.md) and log in again.");
    }
    log(`\naccount:   ${credential.email ?? "<unknown>"}`);
    log(`projectId: ${credential.projectId ?? "<not discovered>"}`);
    log(`expires:   ${credential.expires ? new Date(credential.expires).toISOString() : "<unknown>"}`);
    if (credential.importedFrom) log(`imported:  from ${credential.importedFrom} (refresh token only; no OAuth client)`);
    if (needsRefresh(credential)) {
      log("\naccess token is expired; verifying the refresh token now...");
      if (!configured) {
        log("cannot verify: no OAuth client is configured.");
        log("  the refresh token is bound to the client that issued it, so it can only be");
        log("  renewed with that same client. Set up your own client (SETUP.md) and run:");
        log("    npm run login -- --force");
        return 1;
      }
      try {
        const tokens = await refreshAccessToken(credential.refresh, {
          client: { clientId: clientId("", fileClient), clientSecret: clientSecret("", fileClient) },
        });
        log(`refresh OK: new access token is ${tokens.access_token.length} chars`);
      } catch (error) {
        log(`refresh FAILED: ${error.message}`);
        return 1;
      }
    } else {
      log("\naccess token is still valid.");
    }
    return 0;
  }

  if (args.has("--logout")) {
    await store.delete();
    log(`Removed ${await store.path()}`);
    return 0;
  }

  const client = await ensureClient();

  if (await store.read()) {
    log(`\nA credential already exists at ${await store.path()}`);
    if (!args.has("--force")) {
      log("Re-run with --force to replace it.");
      return 1;
    }
  }

  log("\nOpening your browser to sign in to Google...");
  log("If nothing opens, paste the URL printed below.");
  log();

  const credential = await login({ onUrl: (url) => log(url), client });

  const email = credential.email ?? (await fetchUserEmail(credential.access));

  log("");
  log("Signed in. Discovering the Cloud Code Assist project...");
  const projectId = await loadCodeAssist(credential.access);

  const record = {
    ...credential,
    email,
    ...(projectId ? { projectId } : {}),
    // This login went through ensureClient(), so a client exists and the refresh
    // token is bound to it. The marker lets status tell this apart from an
    // account imported from the official plugin, which has no client.
    clientRecorded: true,
  };
  await store.write(record);

  log("");
  log(`account:   ${email ?? "<unknown>"}`);
  log(`projectId: ${projectId ?? "<not discovered; will retry at request time>"}`);
  log(`written:   ${await credentialPath()}`);

  /* Verify the API actually answers before declaring success.
     Enabling the API is the step people skip, and skipping it still lets login
     succeed — the failure only shows up later as a 403 on every model call,
     with nothing pointing back to the cause. Probing here turns that silent trap
     into an instruction while the user still has the console open. */
  log("");
  log(t(locale, "guide.probe.running"));
  const probe = await probeApiReachable(credential.access);
  const { advice } = adviceFor(probe.outcome);
  if (advice === "ok") {
    log(t(locale, "guide.probe.ok"));
  } else {
    // Both 403 causes mention the consent screen, because a first-time user who
    // skipped step 2 and one who skipped adding themselves as a test user look
    // identical from here.
    if (advice === "enable-api") {
      for (const l of t(locale, "guide.probe.enableApi")) log(`  ${l}`);
      for (const l of t(locale, "guide.probe.checkTestUser")) log(`  ${l}`);
    } else if (advice === "login-again") {
      log(`  ${t(locale, "guide.probe.loginAgain")}`);
    } else if (advice === "retry") {
      log(`  ${t(locale, "guide.probe.retry")}`);
    } else {
      log(`  ${t(locale, "guide.probe.unknown")} (HTTP ${probe.status ?? "?"})`);
    }
  }

  log("");
  log("Restart the profile (or reload the host) so the provider picks this up.");
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    if (error instanceof MissingClientError) {
      process.stderr.write(`\n${error.message}\n`);
    } else {
      process.stderr.write(`\nLogin failed: ${error?.message ?? error}\n`);
    }
    process.exitCode = 1;
  },
);

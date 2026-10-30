#!/usr/bin/env node
/** Google browser consent using the locally installed Antigravity application's client. */
import { stdout as output } from "node:process";
import { CredentialStore, credentialPath, needsRefresh } from "../lib/store.js";
import { login, fetchUserEmail } from "../lib/oauth.js";
import { loadCodeAssist } from "../lib/client.js";
import { oauthClientStatus, resolveOAuthClient } from "../lib/status.js";

const args = new Set(process.argv.slice(2));
const log = (message = "") => output.write(`${message}\n`);

async function main() {
  if (args.has("--help")) {
    log("agy-next-login [--status | --check-install | --force | --logout]");
    log("Requires a local official Antigravity app installation (no need to launch it).");
    log("Non-standard install: set AGY_NEXT_INSTALL_PATH to its installation directory.");
    log("The plugin never bundles or writes an OAuth client and never reads the app's account database.");
    return 0;
  }
  const installation = await oauthClientStatus();
  log(`Antigravity: ${installation.configured ? `installed (${installation.version})` : "unavailable"}`);
  if (installation.path) log(`  installation: ${installation.path}`);
  if (installation.error) log(`  ${installation.error}`);
  if (args.has("--check-install")) return installation.configured ? 0 : 1;

  const store = new CredentialStore();
  if (args.has("--status") || args.has("--whoami")) {
    // Read-only; unlike previous versions this does not refresh or import tokens.
    const credential = await store.peek();
    log(`Credential present: ${credential ? "yes" : "no"}`);
    if (credential) {
      log(`account: ${credential.email ?? "<unknown>"}`);
      log(`token: ${needsRefresh(credential) ? "expired; will refresh on use" : "not expired"}`);
    }
    return installation.configured ? 0 : 1;
  }
  if (args.has("--logout")) {
    await store.delete();
    log("Signed out; plugin credentials are cleared. The legacy plugin's file is left untouched.");
    return 0;
  }
  const client = await resolveOAuthClient();
  if (args.has("--official") || args.has("--quick")) {
    log("Legacy flag: using the locally installed app automatically; no client entry is needed.");
  }
  if (await store.peek()) {
    if (!args.has("--force")) {
      log("A login already exists. Use --force to sign in again, or add an account in DSH settings.");
      return 1;
    }
  }
  log("Opening Google's sign-in page. Passwords stay with Google; tokens stay in local plugin storage.");
  const credential = await login({ onUrl: (url) => log(url), client });
  const email = credential.email ?? (await fetchUserEmail(credential.access));
  const projectId = await loadCodeAssist(credential.access).catch(() => undefined);
  await store.write({ ...credential, email, ...(projectId ? { projectId } : {}), clientRecorded: true });
  log(`Signed in: ${email ?? "<unknown>"}`);
  log(`Saved plugin credentials to ${await credentialPath()}`);
  log("Restart or reload the DSH profile if the provider has not picked up this login.");
  return 0;
}
main().then((code) => { process.exitCode = code; }, (error) => {
  process.stderr.write(`Login failed: ${error?.message ?? "unknown error"}\n`);
  process.exitCode = 1;
});

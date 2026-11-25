#!/usr/bin/env node
/** Google OAuth login and status inspection via the official Antigravity ACP CLI. */
import { stdout as output } from "node:process";
import { describeAcpStatus, installAcpCli, loginAcp, logoutAcp } from "../lib/acp/service.js";
import { readAcpCredential } from "../lib/acp/keyring.js";
import { resolveManagedAcpDir } from "../lib/acp/installer.js";

const args = new Set(process.argv.slice(2));
const log = (message = "") => output.write(`${message}\n`);

async function main() {
  if (args.has("--help") || args.has("-h")) {
    log("agy-next-login [--status | --check-install | --install | --force | --logout]");
    log("Uses Google's official Antigravity ACP CLI (`agy acp` / `agy_acp_server`).");
    log("If no local CLI is installed, login downloads the verified CLI into DSH's managed runtime dir.");
    log("Optional binary override: set AGY_NEXT_ACP_BIN to an explicit `agy` executable.");
    return 0;
  }

  await resolveManagedAcpDir().catch(() => undefined);

  if (args.has("--install")) {
    log("Downloading and verifying official Antigravity CLI...");
    const result = await installAcpCli();
    log(`Installed agy CLI${result?.version ? ` (${result.version})` : ""}: ${result?.path ?? "ok"}`);
    return 0;
  }

  if (args.has("--logout")) {
    await logoutAcp();
    log("Signed out of Antigravity ACP.");
    return 0;
  }

  const status = await describeAcpStatus();
  const agentVer = status.agentInfo?.version ? ` (${status.agentInfo.version})` : "";
  log(`Antigravity ACP: ${status.reachable ? `available${agentVer}` : "unavailable"}`);
  if (status.launch?.command) {
    log(`  binary: ${status.launch.command} [${status.launch.source}]`);
  }
  if (!status.reachable && status.detail?.message) {
    log(`  detail: ${status.detail.message}`);
  }

  if (args.has("--check-install")) {
    return status.reachable ? 0 : 1;
  }

  if (args.has("--status") || args.has("--whoami")) {
    const cred = await readAcpCredential({ force: true }).catch(() => null);
    log(`Authenticated: ${status.authenticated ? "yes" : "no"}`);
    if (cred?.email) log(`  account: ${cred.email}`);
    if (status.tier?.name) log(`  tier: ${status.tier.name}`);
    if (cred) {
      const expired = typeof cred.expiresAt === "number" && cred.expiresAt <= Date.now();
      log(`  token (${cred.source}): ${expired ? "expired; will refresh on next session" : "active"}`);
    } else if (!status.authenticated && status.detail?.message) {
      log(`  reason: ${status.detail.message}`);
    }
    return status.reachable ? 0 : 1;
  }

  if (status.authenticated && !args.has("--force")) {
    const cred = await readAcpCredential({ force: true }).catch(() => null);
    log(`Already signed in${cred?.email ? ` as ${cred.email}` : ""}. Use --force to sign in again.`);
    return 1;
  }

  log("Starting Google sign-in through official Antigravity ACP...");
  const result = await loginAcp({ force: args.has("--force"), autoInstall: true });
  log(`Signed in: ${result.email ?? "<authenticated>"}`);
  if (result.tier?.name) log(`  tier: ${result.tier.name}`);
  if (result.launch?.command) log(`  binary: ${result.launch.command}`);
  log("Reload or reopen DSH Settings if your account panel has not updated yet.");
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(`Login failed: ${error?.message ?? "unknown error"}\n`);
    process.exitCode = 1;
  },
);

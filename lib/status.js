/** Shared installed-application OAuth resolution; never reads user tokens. */
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

async function loadDiscover() {
  try {
    const file = fileURLToPath(new URL("./installed-agy.js", import.meta.url));
    const mtime = statSync(file).mtimeMs;
    const mod = await import(`./installed-agy.js?t=${mtime}`);
    return mod.discoverInstalledAgy;
  } catch {
    const mod = await import("./installed-agy.js");
    return mod.discoverInstalledAgy;
  }
}

/** Require a local Antigravity installation, including for existing logins. */
export async function resolveOAuthClient(settings = {}) {
  const discoverInstalledAgy = await loadDiscover();
  const installation = await discoverInstalledAgy();
  return { clientId: installation.clientId, clientSecret: installation.clientSecret };
}

/** Only safe installation metadata may reach the browser, never client values. */
export async function oauthClientStatus(settings = {}) {
  try {
    const discoverInstalledAgy = await loadDiscover();
    const installation = await discoverInstalledAgy();
    return {
      configured: true,
      installed: true,
      source: "installed-app",
      version: installation.version,
      path: installation.installPath,
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      installed: false,
      source: "error",
      path: null,
      code: error.code ?? "AGY_INSTALL_UNAVAILABLE",
      error: error.message,
    };
  }
}
